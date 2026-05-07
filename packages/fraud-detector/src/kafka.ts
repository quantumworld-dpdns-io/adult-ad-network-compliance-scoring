import { Kafka, Consumer, Producer } from 'kafkajs';
import { Impression, Click, FraudSignal, TrafficQualityUpdated } from '@adult-ad-net/shared';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

export const TOPICS = {
  IMPRESSION: 'IMPRESSION',
  CLICK: 'CLICK',
  FRAUD_SIGNAL: 'FRAUD_SIGNAL',
  TRAFFIC_QUALITY_UPDATED: 'TRAFFIC_QUALITY_UPDATED',
};

export class KafkaManager {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'fraud-detector',
      brokers: KAFKA_BROKERS,
    });
    this.consumer = this.kafka.consumer({ groupId: 'fraud-detector-group' });
    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    await this.producer.connect();
  }

  async subscribe(onImpression: (imp: Impression) => Promise<void>, onClick: (click: Click) => Promise<void>): Promise<void> {
    await this.consumer.subscribe({ 
      topics: [TOPICS.IMPRESSION, TOPICS.CLICK], 
      fromBeginning: true 
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          if (topic === TOPICS.IMPRESSION) {
            await onImpression(payload);
          } else if (topic === TOPICS.CLICK) {
            await onClick(payload);
          }
        } catch (error) {
          console.error(`Error processing message on topic ${topic}:`, error);
        }
      },
    });
  }

  async publishFraudSignal(signal: FraudSignal): Promise<void> {
    await this.producer.send({
      topic: TOPICS.FRAUD_SIGNAL,
      messages: [
        {
          key: signal.publisherId,
          value: JSON.stringify(signal),
        },
      ],
    });
  }

  async publishTrafficQualityUpdated(update: TrafficQualityUpdated): Promise<void> {
    await this.producer.send({
      topic: TOPICS.TRAFFIC_QUALITY_UPDATED,
      messages: [
        {
          key: update.publisherId,
          value: JSON.stringify(update),
        },
      ],
    });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }
}
