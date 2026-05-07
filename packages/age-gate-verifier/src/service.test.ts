import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgeGateService } from './service.js';

// Mock kafkajs
vi.mock('kafkajs', () => {
  const send = vi.fn().mockResolvedValue([]);
  const connect = vi.fn().mockResolvedValue(null);
  const disconnect = vi.fn().mockResolvedValue(null);
  return {
    Kafka: vi.fn().mockImplementation(() => ({
      producer: vi.fn().mockImplementation(() => ({
        connect,
        disconnect,
        send,
      })),
    })),
  };
});

// Mock shared signMessage
vi.mock('@adult-ad-net/shared', () => ({
  signMessage: vi.fn().mockReturnValue('mock-signature'),
}));

// Mock verifiers to avoid playwright launch
vi.mock('./verifiers/crawler.js', () => ({
  CrawlerVerifier: vi.fn().mockImplementation(() => ({
    verify: vi.fn().mockResolvedValue({
      publisherId: 'pub-1',
      domain: 'example.com',
      method: 'crawler',
      status: 'verified',
      score: 80,
      metadata: {},
    }),
  })),
}));

describe('AgeGateService', () => {
  let service: AgeGateService;

  beforeEach(() => {
    process.env.SIGNING_PRIVATE_KEY = 'mock-key';
    service = new AgeGateService();
  });

  it('should connect to kafka', async () => {
    await service.connect();
    // Verification depends on how you want to check mocks
  });

  it('should verify and publish to kafka', async () => {
    await service.connect();
    const result = await service.verify('pub-1', 'example.com', 'crawler');
    
    expect(result.status).toBe('verified');
    expect(result.metadata.signature).toBe('mock-signature');
    
    const { Kafka } = await import('kafkajs');
    const mockKafka = vi.mocked(Kafka);
    const producer = mockKafka.mock.results[0].value.producer();
    
    expect(producer.send).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'AGE_GATE_VERIFIED',
    }));
  });
});
