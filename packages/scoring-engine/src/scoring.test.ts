import { describe, it, expect } from 'vitest';
import { computeScore, getDefaultSubScores } from './scoring.js';

describe('Scoring Logic', () => {
  it('should compute initial score with defaults', () => {
    const subScores = getDefaultSubScores();
    const score = computeScore(subScores);

    expect(score.overall).toBe(0);
    expect(score.ageGate).toBe(0);
    expect(score.consent).toBe(0);
    expect(score.contentSafety).toBe(0);
    expect(score.trafficQuality).toBe(0);
    expect(score.lastUpdated).toBeLessThanOrEqual(Date.now());
  });

  it('should compute overall score correctly based on weights', () => {
    // Formula: (ageGate * 0.3) + (consent * 0.3) + (contentSafety * 0.2) + (trafficQuality * 0.2)
    // (100 * 0.3) + (100 * 0.3) + (100 * 0.2) + (100 * 0.2) = 30 + 30 + 20 + 20 = 100
    const subScores = {
      ageGate: 100,
      consent: 100,
      contentSafety: 100,
      trafficQuality: 100,
    };
    const score = computeScore(subScores);
    expect(score.overall).toBe(100);

    // (50 * 0.3) + (80 * 0.3) + (60 * 0.2) + (90 * 0.2)
    // 15 + 24 + 12 + 18 = 69
    const subScores2 = {
      ageGate: 50,
      consent: 80,
      contentSafety: 60,
      trafficQuality: 90,
    };
    const score2 = computeScore(subScores2);
    expect(score2.overall).toBe(69);
  });

  it('should round the overall score', () => {
    // (45 * 0.3) + (45 * 0.3) + (45 * 0.2) + (45 * 0.2)
    // 13.5 + 13.5 + 9 + 9 = 45
    // Let's try something that results in .5
    // (45 * 0.3) + (46 * 0.3) + (45 * 0.2) + (45 * 0.2)
    // 13.5 + 13.8 + 9 + 9 = 45.3 -> 45
    const subScores = {
      ageGate: 45,
      consent: 46,
      contentSafety: 45,
      trafficQuality: 45,
    };
    const score = computeScore(subScores);
    expect(score.overall).toBe(45);
    
    // (47 * 0.3) + (46 * 0.3) + (45 * 0.2) + (45 * 0.2)
    // 14.1 + 13.8 + 9 + 9 = 45.9 -> 46
    const subScores2 = {
      ageGate: 47,
      consent: 46,
      contentSafety: 45,
      trafficQuality: 45,
    };
    const score2 = computeScore(subScores2);
    expect(score2.overall).toBe(46);
  });
});
