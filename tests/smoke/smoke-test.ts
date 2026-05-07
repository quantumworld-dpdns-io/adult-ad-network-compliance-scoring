import { expect, test } from 'vitest';
import axios from 'axios';

const IDENTITY_URL = process.env.IDENTITY_URL || 'http://localhost:3000';
const AD_SERVER_URL = process.env.AD_SERVER_URL || 'http://localhost:3001';
const AUDIT_LOG_URL = process.env.AUDIT_LOG_URL || 'http://localhost:3004';

test('Smoke Test: Full Publisher Lifecycle', async () => {
  // 1. Register Publisher
  const registrationResponse = await axios.post(`${IDENTITY_URL}/v1/publishers`, {
    domain: 'https://test-publisher.com',
    contactEmail: 'admin@test-publisher.com',
    categories: ['entertainment'],
    ageGateMethod: 'crawler',
  });
  expect(registrationResponse.status).toBe(201);
  const publisher = registrationResponse.data;
  expect(publisher.id).toBeDefined();

  // 2. Verify Score Initialized
  const scoreResponse = await axios.get(`${IDENTITY_URL}/v1/publishers/${publisher.id}/score`);
  expect(scoreResponse.status).toBe(200);
  expect(scoreResponse.data.overall).toBeDefined();

  // 3. Simulate Ad Request
  const adResponse = await axios.post(`${AD_SERVER_URL}/v1/ad-request`, {
    publisherId: publisher.id,
    userAgent: 'Mozilla/5.0',
    ip: '1.1.1.1',
  });
  // Ad Server might return 204 or 403 if score is too low initially, but we check if it responds
  expect([200, 204, 403]).toContain(adResponse.status);

  // 4. Check Audit Log for Verification
  const verifyResponse = await axios.get(`${AUDIT_LOG_URL}/v1/audit-log/verify`);
  expect(verifyResponse.status).toBe(200);
  expect(verifyResponse.data.isValid).toBe(true);

  // 5. Query Audit Log for the registration entry
  const logResponse = await axios.get(`${AUDIT_LOG_URL}/v1/audit-log`);
  expect(logResponse.status).toBe(200);
  const entries = logResponse.data.entries;
  const registrationEntry = entries.find((e: any) => e.affectedEntityId === publisher.id && e.eventType === 'PUBLISHER_REGISTERED');
  expect(registrationEntry).toBeDefined();
});
