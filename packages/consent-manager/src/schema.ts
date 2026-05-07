import { pgTable, uuid, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const consentRecords = pgTable('consent_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id').notNull(),
  contentCategory: varchar('content_category', { length: 255 }).notNull(),
  documentHash: text('document_hash').notNull(),
  status: varchar('status', { length: 50, enum: ['active', 'disputed', 'revoked', 'expired'] }).notNull().default('active'),
  validFrom: timestamp('valid_from').notNull().defaultNow(),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
