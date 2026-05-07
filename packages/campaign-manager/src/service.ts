import { eq, and, sql, notInArray, arrayOverlaps, ne } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-pg';
import { campaigns, advertisers, type Campaign, type NewCampaign } from './schema.js';
import { publishers } from '../../identity/src/schema.js';
import { type AuditLogService } from '../../audit-log/src/service.js';
import { type TargetingRules } from '@adult-ad-net/shared';

export class CampaignManagerService {
  constructor(
    private db: NodePgDatabase<any>,
    private auditLog?: AuditLogService
  ) {}

  async createCampaign(data: NewCampaign & { targetingRules: TargetingRules }, actorId?: string): Promise<Campaign> {
    const [campaign] = await this.db.insert(campaigns).values(data).returning();
    
    if (this.auditLog) {
      await this.auditLog.appendEntry({
        eventType: 'CAMPAIGN_CREATED',
        actorId: actorId ?? 'system',
        affectedEntityId: campaign.id,
        afterState: campaign,
        occurredAt: new Date(),
      });
    }
    
    return campaign;
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await this.db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return campaign;
  }

  async listCampaigns(): Promise<Campaign[]> {
    return await this.db.select().from(campaigns);
  }

  async updateCampaign(id: string, data: Partial<NewCampaign>, actorId?: string): Promise<Campaign | undefined> {
    const beforeState = await this.getCampaign(id);
    if (!beforeState) return undefined;

    const [updated] = await this.db
      .update(campaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();

    if (this.auditLog && updated) {
      await this.auditLog.appendEntry({
        eventType: 'CAMPAIGN_UPDATED',
        actorId: actorId ?? 'system',
        affectedEntityId: id,
        beforeState,
        afterState: updated,
        occurredAt: new Date(),
      });
    }

    return updated;
  }

  async deleteCampaign(id: string, actorId?: string): Promise<boolean> {
    const beforeState = await this.getCampaign(id);
    if (!beforeState) return false;

    await this.db.delete(campaigns).where(eq(campaigns.id, id));

    if (this.auditLog) {
      await this.auditLog.appendEntry({
        eventType: 'CAMPAIGN_DELETED',
        actorId: actorId ?? 'system',
        affectedEntityId: id,
        beforeState,
        occurredAt: new Date(),
      });
    }

    return true;
  }

  async validateTargeting(publisher: any, rules: TargetingRules): Promise<boolean> {
    const { complianceScore, ageGateDetails, categories } = publisher;
    
    // 1. minComplianceScore
    if (complianceScore.overall < (rules.minComplianceScore ?? 0)) {
      return false;
    }

    // 2. requiredAgeGateMethods
    if (rules.requiredAgeGateMethods && rules.requiredAgeGateMethods.length > 0) {
      if (!rules.requiredAgeGateMethods.includes(ageGateDetails.method) || ageGateDetails.status !== 'verified') {
        return false;
      }
    }

    // 3. minConsentRecordStatus
    if (rules.minConsentRecordStatus) {
      // In this context, we might not have the full consent record status string
      // but we can use complianceScore.consent as a proxy or assume it's passed in.
      // For now, let's assume publisher might have consentStatus if provided.
      const consentStatus = publisher.consentStatus || (complianceScore.consent >= 100 ? 'active' : 'expired');
      
      const statusPriority: Record<string, number> = {
        'active': 3,
        'disputed': 2,
        'revoked': 1,
        'expired': 0
      };

      const publisherPriority = statusPriority[consentStatus] ?? -1;
      const requiredPriority = statusPriority[rules.minConsentRecordStatus] ?? 999;

      if (publisherPriority < requiredPriority) return false;
    }

    // 4. categories (previously blocked_categories, now it's usually allowed categories in shared)
    // Shared TargetingRules has 'categories' which usually means 'allowed'
    if (rules.categories && rules.categories.length > 0) {
      const hasAllowedCategory = categories.some((cat: string) => rules.categories?.includes(cat));
      if (!hasAllowedCategory) {
        return false;
      }
    }

    return true;
  }

  async listEligiblePublishers(campaignId: string): Promise<any[]> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const rules = campaign.targetingRules as unknown as TargetingRules;
    
    const allPublishers = await this.db.select().from(publishers);
    
    return allPublishers.filter(pub => {
        return this.validateTargeting(pub, rules);
    });
  }
}
