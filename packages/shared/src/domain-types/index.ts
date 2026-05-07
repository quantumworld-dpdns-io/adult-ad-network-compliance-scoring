import { z } from 'zod';

// Common Types
export const IdSchema = z.string().uuid();
export const TimestampSchema = z.number().int().positive(); // Unix timestamp in ms

// Compliance Score
export const ComplianceScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  ageGate: z.number().min(0).max(100),
  consent: z.number().min(0).max(100),
  contentSafety: z.number().min(0).max(100),
  trafficQuality: z.number().min(0).max(100),
  lastUpdated: TimestampSchema,
});
export type ComplianceScore = z.infer<typeof ComplianceScoreSchema>;

/**
 * Clamps a number between 0 and 100.
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculates the overall compliance score based on weighted sub-scores.
 * Formula: aggregate = (age_gate_quality * 0.3) + (consent_record_status * 0.3) + (content_category_safety * 0.2) + (traffic_quality_score * 0.2)
 */
export function calculateOverallComplianceScore(
  subScores: Omit<ComplianceScore, 'overall' | 'lastUpdated'>,
): number {
  const { ageGate, consent, contentSafety, trafficQuality } = subScores;
  const aggregate =
    clampScore(ageGate) * 0.3 +
    clampScore(consent) * 0.3 +
    clampScore(contentSafety) * 0.2 +
    clampScore(trafficQuality) * 0.2;
  return Math.round(clampScore(aggregate));
}

// Age Gate Details
export const AgeGateVerificationMethodSchema = z.enum(['crawler', 'screenshot', 'VC']);
export type AgeGateVerificationMethod = z.infer<typeof AgeGateVerificationMethodSchema>;

export const AgeGateStatusSchema = z.enum(['pending', 'verified', 'rejected']);
export type AgeGateStatus = z.infer<typeof AgeGateStatusSchema>;

export const AgeGateDetailsSchema = z.object({
  method: AgeGateVerificationMethodSchema,
  status: AgeGateStatusSchema,
  evidenceUrl: z.string().url().optional(),
  verifiedAt: TimestampSchema.optional(),
});
export type AgeGateDetails = z.infer<typeof AgeGateDetailsSchema>;

// Publisher
export const PublisherSchema = z.object({
  id: IdSchema,
  domain: z.string(),
  contactEmail: z.string().email(),
  categories: z.array(z.string()),
  complianceScore: ComplianceScoreSchema,
  ageGateDetails: AgeGateDetailsSchema,
  createdAt: TimestampSchema,
});
export type Publisher = z.infer<typeof PublisherSchema>;

// Targeting Rules
export const TargetingRulesSchema = z.object({
  minComplianceScore: z.number().min(0).max(100).default(0),
  requiredAgeGateMethods: z.array(AgeGateVerificationMethodSchema).optional(),
  minConsentRecordStatus: ConsentStatusSchema.optional(),
  allowedCountries: z.array(z.string().length(2)).optional(), // ISO 3166-1 alpha-2
  categories: z.array(z.string()).optional(),
});
export type TargetingRules = z.infer<typeof TargetingRulesSchema>;

// Campaign
export const CampaignStatusSchema = z.enum(['active', 'paused', 'completed', 'draft']);

export const CampaignSchema = z.object({
  id: IdSchema,
  advertiserId: IdSchema,
  name: z.string().min(1),
  budget: z.number().nonnegative(),
  spent: z.number().nonnegative().default(0),
  status: CampaignStatusSchema,
  targetingRules: TargetingRulesSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Campaign = z.infer<typeof CampaignSchema>;

// Impression
export const ImpressionSchema = z.object({
  id: IdSchema,
  campaignId: IdSchema,
  publisherId: IdSchema,
  timestamp: TimestampSchema,
  ipHash: z.string(), // Hashed IP for privacy
  ip: z.string().ip().optional(), // Raw IP for fraud detection (optional in schema, but may be present)
  userAgent: z.string(),
  country: z.string().length(2).optional(),
  complianceScoreAtServe: z.number().min(0).max(100),
});
export type Impression = z.infer<typeof ImpressionSchema>;

// Click
export const ClickSchema = z.object({
  id: IdSchema,
  impressionId: IdSchema,
  campaignId: IdSchema,
  publisherId: IdSchema,
  timestamp: TimestampSchema,
  userAgent: z.string(),
  ip: z.string().ip().optional(),
});
export type Click = z.infer<typeof ClickSchema>;

// Fraud Signal
export const FraudSignalSchema = z.object({
  impressionId: IdSchema,
  publisherId: IdSchema,
  campaignId: IdSchema,
  timestamp: TimestampSchema,
  probability: z.number().min(0).max(1),
  reasons: z.array(z.string()),
});
export type FraudSignal = z.infer<typeof FraudSignalSchema>;

// Traffic Quality Updated
export const TrafficQualityUpdatedSchema = z.object({
  publisherId: IdSchema,
  score: z.number().min(0).max(100),
  timestamp: TimestampSchema,
});
export type TrafficQualityUpdated = z.infer<typeof TrafficQualityUpdatedSchema>;

// Traffic Attestation
export const TrafficAttestationSchema = z.object({
  id: IdSchema,
  impressionId: IdSchema,
  publisherId: IdSchema,
  campaignId: IdSchema,
  timestamp: TimestampSchema,
  complianceHash: z.string(), // Hash of compliance data at serve time
  signature: z.string(), // Cryptographic signature
  merkleRoot: z.string().optional(), // If anchored on-chain
});
export type TrafficAttestation = z.infer<typeof TrafficAttestationSchema>;

// Audit Log Entry
export const AuditLogEventSchema = z.string(); // e.g., 'PUBLISHER_CREATED', 'SCORE_UPDATED'

export const AuditLogEntrySchema = z.object({
  id: z.number().int().positive(), // Monotonic sequence
  timestamp: TimestampSchema,
  event: AuditLogEventSchema,
  actorId: IdSchema.optional(), // User or service ID
  resourceId: IdSchema.optional(),
  payload: z.record(z.any()), // Details of the change
  previousHash: z.string(), // For hash-chaining
  hash: z.string(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

// Consent Record
export const ConsentStatusSchema = z.enum(['active', 'disputed', 'revoked', 'expired']);

export const ConsentRecordSchema = z.object({
  id: IdSchema,
  publisherId: IdSchema,
  documentHash: z.string(), // Hash of the consent document
  status: ConsentStatusSchema,
  validFrom: TimestampSchema,
  validUntil: TimestampSchema.optional(),
  metadata: z.record(z.any()).optional(),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;
