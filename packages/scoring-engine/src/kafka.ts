import { Kafka, Consumer, Producer } from 'kafkajs';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

export const TOPICS = {
  PUBLISHER_REGISTERED: 'PUBLISHER_REGISTERED',
  AGE_GATE_VERIFIED: 'AGE_GATE_VERIFIED',
  CONSENT_UPDATED: 'CONSENT_UPDATED',
  CONTENT_SAFETY_UPDATED: 'CONTENT_SAFETY_UPDATED',
  TRAFFIC_QUALITY_UPDATED: 'TRAFFIC_QUALITY_UPDATED',
  SCORE_CHANGED: 'SCORE_CHANGED',
};

export class KafkaManager {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'scoring-engine',
      brokers: KAFKA_BROKERS,
    });
    this.consumer = this.kafka.consumer({ groupId: 'scoring-engine-group' });
    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    await this.producer.connect();
  }

  async subscribe(onMessage: (topic: string, message: any) => Promise<void>): Promise<void> {
    await this.consumer.subscribe({ 
      topics: [
        TOPICS.PUBLISHER_REGISTERED,
        TOPICS.AGE_GATE_VERIFIED,
        TOPICS.CONSENT_UPDATED,
        TOPICS.CONTENT_SAFETY_UPDATED,
        TOPICS.TRAFFIC_QUALITY_UPDATED,
      ], 
      fromBeginning: true 
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          await onMessage(topic, payload);
        } catch (error) {
          console.error(`Error processing message on topic ${topic}:`, error);
        }
      },
    });
  }

  async publishScoreChanged(publisherId: string, score: any): Promise<void> {
    await this.producer.send({
      topic: TOPICS.SCORE_CHANGED,
      messages: [
        {
          key: publisherId,
          value: JSON.stringify({
            publisherId,
            score,
            timestamp: Date.now(),
          }),
        },
      ],
    });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    await this.producer.disconnect();
  }
}
