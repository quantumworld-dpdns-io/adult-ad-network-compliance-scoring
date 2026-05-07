import { createHash } from 'node:crypto';

function calculateHash(content: string, prevHash: string | null): string {
  const data = content + (prevHash || '');
  return createHash('sha256').update(data).digest('hex');
}

const newEntry = {
  eventType: 'TEST_EVENT',
  actorId: '00000000-0000-0000-0000-000000000001',
  affectedEntityId: '00000000-0000-0000-0000-000000000002',
  beforeState: { a: 1 },
  afterState: { a: 2 },
  occurredAt: new Date('2024-01-01T00:00:00Z'),
};

const expectedContent = JSON.stringify({
  eventType: newEntry.eventType,
  actorId: newEntry.actorId,
  affectedEntityId: newEntry.affectedEntityId,
  beforeState: newEntry.beforeState,
  afterState: newEntry.afterState,
  occurredAt: newEntry.occurredAt.toISOString(),
});

console.log('Expected Hash (all fields):', calculateHash(expectedContent, 'previous-hash'));

const contentNoIds = JSON.stringify({
  eventType: newEntry.eventType,
  beforeState: newEntry.beforeState,
  afterState: newEntry.afterState,
  occurredAt: newEntry.occurredAt.toISOString(),
});
console.log('Hash (no actorId/affectedEntityId):', calculateHash(contentNoIds, 'previous-hash'));

const contentOnlyEventAndDate = JSON.stringify({
  eventType: newEntry.eventType,
  occurredAt: newEntry.occurredAt.toISOString(),
});
console.log('Hash (only eventType and occurredAt):', calculateHash(contentOnlyEventAndDate, 'previous-hash'));

const contentWithNulls = JSON.stringify({
  eventType: newEntry.eventType,
  actorId: newEntry.actorId,
  affectedEntityId: newEntry.affectedEntityId,
  beforeState: newEntry.beforeState,
  afterState: newEntry.afterState,
  occurredAt: newEntry.occurredAt.toISOString(),
});
// wait, that's the same as the first one.

