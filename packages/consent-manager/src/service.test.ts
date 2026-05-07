import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addConsentRecord, updateConsentStatus, checkExpirations, calculateConsentScore } from './service';
import { consentRecords } from './schema';

// Mock dependencies
const { mockDb, mockSend } = vi.hoisted(() => {
  const mDb: any = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
  };

  mDb.select.mockReturnValue(mDb);
  mDb.from.mockReturnValue(mDb);
  mDb.where.mockReturnValue(mDb);
  mDb.insert.mockReturnValue(mDb);
  mDb.values.mockReturnValue(mDb);
  mDb.update.mockReturnValue(mDb);
  mDb.set.mockReturnValue(mDb);
  mDb.returning.mockReturnValue(mDb);
  
  mDb.then = vi.fn().mockImplementation(function(this: any, onfulfilled: any) {
    return Promise.resolve(this._results || []).then(onfulfilled);
  });

  return {
    mockDb: mDb,
    mockSend: vi.fn(),
  };
});

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({})),
}));

vi.mock('kafkajs', () => ({
  Kafka: vi.fn(() => ({
    producer: vi.fn(() => ({
      connect: vi.fn(),
      send: mockSend,
    })),
  })),
}));

describe('Consent Manager Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to return mDb for chaining
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.insert.mockReturnValue(mockDb);
    mockDb.values.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    mockDb.returning.mockReturnValue(mockDb);
  });

  describe('calculateConsentScore', () => {
    it('should return 100 if there are active records', async () => {
      mockDb._results = [{ id: '1', status: 'active' }];

      const score = await calculateConsentScore('pub1');
      expect(score).toBe(100);
    });

    it('should return 0 if there are no active records', async () => {
      mockDb._results = [];

      const score = await calculateConsentScore('pub1');
      expect(score).toBe(0);
    });
  });

  describe('addConsentRecord', () => {
    it('should add a record and publish an update', async () => {
      const mockRecord = { id: '1', publisherId: 'pub1', status: 'active' };
      mockDb._results = [mockRecord];

      const record = await addConsentRecord('pub1', 'adult', 'a'.repeat(64));
      
      expect(record).toEqual(mockRecord);
      expect(mockDb.insert).toHaveBeenCalledWith(consentRecords);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        topic: 'CONSENT_UPDATED',
        messages: expect.arrayContaining([
          expect.objectContaining({
            key: 'pub1',
            value: expect.stringContaining('"score":100'),
          }),
        ]),
      }));
    });
  });

  describe('updateConsentStatus', () => {
    it('should update status and publish update', async () => {
      const mockRecord = { id: '1', publisherId: 'pub1', status: 'disputed' };
      // First call (update) should return mockRecord, second (calculateScore) should return []
      mockDb.returning.mockResolvedValueOnce([mockRecord]);
      mockDb._results = [];

      const record = await updateConsentStatus('1', 'disputed');
      
      expect(record.status).toBe('disputed');
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        topic: 'CONSENT_UPDATED',
        messages: expect.arrayContaining([
          expect.objectContaining({
            value: expect.stringContaining('"score":0'),
          }),
        ]),
      }));
    });
  });

  describe('checkExpirations', () => {
    it('should expire old records and publish updates', async () => {
      const expiredRecord = { id: '1', publisherId: 'pub1', status: 'expired' };
      mockDb.returning.mockResolvedValueOnce([expiredRecord]);
      mockDb._results = [];

      const expired = await checkExpirations();
      
      expect(expired).toHaveLength(1);
      expect(expired[0].status).toBe('expired');
      expect(mockSend).toHaveBeenCalled();
    });
  });
});
