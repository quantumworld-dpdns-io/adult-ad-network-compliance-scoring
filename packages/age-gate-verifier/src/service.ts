import { Kafka, Producer } from 'kafkajs';
import { signMessage } from '@adult-ad-net/shared';
import { VerificationResult } from './types.js';
import { CrawlerVerifier } from './verifiers/crawler.js';
import { ScreenshotVerifier } from './verifiers/screenshot.js';
import { VCVerifier } from './verifiers/vc.js';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const PRIVATE_KEY = process.env.SIGNING_PRIVATE_KEY || ''; // Base64 encoded Ed25519 private key

export class AgeGateService {
  private producer: Producer;
  private crawler: CrawlerVerifier;
  private screenshot: ScreenshotVerifier;
  private vc: VCVerifier;

  constructor() {
    const kafka = new Kafka({
      clientId: 'age-gate-verifier',
      brokers: KAFKA_BROKERS,
    });
    this.producer = kafka.producer();
    this.crawler = new CrawlerVerifier();
    this.screenshot = new ScreenshotVerifier();
    this.vc = new VCVerifier();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async verify(
    publisherId: string, 
    domain: string, 
    method: 'crawler' | 'screenshot' | 'VC',
    vcData?: any
  ): Promise<VerificationResult> {
    let result: VerificationResult;

    switch (method) {
      case 'crawler':
        result = await this.crawler.verify(publisherId, domain);
        break;
      case 'screenshot':
        result = await this.screenshot.verify(publisherId, domain);
        break;
      case 'VC':
        result = await this.vc.verify(publisherId, domain, vcData);
        break;
      default:
        throw new Error(`Unsupported verification method: ${method}`);
    }

    if (result.status === 'verified' && PRIVATE_KEY) {
      // Sign the attestation as defined in design.md
      const attestation = JSON.stringify({
        publisherId: result.publisherId,
        domain: result.domain,
        score: result.score,
        timestamp: Date.now(),
      });
      const signature = signMessage(attestation, PRIVATE_KEY);
      result.metadata = { ...(result.metadata || {}), signature };
    }

    await this.publishResult(result);
    return result;
  }

  private async publishResult(result: VerificationResult): Promise<void> {
    await this.producer.send({
      topic: 'AGE_GATE_VERIFIED',
      messages: [
        {
          key: result.publisherId,
          value: JSON.stringify({
            publisherId: result.publisherId,
            domain: result.domain,
            method: result.method,
            status: result.status,
            score: result.score,
            evidenceUrl: result.evidenceUrl,
            timestamp: Date.now(),
            metadata: result.metadata,
          }),
        },
      ],
    });
  }
}
