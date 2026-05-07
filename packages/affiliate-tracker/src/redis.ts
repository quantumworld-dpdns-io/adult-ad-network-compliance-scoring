import { Redis } from 'ioredis';
import { Affiliate, TrackingLink } from './types.js';
import { Click, Impression, FraudSignal } from '@adult-ad-net/shared';

export class AffiliateStore {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  // Affiliate management
  async saveAffiliate(affiliate: Affiliate): Promise<void> {
    await this.redis.set(`affiliate:${affiliate.id}`, JSON.stringify(affiliate));
  }

  async getAffiliate(id: string): Promise<Affiliate | null> {
    const data = await this.redis.get(`affiliate:${id}`);
    return data ? JSON.parse(data) : null;
  }

  // Tracking links
  async saveTrackingLink(link: TrackingLink): Promise<void> {
    await this.redis.set(`tracking_link:${link.id}`, JSON.stringify(link));
    // Also index by affiliateId and campaignId for quick lookup if needed
    await this.redis.sadd(`affiliate:${link.affiliateId}:links`, link.id);
  }

  async getTrackingLink(id: string): Promise<TrackingLink | null> {
    const data = await this.redis.get(`tracking_link:${id}`);
    return data ? JSON.parse(data) : null;
  }

  async getAffiliateLinks(affiliateId: string): Promise<TrackingLink[]> {
    const ids = await this.redis.smembers(`affiliate:${affiliateId}:links`);
    const links = await Promise.all(ids.map(id => this.getTrackingLink(id)));
    return links.filter((l): l is TrackingLink => l !== null);
  }

  // Attribution data
  async saveClick(click: Click, affiliateId: string, ttlSeconds: number): Promise<void> {
    await this.redis.setex(`click:${click.id}`, ttlSeconds, JSON.stringify({ ...click, affiliateId }));
  }

  async getClick(id: string): Promise<(Click & { affiliateId: string }) | null> {
    const data = await this.redis.get(`click:${id}`);
    return data ? JSON.parse(data) : null;
  }

  async saveImpression(impression: Impression, affiliateId: string | undefined, ttlSeconds: number): Promise<void> {
    await this.redis.setex(`impression:${impression.id}`, ttlSeconds, JSON.stringify({ ...impression, affiliateId }));
  }

  async getImpression(id: string): Promise<(Impression & { affiliateId?: string }) | null> {
    const data = await this.redis.get(`impression:${id}`);
    return data ? JSON.parse(data) : null;
  }

  async saveFraudSignal(signal: FraudSignal, ttlSeconds: number): Promise<void> {
    await this.redis.setex(`fraud_signal:${signal.impressionId}`, ttlSeconds, signal.probability.toString());
  }

  async getFraudProbability(impressionId: string): Promise<number> {
    const data = await this.redis.get(`fraud_signal:${impressionId}`);
    return data ? parseFloat(data) : 0;
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
