import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AffiliateService } from './service.js';
import { AffiliateStore } from './redis.js';
import { KafkaManager } from './kafka.js';
import { Affiliate, Conversion, CommissionRule } from './types.js';
import { v4 as uuidv4 } from 'uuid';

describe('AffiliateService', () => {
  let service: AffiliateService;
  let mockStore: any;
  let mockKafka: any;

  beforeEach(() => {
    mockStore = {
      saveClick: vi.fn(),
      getClick: vi.fn(),
      getImpression: vi.fn(),
      getAffiliate: vi.fn(),
      getFraudProbability: vi.fn(),
      saveImpression: vi.fn(),
      saveFraudSignal: vi.fn(),
    };
    mockKafka = {
      publishAttribution: vi.fn(),
    };
    service = new AffiliateService(mockStore as any, mockKafka as any);
  });

  describe('calculateCommission', () => {
    it('should calculate CPA commission correctly', () => {
      const rule: CommissionRule = { type: 'CPA', value: 50 };
      const commission = service.calculateCommission(rule);
      expect(commission).toBe(50);
    });

    it('should calculate RevShare commission correctly', () => {
      const rule: CommissionRule = { type: 'RevShare', value: 10 }; // 10%
      const commission = service.calculateCommission(rule, 200);
      expect(commission).toBe(20);
    });

    it('should calculate CPC commission correctly (treated as fixed per conversion for now)', () => {
      const rule: CommissionRule = { type: 'CPC', value: 0.5 };
      const commission = service.calculateCommission(rule);
      expect(commission).toBe(0.5);
    });
  });

  describe('handleConversion', () => {
    it('should attribute conversion to a click and publish result', async () => {
      const affiliateId = uuidv4();
      const campaignId = uuidv4();
      const clickId = uuidv4();
      const conversionId = uuidv4();

      const affiliate: Affiliate = {
        id: affiliateId,
        name: 'Test Affiliate',
        email: 'test@example.com',
        commissionRules: {
          [campaignId]: { type: 'CPA', value: 10 },
        },
        createdAt: Date.now(),
      };

      const click = {
        id: clickId,
        affiliateId,
        campaignId,
      };

      const conversion: Conversion = {
        id: conversionId,
        externalId: 'ext_1',
        campaignId,
        timestamp: Date.now(),
        metadata: { clickId },
      };

      mockStore.getClick.mockResolvedValue(click);
      mockStore.getAffiliate.mockResolvedValue(affiliate);

      await service.handleConversion(conversion);

      expect(mockKafka.publishAttribution).toHaveBeenCalledWith(
        expect.objectContaining({
          conversionId,
          affiliateId,
          campaignId,
          commissionAmount: 10,
        })
      );
    });

    it('should attribute conversion to an impression if no click is found', async () => {
        const affiliateId = uuidv4();
        const campaignId = uuidv4();
        const impressionId = uuidv4();
        const conversionId = uuidv4();
  
        const affiliate: Affiliate = {
          id: affiliateId,
          name: 'Test Affiliate',
          email: 'test@example.com',
          commissionRules: {
            [campaignId]: { type: 'RevShare', value: 20 },
          },
          createdAt: Date.now(),
        };
  
        const impression = {
          id: impressionId,
          affiliateId,
          campaignId,
        };
  
        const conversion: Conversion = {
          id: conversionId,
          externalId: 'ext_2',
          campaignId,
          value: 100,
          timestamp: Date.now(),
          metadata: { impressionId },
        };
  
        mockStore.getClick.mockResolvedValue(null);
        mockStore.getImpression.mockResolvedValue(impression);
        mockStore.getAffiliate.mockResolvedValue(affiliate);
  
        await service.handleConversion(conversion);
  
        expect(mockKafka.publishAttribution).toHaveBeenCalledWith(
          expect.objectContaining({
            conversionId,
            affiliateId,
            campaignId,
            commissionAmount: 20, // 20% of 100
          })
        );
      });

    it('should not attribute if no click or impression is found', async () => {
      const conversion: Conversion = {
        id: uuidv4(),
        externalId: 'ext_3',
        campaignId: uuidv4(),
        timestamp: Date.now(),
        metadata: { clickId: 'non-existent' },
      };

      mockStore.getClick.mockResolvedValue(null);
      mockStore.getImpression.mockResolvedValue(null);

      await service.handleConversion(conversion);

      expect(mockKafka.publishAttribution).not.toHaveBeenCalled();
    });
  });
});
