import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from './app.js';
import { AuditLogService } from './service.js';

describe('AuditLog App', () => {
  let serviceMock: any;
  let app: any;

  beforeEach(() => {
    serviceMock = {
      verifyChain: vi.fn(),
      listEntries: vi.fn(),
    };
    app = buildApp(serviceMock as unknown as AuditLogService);
  });

  describe('GET /v1/audit-log/verify', () => {
    it('should return 200 and verification result', async () => {
      const mockResult = { isValid: true, totalEntries: 0, discrepancies: [] };
      serviceMock.verifyChain.mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/audit-log/verify',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockResult);
    });

    it('should return 500 if service fails', async () => {
      serviceMock.verifyChain.mockRejectedValue(new Error('DB Error'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/audit-log/verify',
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /v1/audit-log', () => {
    it('should return 200 and list of entries', async () => {
      const mockEntries = [
        {
          id: 'uuid-1',
          sequence: 1n,
          eventType: 'TEST',
          occurredAt: new Date(),
          entryHash: 'hash',
          prevEntryHash: null,
        },
      ];
      serviceMock.listEntries.mockResolvedValue(mockEntries);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/audit-log',
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.entries).toHaveLength(1);
      expect(payload.entries[0].sequence).toBe('1');
    });
  });
});
