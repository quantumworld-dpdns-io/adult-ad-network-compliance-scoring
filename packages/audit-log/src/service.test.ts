import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogService } from './service.js';
import { calculateHash } from './crypto.js';

describe('AuditLogService', () => {
  let dbMock: any;
  let service: AuditLogService;

  beforeEach(() => {
    dbMock = {
      transaction: vi.fn(),
      select: vi.fn(),
      from: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      insert: vi.fn(),
      returning: vi.fn(),
    };
    service = new AuditLogService(dbMock);
  });

  describe('appendEntry', () => {
    it('should append an entry with a correct hash chain', async () => {
      const lastEntry = { entryHash: 'previous-hash' };
      const newEntry = {
        eventType: 'TEST_EVENT',
        actorId: '00000000-0000-0000-0000-000000000001',
        affectedEntityId: '00000000-0000-0000-0000-000000000002',
        beforeState: { a: 1 },
        afterState: { a: 2 },
        occurredAt: new Date('2024-01-01T00:00:00Z'),
      };

      const txMock = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => ({
          then: vi.fn().mockResolvedValue([lastEntry]),
        })),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ ...newEntry, entryHash: 'new-hash', prevEntryHash: 'previous-hash', sequence: 1n }]),
      };

      dbMock.transaction.mockImplementation(async (cb: any) => cb(txMock));

      const result = await service.appendEntry(newEntry);

      expect(txMock.select).toHaveBeenCalled();
      expect(txMock.insert).toHaveBeenCalled();
      expect(result.prevEntryHash).toBe('previous-hash');
      
      // Verify hash calculation (indirectly by checking what was passed to values)
      const valuesCall = txMock.values.mock.calls[0][0];
      const expectedContent = JSON.stringify({
        eventType: newEntry.eventType,
        actorId: newEntry.actorId,
        affectedEntityId: newEntry.affectedEntityId,
        beforeState: newEntry.beforeState,
        afterState: newEntry.afterState,
        occurredAt: newEntry.occurredAt.toISOString(),
      });
      const expectedHash = calculateHash(expectedContent, 'previous-hash');
      expect(valuesCall.entryHash).toBe(expectedHash);
    });
  });

  describe('verifyChain', () => {
    it('should return isValid: true for a valid chain', async () => {
      const entries = [
        {
          sequence: 1n,
          eventType: 'E1',
          occurredAt: new Date('2024-01-01T00:00:00Z'),
          prevEntryHash: null,
        },
        {
          sequence: 2n,
          eventType: 'E2',
          occurredAt: new Date('2024-01-01T00:01:00Z'),
          prevEntryHash: null, // will be set below
        },
      ];

      // Set hashes
      (entries[0] as any).entryHash = calculateHash(
        JSON.stringify({
          eventType: entries[0].eventType,
          occurredAt: entries[0].occurredAt.toISOString(),
        }),
        null
      );
      (entries[1] as any).prevEntryHash = entries[0].entryHash;
      (entries[1] as any).entryHash = calculateHash(
        JSON.stringify({
          eventType: entries[1].eventType,
          occurredAt: entries[1].occurredAt.toISOString(),
        }),
        entries[1].prevEntryHash
      );

      dbMock.select.mockReturnThis();
      dbMock.from.mockReturnThis();
      dbMock.orderBy.mockResolvedValue(entries);

      const result = await service.verifyChain();
      expect(result.isValid).toBe(true);
    });

    it('should return isValid: false if a hash is tampered', async () => {
        const entries = [
          {
            sequence: 1n,
            eventType: 'E1',
            occurredAt: new Date('2024-01-01T00:00:00Z'),
            prevEntryHash: null,
          },
        ];
  
        (entries[0] as any).entryHash = 'wrong-hash';
  
        dbMock.select.mockReturnThis();
        dbMock.from.mockReturnThis();
        dbMock.orderBy.mockResolvedValue(entries);
  
        const result = await service.verifyChain();
        expect(result.isValid).toBe(false);
        expect(result.errorIndex).toBe(0);
      });
  });
});
