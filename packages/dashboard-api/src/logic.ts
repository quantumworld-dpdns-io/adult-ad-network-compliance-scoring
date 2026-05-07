import { ComplianceScore } from '@adult-ad-net/shared';

export interface AdvertiserDashboard {
  totalSpend: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalConversions: number;
}

export interface PublisherDashboard {
  complianceScore: ComplianceScore;
  earnings: number;
  pendingSettlement: number;
  remediationSteps: string[];
}

export function calculateRemediationSteps(score: ComplianceScore): string[] {
  const steps: string[] = [];
  if (score.overall < 70) {
    if (score.ageGate < 70) {
      steps.push('Improve age gate verification accuracy. Consider using Video/VC methods.');
    }
    if (score.consent < 70) {
      steps.push('Ensure all consent records are up-to-date and correctly hashed.');
    }
    if (score.contentSafety < 70) {
      steps.push('Review and filter content to ensure it meets safety standards.');
    }
    if (score.trafficQuality < 70) {
      steps.push('Investigate and mitigate potential fraudulent traffic sources.');
    }
    if (steps.length === 0) {
      steps.push('Overall score is low. Review all compliance areas.');
    }
  }
  return steps;
}

export function aggregateAdvertiserData(
  campaigns: { spent: number; status: string }[],
  impressions: number,
  conversions: number
): AdvertiserDashboard {
  return {
    totalSpend: campaigns.reduce((acc, c) => acc + c.spent, 0),
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalImpressions: impressions,
    totalConversions: conversions,
  };
}
