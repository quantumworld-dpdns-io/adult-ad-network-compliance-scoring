import { eq, and, sql, notInArray, arrayOverlaps, ne } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-pg';
import { campaigns, advertisers, type Campaign, type NewCampaign } from './schema.js';
import { publishers } from '../../identity/src/schema.js';
import { type AuditLogService } from '../../audit-log/src/service.js';

export interface TargetingRules {
  min_compliance_score: number;
  require_age_gate: boolean;
  min_consent_record_status: number;
  blocked_categories: string[];
}

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
    
    // 1. min_compliance_score
    if (complianceScore.overall < rules.min_compliance_score) {
      return false;
    }

    // 2. require_age_gate
    if (rules.require_age_gate && ageGateDetails.status !== 'verified') {
      return false;
    }

    // 3. min_consent_record_status (mapping to complianceScore.consent as inferred)
    if (complianceScore.consent < rules.min_consent_record_status) {
      return false;
    }

    // 4. blocked_categories
    if (rules.blocked_categories && rules.blocked_categories.length > 0) {
      const hasBlockedCategory = categories.some((cat: string) => rules.blocked_categories.includes(cat));
      if (hasBlockedCategory) {
        return false;
      }
    }

    return true;
  }

  async listEligiblePublishers(campaignId: string): Promise<any[]> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const rules = campaign.targetingRules as unknown as TargetingRules;
    
    // We can do some filtering at the DB level and some in JS
    // For blocked_categories, we use ne or not overlaps if possible
    
    const allPublishers = await this.db.select().from(publishers);
    
    return allPublishers.filter(pub => {
        // We need to match the logic in validateTargeting
        const { complianceScore, ageGateDetails, categories } = pub as any;
        
        if (complianceScore.overall < (rules.min_compliance_score || 0)) return false;
        if (rules.require_age_gate && ageGateDetails.status !== 'verified') return false;
        if (complianceScore.consent < (rules.min_consent_record_status || 0)) return false;
        
        if (rules.blocked_categories && rules.blocked_categories.length > 0) {
            const hasBlockedCategory = (categories as string[]).some(cat => rules.blocked_categories.includes(cat));
            if (hasBlockedCategory) return false;
        }
        
        return true;
    });
  }
}
