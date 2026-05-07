import { pgTable, uuid, varchar, jsonb, timestamp, integer, boolean, text } from 'drizzle-orm/pg-core';

export const advertisers = pgTable('advertisers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  advertiserId: uuid('advertiser_id').references(() => advertisers.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  budget: integer('budget').notNull(), // in cents or smallest unit
  spent: integer('spent').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  targetingRules: jsonb('targeting_rules').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Advertiser = typeof advertisers.$inferSelect;
export type NewAdvertiser = typeof advertisers.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
