import 'dotenv/config';
import { KafkaManager } from './kafka.js';
import { FraudDetector } from './detector.js';
import { FraudState } from './state.js';
import { Impression, Click } from '@adult-ad-net/shared';

async function main() {
  const kafkaManager = new KafkaManager();
  const detector = new FraudDetector();
  const state = new FraudState();

  await kafkaManager.connect();
  console.log('Fraud Detector connected to Kafka');

  const handleImpression = async (imp: Impression) => {
    // 1. Record impression in state for rolling windows
    await state.recordImpression(imp.publisherId);

    // 2. Get current CTR for anomaly detection
    const currentCTR = await state.getCTR(imp.publisherId);

    // 3. Evaluate for fraud
    const evaluation = detector.evaluateImpression(imp, currentCTR);

    // 4. If fraud probability > 0.7, publish signal and record in state
    if (evaluation.probability > 0.7) {
      console.log(`Fraud detected for impression ${imp.id} (p=${evaluation.probability}): ${evaluation.reasons.join(', ')}`);
      
      await state.recordFraudSignal(imp.publisherId);
      
      await kafkaManager.publishFraudSignal({
        impressionId: imp.id,
        publisherId: imp.publisherId,
        campaignId: imp.campaignId,
        timestamp: Date.now(),
        probability: evaluation.probability,
        reasons: evaluation.reasons,
      });
    }

    // 5. Periodically/Every N impressions, update and publish traffic quality score
    // For simplicity, we'll do it every impression here, but in production we might throttle it
    const fraudRate = await state.getFraudRate(imp.publisherId);
    const qualityScore = detector.calculateTrafficQualityScore(fraudRate);
    
    await kafkaManager.publishTrafficQualityUpdated({
      publisherId: imp.publisherId,
      score: qualityScore,
      timestamp: Date.now(),
    });
  };

  const handleClick = async (click: Click) => {
    // Record click in state for rolling windows
    await state.recordClick(click.publisherId);
    console.log(`Recorded click for publisher ${click.publisherId}`);
  };

  await kafkaManager.subscribe(handleImpression, handleClick);
  console.log('Fraud Detector subscribed to topics');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down Fraud Detector...');
    await kafkaManager.disconnect();
    await state.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('Fatal error in fraud-detector:', error);
  process.exit(1);
});
