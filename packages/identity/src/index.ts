import Fastify, { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-pg';
import * as dotenv from 'dotenv';
import { publishers } from './schema';
import { AuditLogService } from '@adult-ad-net/audit-log';
import { 
  AgeGateVerificationMethodSchema,
} from '@adult-ad-net/shared';

dotenv.config();

export const RegisterPublisherRequestSchema = z.object({
  domain: z.string().url(),
  contactEmail: z.string().email(),
  categories: z.array(z.string()),
  ageGateMethod: AgeGateVerificationMethodSchema,
});

export function buildApp(db: NodePgDatabase<any>, auditLogService: AuditLogService): FastifyInstance {
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

  return fastify;
}

if (require.main === module) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/identity',
  });
  const db = drizzle(pool);
  const auditLogService = new AuditLogService(db as any);
  
  const app = buildApp(db, auditLogService);
  const port = Number(process.env.PORT) || 3000;
  
  app.listen({ port, host: '0.0.0.0' }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}
