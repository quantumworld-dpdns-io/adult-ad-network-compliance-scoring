import { pgTable, uuid, timestamp, integer, varchar, jsonb } from 'drizzle-orm/pg-core';

export const impressions = pgTable('impressions', {
  id: uuid('id').primaryKey(),
  campaignId: uuid('campaign_id').notNull(),
  publisherId: uuid('publisher_id').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  cost: integer('cost').notNull(), // in micro-cents or smallest unit
  status: varchar('status', { length: 20 }).notNull().default('valid'), // 'valid', 'discarded'
});

export const conversions = pgTable('conversions', {
  id: uuid('id').primaryKey(),
  impressionId: uuid('impression_id').notNull(),
  campaignId: uuid('campaign_id').notNull(),
  publisherId: uuid('publisher_id').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  value: integer('value'), // in micro-cents
  type: varchar('type', { length: 50 }).notNull(), // 'click', 'signup', 'purchase'
});

export const settlementReports = pgTable('settlement_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  periodType: varchar('period_type', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  reportData: jsonb('report_data').notNull(),
  reportHash: varchar('report_hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Impression = typeof impressions.$inferSelect;
export type NewImpression = typeof impressions.$inferInsert;
export type Conversion = typeof conversions.$inferSelect;
export type NewConversion = typeof conversions.$inferInsert;
export type SettlementReport = typeof settlementReports.$inferSelect;
export type NewSettlementReport = typeof settlementReports.$inferInsert;
