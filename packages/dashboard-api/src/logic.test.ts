import { describe, it, expect } from 'vitest';
import { calculateRemediationSteps, aggregateAdvertiserData } from './logic.js';
import { ComplianceScore } from '@adult-ad-net/shared';

describe('Dashboard Logic', () => {
  describe('calculateRemediationSteps', () => {
    it('should return no steps if score is >= 70', () => {
      const score: ComplianceScore = {
        overall: 80,
        ageGate: 80,
        consent: 80,
        contentSafety: 80,
        trafficQuality: 80,
        lastUpdated: Date.now()
      };
      expect(calculateRemediationSteps(score)).toEqual([]);
    });

    it('should return specific steps if sub-scores are low', () => {
      const score: ComplianceScore = {
        overall: 60,
        ageGate: 50,
        consent: 80,
        contentSafety: 50,
        trafficQuality: 80,
        lastUpdated: Date.now()
      };
      const steps = calculateRemediationSteps(score);
      expect(steps).toContain('Improve age gate verification accuracy. Consider using Video/VC methods.');
      expect(steps).toContain('Review and filter content to ensure it meets safety standards.');
      expect(steps).not.toContain('Ensure all consent records are up-to-date and correctly hashed.');
    });

    it('should return generic step if overall is low but sub-scores are high', () => {
      const score: ComplianceScore = {
        overall: 65,
        ageGate: 75,
        consent: 75,
        contentSafety: 75,
        trafficQuality: 75,
        lastUpdated: Date.now()
      };
      // This case might be impossible with the weighted formula but good to test the fallback
      expect(calculateRemediationSteps(score)).toEqual(['Overall score is low. Review all compliance areas.']);
    });
  });

  describe('aggregateAdvertiserData', () => {
    it('should correctly aggregate advertiser data', () => {
      const campaigns = [
        { spent: 100, status: 'active' },
        { spent: 50, status: 'paused' },
        { spent: 200, status: 'active' },
      ];
      const impressions = 1000;
      const conversions = 50;

      const result = aggregateAdvertiserData(campaigns, impressions, conversions);
      expect(result.totalSpend).toBe(350);
      expect(result.activeCampaigns).toBe(2);
      expect(result.totalImpressions).toBe(1000);
      expect(result.totalConversions).toBe(50);
    });
  });
});
