import { 
  type ComplianceScore, 
  type Campaign,
  type Impression,
  signMessage,
  generateEd25519KeyPair
} from '@adult-ad-net/shared';
import { v4 as uuidv4 } from 'uuid';
import { ScoreStore } from './redis.js';
import { KafkaManager } from './kafka.js';
import { AdRequest, AdResponse, TrafficAttestationPayload } from './types.js';

// In a real system, these would come from the campaign-manager service
// and be cached locally for fast access.
let activeCampaigns: Campaign[] = [];

// Cache for suspended publishers due to low score
const suspendedPublishers = new Set<string>();

export class AdService {
  private privateKey: string;
  public publicKey: string;

  constructor(
    private scoreStore: ScoreStore,
    private kafkaManager: KafkaManager,
    private auditLogService?: any // Optional for now if we want to mock it
  ) {
    // In production, load from secrets manager
    const keys = generateEd25519KeyPair();
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;
  }

  async handleAdRequest(request: AdRequest): Promise<AdResponse | null> {
    const { publisherId, categories, country } = request;

    // 1. Check if publisher is suspended in-memory (real-time enforcement)
    if (suspendedPublishers.has(publisherId)) {
      return null;
    }

    // 2. Retrieve publisher's compliance score from Redis (< 30ms target)
    const score = await this.scoreStore.getScore(publisherId);

    // 3. Fail-closed: If score is unavailable, do not serve.
    if (!score) {
      return null;
    }

    // 4. Select the most eligible campaign based on targeting rules and bid/priority.
    const eligibleCampaign = this.selectCampaign(score, categories, country);
    
    if (!eligibleCampaign) {
      return null;
    }

    // 5. Generate Impression ID
    const impressionId = uuidv4();
    const timestamp = Date.now();

    // 6. Record IMPRESSION in AuditLog (if available)
    if (this.auditLogService) {
      await this.auditLogService.appendEntry({
        eventType: 'IMPRESSION',
        actorId: 'ad-server',
        affectedEntityId: impressionId,
        afterState: {
          campaignId: eligibleCampaign.id,
          publisherId,
          score: score.overall,
          timestamp,
        },
      }).catch(err => console.error('Failed to log to AuditLog:', err));
    }

    // 7. Generate TrafficAttestation (signed with Ed25519)
    const attestation = this.generateAttestation(impressionId, publisherId, eligibleCampaign.id, score.overall, timestamp);

    // 8. Publish IMPRESSION event to Kafka for fraud-detector
    const impressionEvent: Impression = {
      id: impressionId,
      campaignId: eligibleCampaign.id,
      publisherId,
      timestamp,
      ipHash: request.ip, // Should hash in production
      userAgent: request.userAgent,
      country: request.country,
      complianceScoreAtServe: score.overall,
    };
    
    await this.kafkaManager.publishImpression(impressionEvent).catch(err => console.error('Failed to publish to Kafka:', err));

    return {
      adId: uuidv4(),
      campaignId: eligibleCampaign.id,
      creativeUrl: `https://cdn.adult-ad-net.com/creatives/${eligibleCampaign.id}.jpg`,
      attestation: Buffer.from(JSON.stringify(attestation)).toString('base64'),
    };
  }

  private selectCampaign(score: ComplianceScore, categories?: string[], country?: string): Campaign | null {
    // Filter active campaigns by targeting rules
    const eligible = activeCampaigns.filter(c => {
      if (c.status !== 'active') return false;
      
      const rules = c.targetingRules;
      
      // Compliance Score check (Fail-closed)
      if (score.overall < rules.minComplianceScore) return false;
      
      // Category check
      if (rules.categories && categories) {
        const hasCommonCategory = rules.categories.some(cat => categories.includes(cat));
        if (!hasCommonCategory) return false;
      }

      // Country check
      if (rules.allowedCountries && country) {
        if (!rules.allowedCountries.includes(country)) return false;
      }

      return true;
    });

    if (eligible.length === 0) return null;

    // Simple selection: highest budget for now (should be bid/priority)
    return eligible.sort((a, b) => b.budget - a.budget)[0];
  }

  private generateAttestation(
    impressionId: string, 
    publisherId: string, 
    campaignId: string, 
    score: number, 
    timestamp: number
  ): TrafficAttestationPayload {
    const payload = {
      id: uuidv4(),
      impressionId,
      publisherId,
      campaignId,
      timestamp,
      complianceScore: score,
    };

    const signature = signMessage(JSON.stringify(payload), this.privateKey);
    
    return {
      ...payload,
      signature,
    };
  }

  // Real-time compliance enforcement
  async updatePublisherScore(publisherId: string, score: ComplianceScore) {
    if (score.overall < 40) {
      suspendedPublishers.add(publisherId);
    } else {
      suspendedPublishers.delete(publisherId);
    }
  }

  // Helper to set campaigns (for testing/init)
  setCampaigns(campaigns: Campaign[]) {
    activeCampaigns = campaigns;
  }
}
