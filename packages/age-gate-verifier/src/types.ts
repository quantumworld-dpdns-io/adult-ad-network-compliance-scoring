import { AgeGateVerificationMethod } from '@adult-ad-net/shared';

export interface VerificationResult {
  publisherId: string;
  domain: string;
  method: AgeGateVerificationMethod;
  status: 'verified' | 'rejected';
  score: number;
  evidenceUrl?: string;
  metadata?: Record<string, any>;
}

export interface AgeGateVerifier {
  verify(publisherId: string, domain: string): Promise<VerificationResult>;
}
