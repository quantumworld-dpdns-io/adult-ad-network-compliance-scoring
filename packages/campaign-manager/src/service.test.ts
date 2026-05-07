import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignManagerService, type TargetingRules } from './service.js';

describe('CampaignManagerService', () => {
  let service: CampaignManagerService;
  let mockDb: any;
  let mockAuditLog: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
    mockAuditLog = {
      appendEntry: vi.fn().mockResolvedValue({}),
    };
    service = new CampaignManagerService(mockDb, mockAuditLog);
  });

  describe('validateTargeting', () => {
    const rules: TargetingRules = {
      min_compliance_score: 70,
      require_age_gate: true,
      min_consent_record_status: 60,
      blocked_categories: ['gambling'],
    };

    it('should return true for an eligible publisher', async () => {
      const publisher = {
        complianceScore: { overall: 80, consent: 70 },
        ageGateDetails: { status: 'verified' },
        categories: ['news', 'entertainment'],
      };
      const result = await service.validateTargeting(publisher, rules);
      expect(result).toBe(true);
    });

    it('should return false if compliance score is too low', async () => {
      const publisher = {
        complianceScore: { overall: 60, consent: 70 },
        ageGateDetails: { status: 'verified' },
        categories: ['news'],
      };
      const result = await service.validateTargeting(publisher, rules);
      expect(result).toBe(false);
    });

    it('should return false if age gate is required but not verified', async () => {
      const publisher = {
        complianceScore: { overall: 80, consent: 70 },
        ageGateDetails: { status: 'pending' },
        categories: ['news'],
      };
      const result = await service.validateTargeting(publisher, rules);
      expect(result).toBe(false);
    });

    it('should return false if consent score is too low', async () => {
      const publisher = {
        complianceScore: { overall: 80, consent: 50 },
        ageGateDetails: { status: 'verified' },
        categories: ['news'],
      };
      const result = await service.validateTargeting(publisher, rules);
      expect(result).toBe(false);
    });

    it('should return false if publisher has blocked category', async () => {
      const publisher = {
        complianceScore: { overall: 80, consent: 70 },
        ageGateDetails: { status: 'verified' },
        categories: ['news', 'gambling'],
      };
      const result = await service.validateTargeting(publisher, rules);
      expect(result).toBe(false);
    });
  });

  describe('CRUD operations', () => {
    it('should create a campaign and record audit log', async () => {
      const campaignData = {
        advertiserId: 'adv-123',
        name: 'Test Campaign',
        budget: 1000,
        targetingRules: {
          min_compliance_score: 50,
          require_age_gate: false,
          min_consent_record_status: 0,
          blocked_categories: [],
        },
      };

      const createdCampaign = { id: 'camp-123', ...campaignData };
      mockDb.returning.mockResolvedValue([createdCampaign]);

      const result = await service.createCampaign(campaignData as any, 'user-1');

      expect(result).toEqual(createdCampaign);
      expect(mockAuditLog.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'CAMPAIGN_CREATED',
        actorId: 'user-1',
        affectedEntityId: 'camp-123',
      }));
    });
  });

  describe('listEligiblePublishers', () => {
    it('should return only eligible publishers', async () => {
      const campaign = {
        id: 'camp-123',
        targetingRules: {
          min_compliance_score: 70,
          require_age_gate: true,
          min_consent_record_status: 60,
          blocked_categories: ['gambling'],
        },
      };

      const publishers = [
        {
          id: 'pub-1', // Eligible
          complianceScore: { overall: 80, consent: 70 },
          ageGateDetails: { status: 'verified' },
          categories: ['news'],
        },
        {
          id: 'pub-2', // Ineligible: low score
          complianceScore: { overall: 60, consent: 70 },
          ageGateDetails: { status: 'verified' },
          categories: ['news'],
        },
        {
          id: 'pub-3', // Ineligible: blocked category
          complianceScore: { overall: 80, consent: 70 },
          ageGateDetails: { status: 'verified' },
          categories: ['gambling'],
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockReturnThis();
      
      // Mock getCampaign
      mockDb.returning.mockResolvedValueOnce([campaign]); 
      // Actually getCampaign uses select().from().where().limit(1)
      // The current mock setup is a bit simplistic, let's refine it.
      
      vi.spyOn(service, 'getCampaign').mockResolvedValue(campaign as any);
      
      // publishers query
      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue(publishers),
      });

      const result = await service.listEligiblePublishers('camp-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pub-1');
    });
  });
});
