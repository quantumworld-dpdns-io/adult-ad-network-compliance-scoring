# Implementation Tasks

This checklist tracks the implementation phases for the Adult Ad Network with Compliance Scoring project.

## Phase 0 — Foundation (Weeks 1–2)
- [x] Initialize monorepo structure (`packages/` for each service)
- [x] Configure TypeScript, ESLint, Prettier, Vitest
- [x] Set up Docker Compose for local development (Postgres, Redis, Kafka, ClickHouse)
- [x] Define shared domain types and Zod schemas
- [x] Implement `AuditLog` service (append-only, hash-chain, PostgreSQL-backed)
- [x] Implement `ComplianceScore` parser/serializer with round-trip property tests
- [ ] Database migrations (Flyway or Drizzle ORM)
- [ ] CI pipeline: lint → type-check → unit tests → integration tests

## Phase 1 — Publisher Onboarding and Scoring Engine (Weeks 3–5)
- [x] Publisher registration API (POST `/v1/publishers`)
- [x] Scoring Engine service implementation (Weighted aggregate formula)
- [x] Score API (GET `/v1/publishers/:id/score`)
- [x] Auto-suspension when score drops below 40
- [ ] Publisher credential issuance on approval

## Phase 2 — Age-Gate Verification (Weeks 6–7)
- [x] Crawler-based verifier implementation
- [x] Screenshot + manual review workflow (Mocked)
- [x] Third-party Verifiable Credential integration
- [x] Signed attestation issuance (Ed25519)
- [x] Expiry scheduler and expired/revoked VC handling

## Phase 3 — Consent Record Management (Weeks 8–9)
- [x] Consent Record submission API (POST `/v1/publishers/:id/consent-records`)
- [x] Expiry notification scheduler
- [x] Expiry enforcement mechanisms
- [x] Dispute workflow
- [ ] Advertiser targeting condition: minimum Consent_Record_Status

## Phase 4 — Traffic Quality Scoring and Fraud Detection (Weeks 10–12)
- [x] Impression evaluation pipeline (Kafka consumer, IP lookup, CTR anomalies)
- [x] Discard logic for fraudulent traffic
- [x] Rolling 30-day Traffic_Quality_Score computation in Redis/ClickHouse
- [x] Publisher suspension for low traffic quality (via aggregate score)
- [x] Traffic Attestation generation
- [ ] Attestation retrieval API

## Phase 5 — Campaign Management and Ad Serving (Weeks 13–16)
- [x] Campaign CRUD API with targeting rule validation
- [x] Ad Server hot path (Score lookup, eligible campaign selection)
- [x] Fail-closed implementation
- [x] Real-time compliance enforcement (Kafka consumer for score changes)

## Phase 6 — Affiliate Tracking and Settlement (Weeks 17–19)
- [x] Affiliate management API
- [x] Conversion attribution pipeline
- [x] Settlement Report generation and storage
- [x] On-chain settlement smart contracts (Mocked/Optional)

## Phase 7 — Web3 Attestation Anchoring (Weeks 20–21)
- [x] Merkle tree builder for Traffic Attestation batches
- [x] On-chain anchor worker (Mocked)
- [x] Merkle proof API
- [x] JSON-LD Verifiable Credential export
- [x] AuditLog hash-chain checkpoint anchoring

## Phase 8 — Dashboards and Notifications (Weeks 22–24)
- [x] Advertiser Dashboard (campaign metrics, publisher scores)
- [x] Publisher Dashboard (compliance scores, trends, remediation)
- [x] Notification system (email + in-platform alerts)

## Phase 9 — Hardening, Performance, and Launch Readiness (Weeks 25–26)
- [ ] Load testing and chaos testing
- [ ] AuditLog hash-chain integrity verification endpoint
- [ ] Security audit and data retention policies
- [ ] Runbook documentation
- [ ] Staging environment smoke tests
