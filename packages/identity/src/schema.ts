import { pgTable, uuid, varchar, jsonb, timestamp, text } from 'drizzle-orm/pg-core';

export const publishers = pgTable('publishers', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: varchar('domain', { length: 255 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  categories: text('categories').array().notNull(),
  ageGateDetails: jsonb('age_gate_details').notNull(),
  complianceScore: jsonb('compliance_score').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Publisher = typeof publishers.$inferSelect;
export type NewPublisher = typeof publishers.$inferInsert;
