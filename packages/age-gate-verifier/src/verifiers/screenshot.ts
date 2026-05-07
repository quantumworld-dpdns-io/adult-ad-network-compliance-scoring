import { AgeGateVerifier, VerificationResult } from '../types.js';

/**
 * Mock verifier for screenshot + manual review workflow.
 * In a real scenario, this would involve uploading a screenshot to S3 
 * and waiting for an admin to approve it.
 */
export class ScreenshotVerifier implements AgeGateVerifier {
  async verify(publisherId: string, domain: string): Promise<VerificationResult> {
    // Simulate manual review process
    return {
      publisherId,
      domain,
      method: 'screenshot',
      status: 'verified',
      score: 100, // Manual review is considered high confidence
      evidenceUrl: `https://storage.example.com/evidence/${publisherId}/screenshot.png`,
      metadata: {
        reviewerId: 'admin-123',
        reviewedAt: Date.now(),
      },
    };
  }
}
