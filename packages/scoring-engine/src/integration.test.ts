import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoreStore } from './redis.js';
import { KafkaManager } from './kafka.js';
import { encodeComplianceScore } from '@adult-ad-net/shared';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    Redis: vi.fn().mockImplementation(() => {
      return {
        get: vi.fn(),
        set: vi.fn(),
        quit: vi.fn(),
      };
    }),
  };
});

// Mock Kafka
vi.mock('kafkajs', () => {
  return {
    Kafka: vi.fn().mockImplementation(() => {
      return {
        consumer: vi.fn().mockReturnValue({
          connect: vi.fn(),
          subscribe: vi.fn(),
          run: vi.fn(),
          disconnect: vi.fn(),
        }),
        producer: vi.fn().mockReturnValue({
          connect: vi.fn(),
          send: vi.fn(),
          disconnect: vi.fn(),
        }),
      };
    }),
  };
});

describe('Integration Components', () => {
  describe('ScoreStore', () => {
    let scoreStore: ScoreStore;
    let mockRedis: any;

    beforeEach(() => {
      scoreStore = new ScoreStore();
      mockRedis = (scoreStore as any).redis;
    });

    it('should save score to redis', async () => {
      const publisherId = 'pub-1';
      const score = {
        overall: 80,
        ageGate: 80,
        consent: 80,
        contentSafety: 80,
        trafficQuality: 80,
        lastUpdated: Date.now(),
      };

      await scoreStore.saveScore(publisherId, score);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `publisher:score:${publisherId}`,
        expect.any(String)
      );
    });

    it('should retrieve score from redis', async () => {
      const publisherId = 'pub-1';
      const score = {
        overall: 80,
        ageGate: 80,
        consent: 80,
        contentSafety: 80,
        trafficQuality: 80,
        lastUpdated: Date.now(),
      };
      const encoded = encodeComplianceScore(score);
      mockRedis.get.mockResolvedValue(encoded);

      const retrieved = await scoreStore.getScore(publisherId);

      expect(retrieved).toEqual(score);
      expect(mockRedis.get).toHaveBeenCalledWith(`publisher:score:${publisherId}`);
    });
  });

  describe('KafkaManager', () => {
    let kafkaManager: KafkaManager;

    beforeEach(() => {
      kafkaManager = new KafkaManager();
    });

    it('should connect to kafka', async () => {
      await kafkaManager.connect();
      expect(kafkaManager['consumer'].connect).toHaveBeenCalled();
      expect(kafkaManager['producer'].connect).toHaveBeenCalled();
    });

    it('should publish score change', async () => {
      await kafkaManager.connect();
      const publisherId = 'pub-1';
      const score = { overall: 80 };

      await kafkaManager.publishScoreChanged(publisherId, score);

      expect(kafkaManager['producer'].send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'SCORE_CHANGED',
          messages: [
            expect.objectContaining({
              key: publisherId,
              value: expect.stringContaining('"overall":80'),
            }),
          ],
        })
      );
    });
  });
});
