import { Impression, Click } from '@adult-ad-net/shared';

export interface FraudEvaluation {
  probability: number;
  reasons: string[];
}

const BOT_USER_AGENTS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /headless/i,
  /selenium/i,
  /puppeteer/i,
  /python/i,
  /curl/i,
  /wget/i,
  /postman/i,
];

// Mock Datacenter IP ranges (simplified as prefixes)
const DATACENTER_IP_PREFIXES = [
  '3.5.0.',   // AWS
  '52.95.',   // AWS
  '34.200.',  // AWS
  '104.196.', // GCP
  '35.192.',  // GCP
  '23.96.',   // Azure
  '40.112.',  // Azure
];

export class FraudDetector {
  /**
   * Evaluates an impression for fraud.
   * @param impression The impression to evaluate.
   * @param currentCTR The current CTR for the publisher/campaign (0.0 to 1.0).
   * @returns A fraud evaluation with probability and reasons.
   */
  evaluateImpression(impression: Impression, currentCTR: number): FraudEvaluation {
    const reasons: string[] = [];
    let probability = 0;

    // 1. Bot User-Agent Pattern
    if (this.isBotUserAgent(impression.userAgent)) {
      reasons.push('Bot user-agent detected');
      probability += 0.8;
    }

    // 2. Datacenter IP Check
    if (impression.ip && this.isDatacenterIP(impression.ip)) {
      reasons.push('Datacenter IP detected');
      probability += 0.5;
    }

    // 3. CTR Anomaly (> 10% or 0.1)
    if (currentCTR > 0.1) {
      reasons.push(`High CTR anomaly: ${(currentCTR * 100).toFixed(2)}%`);
      // Scaling probability based on how much it exceeds 10%
      probability += Math.min(0.5, (currentCTR - 0.1) * 2);
    }

    return {
      probability: Math.min(1, probability),
      reasons,
    };
  }

  private isBotUserAgent(userAgent: string): boolean {
    return BOT_USER_AGENTS.some((pattern) => pattern.test(userAgent));
  }

  private isDatacenterIP(ip: string): boolean {
    return DATACENTER_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
  }

  /**
   * Calculates a traffic quality score based on fraud signals.
   * @param fraudRate Fraction of fraudulent impressions (0.0 to 1.0).
   * @returns Quality score (0 to 100).
   */
  calculateTrafficQualityScore(fraudRate: number): number {
    // Inverse relationship: 0% fraud -> 100 score, 100% fraud -> 0 score
    // We can use a non-linear scale if desired.
    return Math.round((1 - fraudRate) * 100);
  }
}
