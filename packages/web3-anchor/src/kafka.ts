import { Kafka, Consumer } from 'kafkajs';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

export const TOPICS = {
  ATTESTATION: 'ATTESTATION',
};

export class KafkaManager {
  private kafka: Kafka;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'web3-anchor',
      brokers: KAFKA_BROKERS,
    });
    this.consumer = this.kafka.consumer({ groupId: 'web3-anchor-group' });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async subscribeToAttestations(callback: (attestation: any) => Promise<void>): Promise<void> {
    await this.consumer.subscribe({ topic: TOPICS.ATTESTATION, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          await callback(payload);
        } catch (error) {
          console.error('Error processing attestation message:', error);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }
}
