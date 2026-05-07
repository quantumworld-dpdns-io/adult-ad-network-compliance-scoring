import { 
  calculateOverallComplianceScore, 
  type ComplianceScore 
} from '@adult-ad-net/shared';

export interface SubScores {
  ageGate: number;
  consent: number;
  contentSafety: number;
  trafficQuality: number;
}

export function computeScore(subScores: SubScores): ComplianceScore {
  const overall = calculateOverallComplianceScore(subScores);
  return {
    ...subScores,
    overall,
    lastUpdated: Date.now(),
  };
}

export function getDefaultSubScores(): SubScores {
  return {
    ageGate: 0,
    consent: 0,
    contentSafety: 0,
    trafficQuality: 0,
  };
}
