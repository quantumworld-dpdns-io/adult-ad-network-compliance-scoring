import Fastify, { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-pg';
import * as dotenv from 'dotenv';
import { publishers } from './schema';
import { AuditLogService } from '@adult-ad-net/audit-log';
import { 
  AgeGateVerificationMethodSchema,
  ComplianceScoreSchema
} from '@adult-ad-net/shared';
import { createClient } from 'redis';
import { Kafka, Consumer } from 'kafkajs';
import { eq } from 'drizzle-orm';
import { signMessage, generateEd25519KeyPair } from '@adult-ad-net/shared';

dotenv.config();

const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY || generateEd25519KeyPair().privateKey;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret-key';

export const RegisterPublisherRequestSchema = z.object({
  domain: z.string().url(),
  contactEmail: z.string().email(),
  categories: z.array(z.string()),
  ageGateMethod: AgeGateVerificationMethodSchema,
});

export function buildApp(
  db: NodePgDatabase<any>, 
  auditLogService: AuditLogService,
  redisClient: any
): FastifyInstance {
  const fastify = Fastify({ logger: { level: 'info' } });

  fastify.post('/v1/publishers', async (request, reply) => {
    const parseResult = RegisterPublisherRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ 
        error: 'Validation failed', 
        details: parseResult.error.format() 
      });
    }

    const { domain, contactEmail, categories, ageGateMethod } = parseResult.data;

    try {
      const initialComplianceScore = {
        overall: 0,
        ageGate: 0,
        consent: 0,
        contentSafety: 0,
        trafficQuality: 50,
        lastUpdated: Date.now(),
      };

      const initialAgeGateDetails = {
        method: ageGateMethod,
        status: 'pending',
      };

      const [newPublisher] = await db.insert(publishers).values({
        domain,
        contactEmail,
        categories,
        ageGateDetails: initialAgeGateDetails,
        complianceScore: initialComplianceScore,
        status: 'pending_review',
      }).returning();

      await auditLogService.appendEntry({
        eventType: 'PUBLISHER_REGISTERED',
        affectedEntityId: newPublisher.id,
        afterState: newPublisher,
        occurredAt: new Date(),
      });

      return reply.status(201).send(newPublisher);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.patch('/v1/publishers/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const adminKey = request.headers['x-admin-key'];

    if (adminKey !== ADMIN_KEY) {
      return reply.status(403).send({ error: 'Unauthorized: Admin only' });
    }

    try {
      const [publisher] = await db.select().from(publishers).where(eq(publishers.id, id)).limit(1);
      if (!publisher) {
        return reply.status(404).send({ error: 'Publisher not found' });
      }

      if (publisher.status !== 'pending_review') {
        return reply.status(400).send({ error: `Cannot approve publisher in status: ${publisher.status}` });
      }

      // Update status to active
      const [updatedPublisher] = await db.update(publishers)
        .set({ status: 'active' })
        .where(eq(publishers.id, id))
        .returning();

      // Issue VC
      const vcPayload = {
        sub: publisher.id,
        domain: publisher.domain,
        status: 'active',
        iat: Math.floor(Date.now() / 1000),
      };
      const signature = signMessage(JSON.stringify(vcPayload), ISSUER_PRIVATE_KEY);
      
      const vc = {
        ...vcPayload,
        proof: {
          type: 'Ed25519Signature2018',
          signature,
        }
      };

      await auditLogService.appendEntry({
        eventType: 'PUBLISHER_APPROVED',
        affectedEntityId: id,
        beforeState: publisher,
        afterState: updatedPublisher,
        occurredAt: new Date(),
        metadata: { vc }
      });

      return reply.send({ publisher: updatedPublisher, vc });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/v1/publishers/:id/score', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      // 1. Try Redis
      const cachedScore = await redisClient.get(`publisher:score:${id}`);
      if (cachedScore) {
        return reply.send(JSON.parse(cachedScore));
      }

      // 2. Fallback to DB
      const [publisher] = await db.select().from(publishers).where(eq(publishers.id, id)).limit(1);
      if (!publisher) {
        return reply.status(404).send({ error: 'Publisher not found' });
      }

      return reply.send(publisher.complianceScore);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  return fastify;
}

export async function startSuspensionConsumer(db: NodePgDatabase<any>, auditLogService: AuditLogService) {
  const kafka = new Kafka({
    clientId: 'identity-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  });

  const consumer = kafka.consumer({ groupId: 'identity-suspension-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'SCORE_CHANGED', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const event = JSON.parse(message.value.toString());
      const { publisherId, score } = event;

      const [publisher] = await db.select().from(publishers).where(eq(publishers.id, publisherId)).limit(1);
      if (!publisher) return;

      const newScore = score.overall;
      let newStatus = publisher.status;

      if (newScore < 40 && publisher.status !== 'suspended') {
        newStatus = 'suspended';
      } else if (newScore >= 40 && publisher.status === 'suspended') {
        newStatus = 'active'; // Or 'pending_review' depending on business logic
      }

      if (newStatus !== publisher.status) {
        await db.update(publishers).set({ 
          status: newStatus,
          complianceScore: score
        }).where(eq(publishers.id, publisherId));

        await auditLogService.appendEntry({
          eventType: newStatus === 'suspended' ? 'PUBLISHER_SUSPENDED' : 'PUBLISHER_REACTIVATED',
          affectedEntityId: publisherId,
          beforeState: publisher,
          afterState: { ...publisher, status: newStatus, complianceScore: score },
          occurredAt: new Date(),
        });
      } else {
        // Just update the score in DB for consistency
        await db.update(publishers).set({ 
          complianceScore: score
        }).where(eq(publishers.id, publisherId));
      }
    },
  });
}

if (require.main === module) {
  const run = async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/identity',
    });
    const db = drizzle(pool);
    const auditLogService = new AuditLogService(db as any);
    
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();

    const app = buildApp(db, auditLogService, redisClient);
    const port = Number(process.env.PORT) || 3000;
    
    await startSuspensionConsumer(db, auditLogService);

    app.listen({ port, host: '0.0.0.0' }, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
    });
  };
  
  run().catch(console.error);
}
