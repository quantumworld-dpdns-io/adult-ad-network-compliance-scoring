import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app, anchorBatch } from './index';
import { KafkaManager as AdServerKafka } from '../../ad-server/src/kafka';
import { AdService } from '../../ad-server/src/service';
import { ScoreStore } from '../../ad-server/src/redis';
import { v4 as uuidv4 } from 'uuid';

// Mock Kafka
vi.mock('./kafka', () => {
  return {
    KafkaManager: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      subscribeToAttestations: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock('../../ad-server/src/kafka', () => {
  return {
    KafkaManager: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      publishAttestation: vi.fn().mockResolvedValue(undefined),
      publishImpression: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock('../../ad-server/src/redis', () => {
  return {
    ScoreStore: vi.fn().mockImplementation(() => ({
      getScore: vi.fn().mockResolvedValue({ overall: 85 }),
      getConsentStatus: vi.fn().mockResolvedValue(null),
    })),
  };
});

describe('End-to-End Attestation Flow', () => {
  let adService: AdService;
  let adServerKafka: any;
  let web3AnchorKafka: any;

  beforeEach(async () => {
    adServerKafka = new AdServerKafka();
    const scoreStore = new ScoreStore();
    adService = new AdService(scoreStore as any, adServerKafka as any);
    adService.setCampaigns([{
      id: uuidv4(),
      advertiserId: uuidv4(),
      name: 'Test Campaign',
      budget: 1000,
      spent: 0,
      status: 'active',
      targetingRules: { minComplianceScore: 50 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }]);

    // Setup web3-anchor kafka mock to trigger callback
    const { KafkaManager: Web3Kafka } = await import('./kafka');
    web3AnchorKafka = new Web3Kafka();
  });

  it('should flow from ad-server to web3-anchor and be retrievable', async () => {
    // 1. Simulate Ad Request on Ad-Server
    const adRequest = {
      publisherId: uuidv4(),
      userAgent: 'Mozilla/5.0',
      ip: '1.2.3.4',
    };

    const adResponse = await adService.handleAdRequest(adRequest as any);
    expect(adResponse).not.toBeNull();
    expect(adResponse?.attestation).toBeDefined();

    const attestation = JSON.parse(Buffer.from(adResponse!.attestation, 'base64').toString());
    const attestationId = attestation.id;

    // 2. Mock handoff via Kafka: web3-anchor receives attestation
    // In the actual app, this happens via the subscriber. We'll manually inject it into the store for the test.
    const { KafkaManager: Web3Kafka } = await import('./kafka');
    const subscribeMock = (Web3Kafka as any).mock.results[0].value.subscribeToAttestations;
    const attestationCallback = subscribeMock.mock.calls[0][0];
    
    await attestationCallback(attestation);

    // 3. Verify it's retrievable but not yet anchored
    const res1 = await request(app).get(`/v1/attestations/${attestationId}`);
    expect(res1.status).toBe(200);
    expect(res1.body.id).toBe(attestationId);
    expect(res1.body.merkleRoot).toBeUndefined();

    const resProofFail = await request(app).get(`/v1/attestations/${attestationId}/proof`);
    expect(resProofFail.status).toBe(400); // Not yet anchored

    // 4. Trigger Batch Anchoring
    await anchorBatch();

    // 5. Verify it's now anchored and has a proof
    const res2 = await request(app).get(`/v1/attestations/${attestationId}`);
    expect(res2.status).toBe(200);
    expect(res2.body.merkleRoot).toBeDefined();

    const resProof = await request(app).get(`/v1/attestations/${attestationId}/proof`);
    expect(resProof.status).toBe(200);
    expect(resProof.body.root).toBe(res2.body.merkleRoot);
    expect(resProof.body.proof).toBeDefined();
    expect(resProof.body.attestation.id).toBe(attestationId);
  });
});
