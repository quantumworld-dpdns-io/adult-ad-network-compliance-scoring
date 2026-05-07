import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { CampaignManagerService, type TargetingRules } from './service.js';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';

const TargetingRulesSchema = z.object({
  min_compliance_score: z.number().min(0).max(100).default(0),
  require_age_gate: z.boolean().default(false),
  min_consent_record_status: z.number().min(0).max(100).default(0),
  blocked_categories: z.array(z.string()).default([]),
});

const CreateCampaignSchema = z.object({
  advertiserId: z.string().uuid(),
  name: z.string().min(1),
  budget: z.number().nonnegative(),
  status: z.enum(['active', 'paused', 'completed', 'draft']).optional(),
  targetingRules: TargetingRulesSchema,
});

const UpdateCampaignSchema = CreateCampaignSchema.partial();

export function createCampaignApp(service: CampaignManagerService) {
  const app = new Hono();

  app.get('/campaigns', async (c) => {
    const campaigns = await service.listCampaigns();
    return c.json(campaigns);
  });

  app.get('/campaigns/:id', async (c) => {
    const id = c.req.param('id');
    const campaign = await service.getCampaign(id);
    if (!campaign) return c.json({ error: 'Not found' }, 404);
    return c.json(campaign);
  });

  app.post('/campaigns', zValidator('json', CreateCampaignSchema), async (c) => {
    const data = c.req.valid('json');
    const actorId = c.req.header('X-Actor-ID');
    const campaign = await service.createCampaign(data as any, actorId);
    return c.json(campaign, 201);
  });

  app.patch('/campaigns/:id', zValidator('json', UpdateCampaignSchema), async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const actorId = c.req.header('X-Actor-ID');
    const campaign = await service.updateCampaign(id, data as any, actorId);
    if (!campaign) return c.json({ error: 'Not found' }, 404);
    return c.json(campaign);
  });

  app.delete('/campaigns/:id', async (c) => {
    const id = c.req.param('id');
    const actorId = c.req.header('X-Actor-ID');
    const success = await service.deleteCampaign(id, actorId);
    if (!success) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  });

  app.get('/campaigns/:id/eligible-publishers', async (c) => {
    const id = c.req.param('id');
    try {
      const publishers = await service.listEligiblePublishers(id);
      return c.json(publishers);
    } catch (e: any) {
      return c.json({ error: e.message }, 404);
    }
  });

  return app;
}

export * from './schema.js';
export * from './service.js';
