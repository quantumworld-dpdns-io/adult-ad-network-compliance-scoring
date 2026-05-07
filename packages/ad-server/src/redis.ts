import { Redis } from 'ioredis';
import { 
  decodeComplianceScore, 
  type ComplianceScore 
} from '@adult-ad-net/shared';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export class ScoreStore {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(REDIS_URL, {
      commandTimeout: 30, // 30ms target
    });
  }

  private getScoreKey(publisherId: string): string {
    return `publisher:score:${publisherId}`;
  }

  async getScore(publisherId: string): Promise<ComplianceScore | null> {
    try {
      const encoded = await this.redis.get(this.getScoreKey(publisherId));
      if (!encoded) return null;
      return decodeComplianceScore(encoded);
    } catch (error) {
      console.error(`Failed to get/decode score for publisher ${publisherId}:`, error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
