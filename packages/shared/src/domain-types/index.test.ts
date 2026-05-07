import { describe, it, expect } from 'vitest';
import { calculateOverallComplianceScore, clampScore } from './index.js';

describe('Scoring Logic', () => {
  it('should clamp scores correctly', () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(110)).toBe(100);
    expect(clampScore(50)).toBe(50);
  });

  it('should calculate overall score correctly with weights', () => {
    // Formula: (ageGate * 0.3) + (consent * 0.3) + (contentSafety * 0.2) + (trafficQuality * 0.2)
    // (100 * 0.3) + (100 * 0.3) + (100 * 0.2) + (100 * 0.2) = 30 + 30 + 20 + 20 = 100
    expect(calculateOverallComplianceScore({
      ageGate: 100,
      consent: 100,
      contentSafety: 100,
      trafficQuality: 100,
    })).toBe(100);

    // (50 * 0.3) + (50 * 0.3) + (50 * 0.2) + (50 * 0.2) = 15 + 15 + 10 + 10 = 50
    expect(calculateOverallComplianceScore({
      ageGate: 50,
      consent: 50,
      contentSafety: 50,
      trafficQuality: 50,
    })).toBe(50);

    // (80 * 0.3) + (90 * 0.3) + (70 * 0.2) + (60 * 0.2) = 24 + 27 + 14 + 12 = 77
    expect(calculateOverallComplianceScore({
      ageGate: 80,
      consent: 90,
      contentSafety: 70,
      trafficQuality: 60,
    })).toBe(77);
  });

  it('should clamp sub-scores and aggregate', () => {
    expect(calculateOverallComplianceScore({
      ageGate: 200,
      consent: 200,
      contentSafety: 200,
      trafficQuality: 200,
    })).toBe(100);

    expect(calculateOverallComplianceScore({
      ageGate: -100,
      consent: -100,
      contentSafety: -100,
      trafficQuality: -100,
    })).toBe(0);
  });
});
