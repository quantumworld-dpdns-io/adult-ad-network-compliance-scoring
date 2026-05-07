import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { encodeComplianceScore, decodeComplianceScore } from './index.js';
import { calculateOverallComplianceScore, type ComplianceScore } from '../domain-types/index.js';

describe('ComplianceScore Codec', () => {
  const complianceScoreArb = fc.record({
    ageGate: fc.integer({ min: 0, max: 100 }),
    consent: fc.integer({ min: 0, max: 100 }),
    contentSafety: fc.integer({ min: 0, max: 100 }),
    trafficQuality: fc.integer({ min: 0, max: 100 }),
    lastUpdated: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
  }).map((partial) => {
    const overall = calculateOverallComplianceScore(partial);
    return { ...partial, overall } as ComplianceScore;
  });

  it('should round-trip encode and decode for any valid ComplianceScore', () => {
    fc.assert(
      fc.property(complianceScoreArb, (score) => {
        const encoded = encodeComplianceScore(score);
        const decoded = decodeComplianceScore(encoded);
        expect(decoded).toEqual(score);
      })
    );
  });

  it('should fail to decode invalid strings', () => {
    expect(() => decodeComplianceScore('invalid')).toThrow();
    expect(() => decodeComplianceScore('0'.repeat(25))).toThrow();
    expect(() => decodeComplianceScore('0'.repeat(27))).toThrow();
    expect(() => decodeComplianceScore('g'.repeat(26))).toThrow();
  });
});
