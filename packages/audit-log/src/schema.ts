import { pgTable, uuid, bigserial, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sequence: bigserial('sequence', { mode: 'bigint' }).notNull(),
  eventType: varchar('event_type', { length: 255 }).notNull(),
  actorId: uuid('actor_id'), // Assuming actorId is a UUID
  affectedEntityId: uuid('affected_entity_id'), // Assuming affectedEntityId is a UUID
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  entryHash: varchar('entry_hash', { length: 64 }).notNull(),
  prevEntryHash: varchar('prev_entry_hash', { length: 64 }),
});

export type AuditLogEntry = typeof auditLogs.$inferSelect;
export type NewAuditLogEntry = typeof auditLogs.$inferInsert;
