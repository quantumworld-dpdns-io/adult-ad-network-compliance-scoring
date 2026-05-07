import { z } from 'zod';
import { 
  IdSchema, 
  TimestampSchema, 
  ComplianceScoreSchema,
  TargetingRulesSchema,
  CampaignSchema
} from '@adult-ad-net/shared';

export const AdRequestSchema = z.object({
  publisherId: IdSchema,
  userAgent: z.string(),
  ip: z.string().ip(),
  categories: z.array(z.string()).optional(),
  country: z.string().length(2).optional(),
});

export type AdRequest = z.infer<typeof AdRequestSchema>;

export const AdResponseSchema = z.object({
  adId: IdSchema,
  campaignId: IdSchema,
  creativeUrl: z.string().url(),
  attestation: z.string(), // Base64 encoded attestation
});

export type AdResponse = z.infer<typeof AdResponseSchema>;

export interface TrafficAttestationPayload {
  id: string;
  impressionId: string;
  publisherId: string;
  campaignId: string;
  timestamp: number;
  complianceScore: number;
  signature: string;
}
