import { desc, eq, sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { auditLogs, type AuditLogEntry, type NewAuditLogEntry } from './schema.js';
import { calculateHash } from './crypto.js';

export class AuditLogService {
  constructor(private db: NodePgDatabase<any>) {}

  private canonicalize(entry: Partial<AuditLogEntry>): string {
    return JSON.stringify({
      eventType: entry.eventType,
      actorId: entry.actorId,
      affectedEntityId: entry.affectedEntityId,
      beforeState: entry.beforeState,
      afterState: entry.afterState,
      occurredAt: entry.occurredAt instanceof Date ? entry.occurredAt.toISOString() : entry.occurredAt,
    });
  }

  async appendEntry(
    entry: Omit<NewAuditLogEntry, 'entryHash' | 'prevEntryHash' | 'sequence'>
  ): Promise<AuditLogEntry> {
    return await this.db.transaction(async (tx) => {
      // 1. Retrieve the entry_hash of the last entry
      const lastEntry = await tx
        .select({ entryHash: auditLogs.entryHash })
        .from(auditLogs)
        .orderBy(desc(auditLogs.sequence))
        .limit(1)
        .then((rows) => rows[0]);

      const prevEntryHash = lastEntry?.entryHash ?? null;

      // Prepare entry with occurredAt for hashing
      const entryToHash = {
        ...entry,
        occurredAt: entry.occurredAt ?? new Date(),
      };

      // 2. Compute the new entry_hash
      const content = this.canonicalize(entryToHash);
      const entryHash = calculateHash(content, prevEntryHash);

      // 3. Insert the new entry
      const [inserted] = await tx
        .insert(auditLogs)
        .values({
          ...entryToHash,
          entryHash,
          prevEntryHash,
        })
        .returning();

      return inserted;
    });
  }

  async listEntries(limit = 50, offset = 0): Promise<AuditLogEntry[]> {
    return await this.db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.sequence))
      .limit(limit)
      .offset(offset);
  }

  async getLatestHash(): Promise<string | null> {
    const lastEntry = await this.db
      .select({ entryHash: auditLogs.entryHash })
      .from(auditLogs)
      .orderBy(desc(auditLogs.sequence))
      .limit(1)
      .then((rows) => rows[0]);

    return lastEntry?.entryHash ?? null;
  }

  async verifyChain(): Promise<{
    isValid: boolean;
    totalEntries: number;
    discrepancies: Array<{
      sequence: string;
      id: string;
      type: 'HASH_MISMATCH' | 'PREV_HASH_MISMATCH';
      expectedHash?: string;
      actualHash?: string;
      expectedPrevHash?: string;
      actualPrevHash?: string;
    }>;
  }> {
    const allEntries = await this.db
      .select()
      .from(auditLogs)
      .orderBy(auditLogs.sequence);

    const discrepancies: any[] = [];
    let prevHash: string | null = null;

    for (let i = 0; i < allEntries.length; i++) {
      const entry = allEntries[i];

      // Check prevEntryHash matches
      if (entry.prevEntryHash !== prevHash) {
        discrepancies.push({
          sequence: entry.sequence.toString(),
          id: entry.id,
          type: 'PREV_HASH_MISMATCH',
          expectedPrevHash: prevHash,
          actualPrevHash: entry.prevEntryHash,
        });
      }

      // Recompute hash
      const content = this.canonicalize(entry);
      const expectedHash = calculateHash(content, prevHash);

      if (entry.entryHash !== expectedHash) {
        discrepancies.push({
          sequence: entry.sequence.toString(),
          id: entry.id,
          type: 'HASH_MISMATCH',
          expectedHash,
          actualHash: entry.entryHash,
        });
      }

      prevHash = entry.entryHash;
    }

    return {
      isValid: discrepancies.length === 0,
      totalEntries: allEntries.length,
      discrepancies,
    };
  }
}
