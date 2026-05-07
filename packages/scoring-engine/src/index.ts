import 'dotenv/config';
import { ScoreStore } from './redis.js';
import { KafkaManager, TOPICS } from './kafka.js';
import { computeScore, getDefaultSubScores, type SubScores } from './scoring.js';

async function main() {
  const scoreStore = new ScoreStore();
  const kafkaManager = new KafkaManager();

  await kafkaManager.connect();
  console.log('Connected to Kafka');

  const recomputeScore = async (publisherId: string, topic: string, payload: any) => {
    console.log(`Processing event ${topic} for publisher ${publisherId}`);

    let currentScore = await scoreStore.getScore(publisherId);
    let subScores: SubScores;

    if (!currentScore) {
      if (topic === TOPICS.PUBLISHER_REGISTERED) {
        subScores = {
          ...getDefaultSubScores(),
          ...(payload.initialSubScores || {}),
        };
      } else {
        console.warn(`Received update for unknown publisher ${publisherId}, initializing with defaults`);
        subScores = getDefaultSubScores();
      }
    } else {
      subScores = {
        ageGate: currentScore.ageGate,
        consent: currentScore.consent,
        contentSafety: currentScore.contentSafety,
        trafficQuality: currentScore.trafficQuality,
      };
    }

    // Update sub-score based on event
    switch (topic) {
      case TOPICS.AGE_GATE_VERIFIED:
        subScores.ageGate = payload.score;
        break;
      case TOPICS.CONSENT_UPDATED:
        subScores.consent = payload.score;
        break;
      case TOPICS.CONTENT_SAFETY_UPDATED:
        subScores.contentSafety = payload.score;
        break;
      case TOPICS.TRAFFIC_QUALITY_UPDATED:
        subScores.trafficQuality = payload.score;
        break;
      case TOPICS.PUBLISHER_REGISTERED:
        // Already handled initialization
        break;
    }

    const newScore = computeScore(subScores);
    await scoreStore.saveScore(publisherId, newScore);
    
    if (!currentScore || currentScore.overall !== newScore.overall) {
      await kafkaManager.publishScoreChanged(publisherId, newScore);
      console.log(`Score changed for ${publisherId}: ${newScore.overall}`);
    }
  };

  const handleMessage = async (topic: string, payload: any) => {
    const { publisherId } = payload;
    if (!publisherId) {
      console.warn(`Received message on topic ${topic} without publisherId`);
      return;
    }
    await recomputeScore(publisherId, topic, payload);
  };

  await kafkaManager.subscribe(handleMessage);
  console.log('Subscribed to Kafka topics');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await kafkaManager.disconnect();
    await scoreStore.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('Fatal error in scoring-engine:', error);
  process.exit(1);
});
