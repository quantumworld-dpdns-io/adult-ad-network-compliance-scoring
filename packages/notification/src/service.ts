import { Kafka, Consumer } from 'kafkajs';
import Redis from 'ioredis';
import { ComplianceScore, ConsentRecord } from '@adult-ad-net/shared';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export class NotificationService {
  private kafka: Kafka;
  private consumer: Consumer;
  private redis: Redis;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'notification-service',
      brokers: KAFKA_BROKERS,
    });
    this.consumer = this.kafka.consumer({ groupId: 'notification-group' });
    this.redis = new Redis(REDIS_URL);
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    await this.redis.disconnect();
  }

  private async deliverAlert(type: string, message: string, data: any): Promise<void> {
    // Mock delivery system: Console log
    console.log(`[ALERT] [${type}] ${message}`);
    console.log(`Data: ${JSON.stringify(data, null, 2)}`);
  }

  async start(): Promise<void> {
    await this.consumer.subscribe({ 
      topics: ['SCORE_CHANGED', 'PUBLISHER_SUSPENDED', 'CONSENT_UPDATED'], 
      fromBeginning: false 
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());

        switch (topic) {
          case 'SCORE_CHANGED':
            await this.handleScoreChanged(payload);
            break;
          case 'PUBLISHER_SUSPENDED':
            await this.handlePublisherSuspended(payload);
            break;
          case 'CONSENT_UPDATED':
            await this.handleConsentUpdated(payload);
            break;
        }
      },
    });
  }

  private async handleScoreChanged(payload: { publisherId: string; score: ComplianceScore; timestamp: number }): Promise<void> {
    const { publisherId, score } = payload;
    const redisKey = `last_score:${publisherId}`;
    const lastScoreStr = await this.redis.get(redisKey);

    if (lastScoreStr) {
      const lastScore = parseInt(lastScoreStr, 10);
      const drop = lastScore - score.overall;
      if (drop > 10) {
        await this.deliverAlert(
          'SCORE_DROP',
          `Publisher ${publisherId} compliance score dropped by ${drop} points.`,
          { publisherId, oldScore: lastScore, newScore: score.overall }
        );
      }
    }

    await this.redis.set(redisKey, score.overall.toString());
  }

  private async handlePublisherSuspended(payload: { publisherId: string; reason?: string; timestamp: number }): Promise<void> {
    const { publisherId, reason } = payload;
    await this.deliverAlert(
      'PUBLISHER_SUSPENDED',
      `Publisher ${publisherId} has been suspended.`,
      { publisherId, reason }
    );
  }

  private async handleConsentUpdated(payload: { publisherId: string; consentRecord: ConsentRecord; timestamp: number }): Promise<void> {
    const { publisherId, consentRecord } = payload;
    
    if (consentRecord.validUntil) {
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const timeUntilExpiry = consentRecord.validUntil - Date.now();
      
      if (timeUntilExpiry > 0 && timeUntilExpiry <= thirtyDaysInMs) {
        await this.deliverAlert(
          'CONSENT_EXPIRING',
          `Consent record for publisher ${publisherId} is about to expire in ${Math.round(timeUntilExpiry / (24 * 60 * 60 * 1000))} days.`,
          { publisherId, consentRecordId: consentRecord.id, validUntil: consentRecord.validUntil }
        );
      }
    }
  }
}
