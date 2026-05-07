import { Redis } from 'ioredis';

const ONE_HOUR_MS = 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class FraudState {
  private redis: Redis;

  constructor(redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
    this.redis = new Redis(redisUrl);
  }

  async recordImpression(publisherId: string): Promise<void> {
    const now = Date.now();
    const key = `stats:impressions:${publisherId}`;
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    // Cleanup old data (30 days)
    await this.redis.zremrangebyscore(key, 0, now - THIRTY_DAYS_MS);
  }

  async recordClick(publisherId: string): Promise<void> {
    const now = Date.now();
    const key = `stats:clicks:${publisherId}`;
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    // Cleanup old data (1 hour is enough for CTR anomaly, but maybe 30 days for general stats)
    await this.redis.zremrangebyscore(key, 0, now - THIRTY_DAYS_MS);
  }

  async recordFraudSignal(publisherId: string): Promise<void> {
    const now = Date.now();
    const key = `stats:fraud:${publisherId}`;
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.zremrangebyscore(key, 0, now - THIRTY_DAYS_MS);
  }

  async getCTR(publisherId: string): Promise<number> {
    const now = Date.now();
    const oneHourAgo = now - ONE_HOUR_MS;
    
    const impCount = await this.redis.zcount(`stats:impressions:${publisherId}`, oneHourAgo, now);
    const clickCount = await this.redis.zcount(`stats:clicks:${publisherId}`, oneHourAgo, now);

    if (impCount === 0) return 0;
    return clickCount / impCount;
  }

  async getFraudRate(publisherId: string): Promise<number> {
    const now = Date.now();
    const thirtyDaysAgo = now - THIRTY_DAYS_MS;

    const impCount = await this.redis.zcount(`stats:impressions:${publisherId}`, thirtyDaysAgo, now);
    const fraudCount = await this.redis.zcount(`stats:fraud:${publisherId}`, thirtyDaysAgo, now);

    if (impCount === 0) return 0;
    return fraudCount / impCount;
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
