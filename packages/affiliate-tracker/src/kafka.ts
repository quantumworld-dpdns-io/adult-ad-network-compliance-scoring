import { Kafka, Producer, Consumer } from 'kafkajs';
import { Click, Impression, FraudSignal } from '@adult-ad-net/shared';
import { Conversion, AttributionResult } from './types.js';

export class KafkaManager {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'affiliate-tracker',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'affiliate-tracker-group' });
  }

  async connect() {
    await this.producer.connect();
    await this.consumer.connect();
  }

  async subscribe(handlers: {
    onClick: (click: Click) => Promise<void>;
    onConversion: (conversion: Conversion) => Promise<void>;
    onFraudSignal: (signal: FraudSignal) => Promise<void>;
    onImpression: (impression: Impression) => Promise<void>;
  }) {
    await this.consumer.subscribe({ topics: ['CLICK', 'CONVERSION', 'FRAUD_SIGNAL', 'IMPRESSION'], fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());

        switch (topic) {
          case 'CLICK':
            await handlers.onClick(payload);
            break;
          case 'CONVERSION':
            await handlers.onConversion(payload);
            break;
          case 'FRAUD_SIGNAL':
            await handlers.onFraudSignal(payload);
            break;
          case 'IMPRESSION':
            await handlers.onImpression(payload);
            break;
        }
      },
    });
  }

  async publishAttribution(result: AttributionResult) {
    await this.producer.send({
      topic: 'ATTRIBUTION',
      messages: [{ value: JSON.stringify(result) }],
    });
  }

  async publishClick(click: Click) {
    await this.producer.send({
      topic: 'CLICK',
      messages: [{ value: JSON.stringify(click) }],
    });
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }
}
