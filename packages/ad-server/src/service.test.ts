import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdService } from './service.js';
import { ScoreStore } from './redis.js';
import { KafkaManager } from './kafka.js';
import { v4 as uuidv4 } from 'uuid';
import { ComplianceScore, Campaign } from '@adult-ad-net/shared';

vi.mock('./redis.js');
vi.mock('./kafka.js');

describe('AdService', () => {
  let adService: AdService;
  let mockScoreStore: any;
  let mockKafkaManager: any;

  const mockPublisherId = uuidv4();
  const mockCampaign: Campaign = {
    id: uuidv4(),
    advertiserId: uuidv4(),
    name: 'Test Campaign',
    budget: 1000,
    spent: 0,
    status: 'active',
    targetingRules: {
      minComplianceScore: 70,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockScore: ComplianceScore = {
    overall: 80,
    ageGate: 80,
    consent: 80,
    contentSafety: 80,
    trafficQuality: 80,
    lastUpdated: Date.now(),
  };

  beforeEach(() => {
    mockScoreStore = new ScoreStore();
    mockKafkaManager = new KafkaManager();
    // Ensure all async methods return Promises so .catch() works
    mockScoreStore.getConsentStatus = vi.fn().mockResolvedValue(null);
    mockKafkaManager.publishAttestation = vi.fn().mockResolvedValue(undefined);
    mockKafkaManager.publishImpression = vi.fn().mockResolvedValue(undefined);
    adService = new AdService(mockScoreStore, mockKafkaManager);
    adService.setCampaigns([mockCampaign]);
    // Clear any suspension state carried over from previous tests
    adService.updatePublisherScore(mockPublisherId, { ...mockScore, overall: 80 });
  });

  it('should serve an ad when score is above threshold', async () => {
    mockScoreStore.getScore.mockResolvedValue(mockScore);
    
    const request = {
      publisherId: mockPublisherId,
      userAgent: 'test-ua',
      ip: '127.0.0.1',
    };

    const response = await adService.handleAdRequest(request);

    expect(response).not.toBeNull();
    expect(response?.campaignId).toBe(mockCampaign.id);
    expect(mockKafkaManager.publishImpression).toHaveBeenCalled();
  });

  it('should not serve an ad when score is below threshold', async () => {
    mockScoreStore.getScore.mockResolvedValue({ ...mockScore, overall: 60 });
    
    const request = {
      publisherId: mockPublisherId,
      userAgent: 'test-ua',
      ip: '127.0.0.1',
    };

    const response = await adService.handleAdRequest(request);

    expect(response).toBeNull();
  });

  it('should fail-closed when score is unavailable', async () => {
    mockScoreStore.getScore.mockResolvedValue(null);
    
    const request = {
      publisherId: mockPublisherId,
      userAgent: 'test-ua',
      ip: '127.0.0.1',
    };

    const response = await adService.handleAdRequest(request);

    expect(response).toBeNull();
  });

  it('should respect real-time suspension', async () => {
    mockScoreStore.getScore.mockResolvedValue(mockScore);
    
    // Suspend publisher
    await adService.updatePublisherScore(mockPublisherId, { ...mockScore, overall: 30 });

    const request = {
      publisherId: mockPublisherId,
      userAgent: 'test-ua',
      ip: '127.0.0.1',
    };

    const response = await adService.handleAdRequest(request);

    expect(response).toBeNull();
  });

  it('should generate a valid attestation', async () => {
    mockScoreStore.getScore.mockResolvedValue(mockScore);
    
    const request = {
      publisherId: mockPublisherId,
      userAgent: 'test-ua',
      ip: '127.0.0.1',
    };

    const response = await adService.handleAdRequest(request);
    
    expect(response?.attestation).toBeDefined();
    const attestation = JSON.parse(Buffer.from(response!.attestation, 'base64').toString());
    expect(attestation.publisherId).toBe(mockPublisherId);
    expect(attestation.complianceScore).toBe(mockScore.overall);
    expect(attestation.signature).toBeDefined();
  });
});
