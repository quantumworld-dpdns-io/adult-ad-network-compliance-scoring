import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AffiliateStore } from './redis.js';
import { KafkaManager } from './kafka.js';
import { AffiliateService } from './service.js';
import { AffiliateSchema, TrackingLink } from './types.js';

const app = express();
const port = process.env.PORT || 3006;

app.use(express.json());

const store = new AffiliateStore();
const kafka = new KafkaManager();
const service = new AffiliateService(store, kafka);

async function start() {
  await kafka.connect();

  // Kafka Consumer
  await kafka.subscribe({
    onClick: async (click) => {
      await service.handleClick(click);
    },
    onConversion: async (conversion) => {
      await service.handleConversion(conversion);
    },
    onFraudSignal: async (signal) => {
      await service.handleFraudSignal(signal);
    },
    onImpression: async (impression) => {
      await service.handleImpression(impression);
    },
  });

  // API Endpoints

  // 1. Create Affiliate
  app.post('/v1/affiliates', async (req, res) => {
    try {
      const affiliateData = {
        id: uuidv4(),
        ...req.body,
        createdAt: Date.now(),
      };
      const validated = AffiliateSchema.safeParse(affiliateData);
      if (!validated.success) {
        return res.status(400).json({ error: validated.error });
      }

      await store.saveAffiliate(validated.data);
      res.status(201).json(validated.data);
    } catch (error) {
      console.error('Error creating affiliate:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 2. Generate Tracking Link
  app.post('/v1/affiliates/:id/links', async (req, res) => {
    try {
      const { id: affiliateId } = req.params;
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'campaignId is required' });
      }

      const affiliate = await store.getAffiliate(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: 'Affiliate not found' });
      }

      const linkId = uuidv4();
      const trackingLink: TrackingLink = {
        id: linkId,
        affiliateId,
        campaignId,
        // The URL the affiliate will use
        url: `${process.env.BASE_URL || 'http://localhost:3006'}/v1/click?linkId=${linkId}`,
        createdAt: Date.now(),
      };

      await store.saveTrackingLink(trackingLink);
      res.status(201).json(trackingLink);
    } catch (error) {
      console.error('Error generating tracking link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 3. Get Affiliate Links
  app.get('/v1/affiliates/:id/links', async (req, res) => {
    try {
      const { id } = req.params;
      const links = await store.getAffiliateLinks(id);
      res.json(links);
    } catch (error) {
      console.error('Error fetching links:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 4. Click Handler (Redirect)
  app.get('/v1/click', async (req, res) => {
    try {
      const { linkId } = req.query;
      if (!linkId || typeof linkId !== 'string') {
        return res.status(400).json({ error: 'linkId is required' });
      }

      const link = await store.getTrackingLink(linkId);
      if (!link) {
        return res.status(404).json({ error: 'Tracking link not found' });
      }

      const clickId = uuidv4();
      const click = {
        id: clickId,
        campaignId: link.campaignId,
        publisherId: link.affiliateId, // Using affiliateId as publisherId in the common Click schema
        timestamp: Date.now(),
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.ip,
        affiliateId: link.affiliateId, // Custom field for attribution
      };

      // Publish CLICK to Kafka
      await kafka.publishClick(click);

      // Store in Redis for attribution (the service will also do this when it hears the Kafka event, 
      // but doing it here ensures it's available even if Kafka is slow)
      // Actually, service.handleClick(click) is better.
      await service.handleClick(click);

      // Redirect to campaign landing page (mock)
      const landingPage = `https://advertiser.com/landing?campId=${link.campaignId}&clickId=${clickId}`;
      res.redirect(landingPage);
    } catch (error) {
      console.error('Error handling click:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.listen(port, () => {
    console.log(`Affiliate Tracker listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start Affiliate Tracker:', err);
  process.exit(1);
});
