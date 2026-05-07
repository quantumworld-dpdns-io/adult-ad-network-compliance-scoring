import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from './index';
import { publishers } from './schema';

describe('Identity Service', () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  } as any;

  const mockAuditLogService = {
    appendEntry: vi.fn(),
  } as any;

  let app: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp(mockDb, mockAuditLogService);
  });

  describe('POST /v1/publishers', () => {
    it('should register a new publisher successfully', async () => {
      const payload = {
        domain: 'https://example.com',
        contactEmail: 'contact@example.com',
        categories: ['adult', 'video'],
        ageGateMethod: 'crawler',
      };

      const mockPublisher = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        domain: payload.domain,
        contactEmail: payload.contactEmail,
        categories: payload.categories,
        ageGateDetails: { method: 'crawler', status: 'pending' },
        complianceScore: { overall: 0, ageGate: 0, consent: 0, contentSafety: 0, trafficQuality: 50, lastUpdated: Date.now() },
        status: 'pending_review',
        createdAt: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockPublisher]);
      mockAuditLogService.appendEntry.mockResolvedValue({});

      const response = await app.inject({
        method: 'POST',
        url: '/v1/publishers',
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toEqual(expect.objectContaining({
        id: mockPublisher.id,
        domain: payload.domain,
        contactEmail: payload.contactEmail,
      }));

      expect(mockDb.insert).toHaveBeenCalledWith(publishers);
      expect(mockAuditLogService.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'PUBLISHER_REGISTERED',
        affectedEntityId: mockPublisher.id,
      }));
    });

    it('should return 400 if validation fails', async () => {
      const payload = {
        domain: 'invalid-url',
        contactEmail: 'not-an-email',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/v1/publishers',
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toHaveProperty('error', 'Validation failed');
    });
  });
});
