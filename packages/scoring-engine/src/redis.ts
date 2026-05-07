import { Redis } from 'ioredis';
import { 
  encodeComplianceScore, 
  decodeComplianceScore, 
  type ComplianceScore 
} from '@adult-ad-net/shared';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export class ScoreStore {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(REDIS_URL);
  }

  private getScoreKey(publisherId: string): string {
    return `publisher:score:${publisherId}`;
  }

  async saveScore(publisherId: string, score: ComplianceScore): Promise<void> {
    const encoded = encodeComplianceScore(score);
    await this.redis.set(this.getScoreKey(publisherId), encoded);
  }

  async getScore(publisherId: string): Promise<ComplianceScore | null> {
    const encoded = await this.redis.get(this.getScoreKey(publisherId));
    if (!encoded) return null;
    try {
      return decodeComplianceScore(encoded);
    } catch (error) {
      console.error(`Failed to decode score for publisher ${publisherId}:`, error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
