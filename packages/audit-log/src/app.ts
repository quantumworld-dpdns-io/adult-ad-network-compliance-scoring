import Fastify, { FastifyInstance } from 'fastify';
import { AuditLogService } from './service.js';
import { auditLogs } from './schema.js';
import { desc, sql } from 'drizzle-orm';

export function buildApp(service: AuditLogService): FastifyInstance {
  const fastify = Fastify({ logger: { level: 'info' } });

  fastify.get('/v1/audit-log/verify', async (request, reply) => {
    try {
      const result = await service.verifyChain();
      return reply.send(result);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/v1/audit-log', async (request, reply) => {
    const { limit = '50', offset = '0' } = request.query as { limit?: string; offset?: string };
    
    try {
      const entries = await service.listEntries(parseInt(limit), parseInt(offset));

      return reply.send({
        entries: entries.map((e: any) => ({
          ...e,
          sequence: e.sequence.toString(), // BigInt to string for JSON
        })),
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  return fastify;
}
