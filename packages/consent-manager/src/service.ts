import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { consentRecords } from './schema';
import { eq, and, lte, or } from 'drizzle-orm';
import { Kafka } from 'kafkajs';
import { ConsentStatusSchema } from '@adult-ad-net/shared';
import { z } from 'zod';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

const kafka = new Kafka({
  clientId: 'consent-manager',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const producer = kafka.producer();

export async function initKafka() {
  await producer.connect();
}

export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

export async function calculateConsentScore(publisherId: string): Promise<number> {
  const activeRecords = await db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.publisherId, publisherId),
        eq(consentRecords.status, 'active')
      )
    );

  // Simple logic: if has active consent, score is 100, otherwise 0.
  // In a more complex system, this might depend on content categories covered.
  return activeRecords.length > 0 ? 100 : 0;
}

export async function publishConsentUpdate(publisherId: string, score: number) {
  await producer.send({
    topic: 'CONSENT_UPDATED',
    messages: [
      {
        key: publisherId,
        value: JSON.stringify({
          publisherId,
          score,
          timestamp: Date.now(),
        }),
      },
    ],
  });
}

export async function addConsentRecord(publisherId: string, contentCategory: string, documentHash: string) {
  const validFrom = new Date();
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const [record] = await db
    .insert(consentRecords)
    .values({
      publisherId,
      contentCategory,
      documentHash,
      status: 'active',
      validFrom,
      validUntil,
    })
    .returning();

  const score = await calculateConsentScore(publisherId);
  await publishConsentUpdate(publisherId, score);
  
  return record;
}

export async function updateConsentStatus(recordId: string, status: ConsentStatus) {
  const [record] = await db
    .update(consentRecords)
    .set({ status, updatedAt: new Date() })
    .where(eq(consentRecords.id, recordId))
    .returning();

  if (record) {
    const score = await calculateConsentScore(record.publisherId);
    await publishConsentUpdate(record.publisherId, score);
  }

  return record;
}

export async function checkExpirations() {
  const now = new Date();

  const expiredRecords = await db
    .update(consentRecords)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        eq(consentRecords.status, 'active'),
        or(
          lte(consentRecords.validUntil, now),
          lte(consentRecords.validFrom, new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000))
        )
      )
    )
    .returning();

  const publisherIds = [...new Set(expiredRecords.map(r => r.publisherId))];
  
  for (const publisherId of publisherIds) {
    const score = await calculateConsentScore(publisherId);
    await publishConsentUpdate(publisherId, score);
  }

  return expiredRecords;
}
