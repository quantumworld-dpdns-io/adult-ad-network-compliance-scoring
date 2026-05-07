import { Kafka, Producer, Consumer } from 'kafkajs';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

export const TOPICS = {
  IMPRESSION: 'IMPRESSION',
  SCORE_CHANGED: 'SCORE_CHANGED',
  ATTESTATION: 'ATTESTATION',
};

export class KafkaManager {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'ad-server',
      brokers: KAFKA_BROKERS,
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'ad-server-group' });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    await this.consumer.connect();
  }

  async publishImpression(impression: any): Promise<void> {
    await this.producer.send({
      topic: TOPICS.IMPRESSION,
      messages: [
        {
          key: impression.publisherId,
          value: JSON.stringify(impression),
        },
      ],
    });
  }

  async publishAttestation(attestation: any): Promise<void> {
    await this.producer.send({
      topic: TOPICS.ATTESTATION,
      messages: [
        {
          key: attestation.id,
          value: JSON.stringify(attestation),
        },
      ],
    });
  }

  async subscribeToScoreChanges(callback: (publisherId: string, score: any) => Promise<void>): Promise<void> {
    await this.consumer.subscribe({ topic: TOPICS.SCORE_CHANGED, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          await callback(payload.publisherId, payload.score);
        } catch (error) {
          console.error('Error processing score change message:', error);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }
}
