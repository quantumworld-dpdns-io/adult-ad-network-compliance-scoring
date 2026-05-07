import { z } from 'zod';
import { IdSchema, TimestampSchema } from '@adult-ad-net/shared';

export const CommissionTypeSchema = z.enum(['CPC', 'CPA', 'RevShare']);
export type CommissionType = z.infer<typeof CommissionTypeSchema>;

export const CommissionRuleSchema = z.object({
  type: CommissionTypeSchema,
  value: z.number().nonnegative(), // Amount for CPC/CPA, or percentage for RevShare
});
export type CommissionRule = z.infer<typeof CommissionRuleSchema>;

export const AffiliateSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  email: z.string().email(),
  commissionRules: z.record(IdSchema, CommissionRuleSchema), // campaignId -> rule
  createdAt: TimestampSchema,
});
export type Affiliate = z.infer<typeof AffiliateSchema>;

export const TrackingLinkSchema = z.object({
  id: IdSchema,
  affiliateId: IdSchema,
  campaignId: IdSchema,
  url: z.string().url(),
  createdAt: TimestampSchema,
});
export type TrackingLink = z.infer<typeof TrackingLinkSchema>;

export const ConversionSchema = z.object({
  id: IdSchema,
  externalId: z.string(), // Conversion ID from the advertiser's system
  campaignId: IdSchema,
  value: z.number().nonnegative().optional(), // For RevShare
  timestamp: TimestampSchema,
  metadata: z.record(z.any()).optional(),
});
export type Conversion = z.infer<typeof ConversionSchema>;

export const AttributionResultSchema = z.object({
  conversionId: IdSchema,
  clickId: IdSchema.optional(),
  impressionId: IdSchema.optional(),
  affiliateId: IdSchema,
  campaignId: IdSchema,
  commissionAmount: z.number().nonnegative(),
  attributedAt: TimestampSchema,
});
export type AttributionResult = z.infer<typeof AttributionResultSchema>;
