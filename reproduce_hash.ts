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

const contents = [
    // 1. Original
    JSON.stringify({
        eventType: newEntry.eventType,
        actorId: newEntry.actorId,
        affectedEntityId: newEntry.affectedEntityId,
        beforeState: newEntry.beforeState,
        afterState: newEntry.afterState,
        occurredAt: newEntry.occurredAt.toISOString(),
    }),
    // 2. Without .toISOString() (JSON.stringify does it anyway)
    JSON.stringify({
        eventType: newEntry.eventType,
        actorId: newEntry.actorId,
        affectedEntityId: newEntry.affectedEntityId,
        beforeState: newEntry.beforeState,
        afterState: newEntry.afterState,
        occurredAt: newEntry.occurredAt,
    }),
    // 3. Different order?
    JSON.stringify({
        actorId: newEntry.actorId,
        affectedEntityId: newEntry.affectedEntityId,
        afterState: newEntry.afterState,
        beforeState: newEntry.beforeState,
        eventType: newEntry.eventType,
        occurredAt: newEntry.occurredAt.toISOString(),
    }),
    // 4. Maybe actorId/affectedEntityId are missing?
    JSON.stringify({
        eventType: newEntry.eventType,
        beforeState: newEntry.beforeState,
        afterState: newEntry.afterState,
        occurredAt: newEntry.occurredAt.toISOString(),
    }),
];

contents.forEach((content, i) => {
    console.log(`Hash ${i+1}:`, calculateHash(content, 'previous-hash'));
});

// Try with null prevHash
console.log(`Hash (prevHash=null):`, calculateHash(contents[0], null));
