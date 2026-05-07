import express from 'express';
import { ScoreStore } from './redis.js';
import { KafkaManager } from './kafka.js';
import { AdService } from './service.js';
import { AdRequestSchema } from './types.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

const scoreStore = new ScoreStore();
const kafkaManager = new KafkaManager();
const adService = new AdService(scoreStore, kafkaManager);

// Initialize
async function start() {
  await kafkaManager.connect();
  
  // Listen for score changes for real-time compliance enforcement
  await kafkaManager.subscribeToScoreChanges(async (publisherId, score) => {
    console.log(`Score changed for publisher ${publisherId}: ${score.overall}`);
    await adService.updatePublisherScore(publisherId, score);
  });

  app.post('/v1/ad-request', async (req, res) => {
    const startTime = performance.now();
    try {
      const validatedRequest = AdRequestSchema.safeParse(req.body);
      if (!validatedRequest.success) {
        return res.status(400).json({ error: validatedRequest.error });
      }

      const response = await adService.handleAdRequest(validatedRequest.data);
      
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`Ad request took ${duration.toFixed(2)}ms, exceeding 100ms target`);
      }

      if (!response) {
        return res.status(204).send(); // No fill
      }

      res.json(response);
    } catch (error) {
      console.error('Error handling ad request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.listen(port, () => {
    console.log(`Ad Server listening on port ${port}`);
  });
}

start().catch(err => {
  console.error('Failed to start Ad Server:', err);
  process.exit(1);
});
