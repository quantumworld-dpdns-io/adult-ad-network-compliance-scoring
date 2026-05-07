# Implementation Tasks

This checklist tracks the implementation phases for the Adult Ad Network with Compliance Scoring project.

## Phase 0 — Foundation (Weeks 1–2)
- [x] Initialize monorepo structure (`packages/` for each service)
- [x] Configure TypeScript, ESLint, Prettier, Vitest
- [x] Set up Docker Compose for local development (Postgres, Redis, Kafka, ClickHouse)
- [x] Define shared domain types and Zod schemas
- [x] Implement `AuditLog` service (append-only, hash-chain, PostgreSQL-backed)
- [ ] Implement `ComplianceScore` parser/serializer with round-trip property tests
- [ ] Database migrations (Flyway or Drizzle ORM)
- [ ] CI pipeline: lint → type-check → unit tests → integration tests

## Phase 1 — Publisher Onboarding and Scoring Engine (Weeks 3–5)
- [ ] Publisher registration API (POST `/v1/publishers`)
- [ ] Scoring Engine service implementation (Weighted aggregate formula)
- [ ] Score API (GET `/v1/publishers/:id/score`)
- [ ] Auto-suspension when score drops below 40
- [ ] Publisher credential issuance on approval

## Phase 2 — Age-Gate Verification (Weeks 6–7)
- [ ] Crawler-based verifier implementation
- [ ] Screenshot + manual review workflow
- [ ] Third-party Verifiable Credential integration
- [ ] Signed attestation issuance (Ed25519)
- [ ] Expiry scheduler and expired/revoked VC handling

## Phase 3 — Consent Record Management (Weeks 8–9)
- [ ] Consent Record submission API (POST `/v1/publishers/:id/consent-records`)
- [ ] Expiry notification scheduler
- [ ] Expiry enforcement mechanisms
- [ ] Dispute workflow
- [ ] Advertiser targeting condition: minimum Consent_Record_Status

## Phase 4 — Traffic Quality Scoring and Fraud Detection (Weeks 10–12)
- [ ] Impression evaluation pipeline (Kafka consumer, IP lookup, CTR anomalies)
- [ ] Discard logic for fraudulent traffic
- [ ] Rolling 30-day Traffic_Quality_Score computation in ClickHouse
- [ ] Publisher suspension for low traffic quality
- [ ] Traffic Attestation generation
- [ ] Attestation retrieval API

## Phase 5 — Campaign Management and Ad Serving (Weeks 13–16)
- [ ] Campaign CRUD API with targeting rule validation
- [ ] Ad Server hot path (Score lookup, eligible campaign selection)
- [ ] Fail-closed implementation
- [ ] Real-time compliance enforcement (Kafka consumer for score changes)

## Phase 6 — Affiliate Tracking and Settlement (Weeks 17–19)
- [ ] Affiliate management API
- [ ] Conversion attribution pipeline
- [ ] Settlement Report generation and storage
- [ ] On-chain settlement smart contracts (optional)

## Phase 7 — Web3 Attestation Anchoring (Weeks 20–21)
- [ ] Merkle tree builder for Traffic Attestation batches
- [ ] On-chain anchor worker
- [ ] Merkle proof API
- [ ] JSON-LD Verifiable Credential export
- [ ] AuditLog hash-chain checkpoint anchoring

## Phase 8 — Dashboards and Notifications (Weeks 22–24)
- [ ] Advertiser Dashboard (campaign metrics, publisher scores)
- [ ] Publisher Dashboard (compliance scores, trends, remediation)
- [ ] Notification system (email + in-platform alerts)

## Phase 9 — Hardening, Performance, and Launch Readiness (Weeks 25–26)
- [ ] Load testing and chaos testing
- [ ] AuditLog hash-chain integrity verification endpoint
- [ ] Security audit and data retention policies
- [ ] Runbook documentation
- [ ] Staging environment smoke tests
