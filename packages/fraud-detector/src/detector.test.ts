import { describe, it, expect } from 'vitest';
import { FraudDetector } from './detector.js';
import { Impression } from '@adult-ad-net/shared';

describe('FraudDetector', () => {
  const detector = new FraudDetector();

  const baseImpression: Impression = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    campaignId: '123e4567-e89b-12d3-a456-426614174001',
    publisherId: '123e4567-e89b-12d3-a456-426614174002',
    timestamp: Date.now(),
    ipHash: 'hashed-ip',
    ip: '1.2.3.4',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    complianceScoreAtServe: 100,
  };

  it('should identify normal traffic as low probability', () => {
    const evaluation = detector.evaluateImpression(baseImpression, 0.02);
    expect(evaluation.probability).toBeLessThan(0.7);
    expect(evaluation.reasons).toHaveLength(0);
  });

  it('should detect bot user-agents', () => {
    const botImpression = { ...baseImpression, userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)' };
    const evaluation = detector.evaluateImpression(botImpression, 0.02);
    expect(evaluation.probability).toBeGreaterThanOrEqual(0.8);
    expect(evaluation.reasons).toContain('Bot user-agent detected');
  });

  it('should detect datacenter IPs', () => {
    const dcImpression = { ...baseImpression, ip: '3.5.0.1' };
    const evaluation = detector.evaluateImpression(dcImpression, 0.02);
    expect(evaluation.probability).toBeGreaterThanOrEqual(0.5);
    expect(evaluation.reasons).toContain('Datacenter IP detected');
  });

  it('should detect CTR anomalies', () => {
    const evaluation = detector.evaluateImpression(baseImpression, 0.15); // 15% CTR
    expect(evaluation.probability).toBeGreaterThan(0);
    expect(evaluation.reasons).some(r => r.includes('High CTR anomaly'));
  });

  it('should combine multiple fraud signals', () => {
    const suspiciousImpression = {
      ...baseImpression,
      userAgent: 'HeadlessChrome/91.0.4472.124',
      ip: '3.5.0.1'
    };
    const evaluation = detector.evaluateImpression(suspiciousImpression, 0.15);
    expect(evaluation.probability).toBe(1); // Should cap at 1.0
    expect(evaluation.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it('should calculate traffic quality score correctly', () => {
    expect(detector.calculateTrafficQualityScore(0)).toBe(100);
    expect(detector.calculateTrafficQualityScore(0.1)).toBe(90);
    expect(detector.calculateTrafficQualityScore(1)).toBe(0);
  });
});
