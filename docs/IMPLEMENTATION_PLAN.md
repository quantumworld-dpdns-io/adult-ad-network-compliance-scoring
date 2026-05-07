# Implementation Plan: Adult Ad Network with Compliance Scoring

> **Version:** 1.0  
> **Date:** 2026-05-07  
> **Status:** Draft

---

## Overview

This document is the detailed implementation plan for the Adult Ad Network with Compliance Scoring platform. The system connects legal adult advertisers with publishers while enforcing multi-dimensional compliance at every layer: age-gate quality, consent-record status, content-category safety, and traffic authenticity. Campaign settlement is transparent and traffic attestations are cryptographically verifiable, with optional on-chain anchoring.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Domain Model](#3-domain-model)
4. [Implementation Phases](#4-implementation-phases)
5. [Module Breakdown](#5-module-breakdown)
6. [API Design Summary](#6-api-design-summary)
7. [Data Storage Strategy](#7-data-storage-strategy)
8. [Security and Compliance Considerations](#8-security-and-compliance-considerations)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment and Infrastructure](#10-deployment-and-infrastructure)
11. [Milestones and Timeline](#11-milestones-and-timeline)
12. [Open Questions and Risks](#12-open-questions-and-risks)

---

## 1. Architecture Overview

The platform is composed of six bounded services that communicate over internal APIs and an event bus. Each service owns its data store and exposes a versioned REST/gRPC interface.

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway / CDN                        │
└────────┬──────────┬──────────┬──────────┬──────────┬───────────┘
         │          │          │          │          │
   ┌─────▼──┐ ┌─────▼──┐ ┌────▼───┐ ┌────▼───┐ ┌───▼────┐
   │Identity│ │Ad      │ │Scoring │ │Audit   │ │Settle- │
   │& Auth  │ │Server  │ │Engine  │ │Log     │ │ment    │
   └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
         │          │          │          │          │
         └──────────┴──────────┴──────────┴──────────┘
                          Event Bus
                    (Publisher events, Score
                     changes, Fraud signals)
                               │
                    ┌──────────▼──────────┐
                    │  Web3 Anchor Worker  │
                    │  (Merkle + on-chain) │
                    └─────────────────────┘
```

### Key Design Principles

- **Fail-closed compliance**: if a compliance check cannot complete within its SLA, the ad request is rejected rather than served.
- **Append-only audit trail**: the Audit Log is a hash-chained ledger; no entry is ever mutated or deleted.
- **Score-at-serve**: compliance scores are snapshotted at the exact moment of each impression and embedded in the Traffic Attestation.
- **Optional Web3 layer**: on-chain anchoring is an opt-in Campaign feature; the core platform operates without blockchain dependencies.

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Primary language | TypeScript (Node.js) | Strong typing, large ecosystem, good async I/O for ad serving |
| Ad Server hot path | Rust (optional, for p99 < 100ms target) | Zero-cost abstractions, predictable latency |
| API framework | Fastify (Node) / Axum (Rust) | Low overhead, schema validation built-in |
| Primary database | PostgreSQL 16 | ACID, JSONB for flexible payloads, row-level security |
| Cache / score store | Redis 7 | Sub-millisecond score lookups for ad serving hot path |
| Event bus | Apache Kafka | Durable, ordered event log; replay capability |
| Search / analytics | ClickHouse | Column-store for impression analytics and rolling aggregates |
| Object storage | S3-compatible (e.g., AWS S3) | Settlement report exports, attestation archives |
| Blockchain (optional) | EVM-compatible (e.g., Polygon) | Low gas fees, EVM tooling maturity |
| Smart contracts | Solidity + Hardhat | Industry standard for EVM settlement contracts |
| Verifiable Credentials | W3C VC Data Model 2.0 | Standard for Traffic Attestation export |
| Cryptographic signing | Ed25519 | Fast, compact signatures for Traffic Attestations |
| CI/CD | GitHub Actions (already configured) | Existing `.github/workflows/ci.yml` |
| Containerization | Docker + Kubernetes | Horizontal scaling for Ad Server |
| Monitoring | OpenTelemetry + Grafana | Distributed tracing, latency histograms |

---

## 3. Domain Model

### Core Entities

```
Publisher
  id: UUID
  domain_url: string
  contact: { legal_entity_name, email, phone }
  content_categories: CategoryId[]
  age_gate: AgeGateDetails
  compliance_score: ComplianceScore          ← cached in Redis
  status: pending_review | active | suspended
  created_at: timestamp

ComplianceScore
  publisher_id: UUID
  aggregate: float [0,100]
  age_gate_quality: float [0,100]
  consent_record_status: float [0,100]
  content_category_safety: float [0,100]
  traffic_quality_score: float [0,100]
  computed_at: timestamp

AgeGateVerification
  publisher_id: UUID
  method: crawler | screenshot | verifiable_credential
  status: pass | fail
  attestation_signature: bytes
  valid_until: timestamp
  audit_log_entry_id: UUID

ConsentRecord
  id: UUID
  publisher_id: UUID
  content_category: CategoryId
  document_hash: SHA256
  submitted_at: timestamp
  expires_at: timestamp   ← submitted_at + 12 months
  status: active | expired | revoked | disputed

Advertiser
  id: UUID
  account_blocked_categories: CategoryId[]
  campaigns: Campaign[]

Campaign
  id: UUID
  advertiser_id: UUID
  name: string
  creatives: Creative[]
  daily_budget: decimal
  total_budget: decimal
  start_date: date
  end_date: date
  targeting_rules: TargetingRules
  billing_period: daily | weekly | monthly
  on_chain_settlement: boolean
  on_chain_attestation: boolean
  status: draft | active | paused | terminated

TargetingRules
  min_compliance_score: int [0,100]
  require_age_gate: boolean
  min_consent_record_status: int [0,100]
  blocked_categories: CategoryId[]

Impression
  id: UUID
  publisher_id: UUID
  campaign_id: UUID
  served_at: timestamp
  compliance_score_snapshot: float
  traffic_quality_score_snapshot: float
  fraud_probability: float
  status: valid | discarded
  attestation_id: UUID

TrafficAttestation
  id: UUID
  impression_id: UUID
  publisher_id: UUID
  campaign_id: UUID
  timestamp: timestamp
  compliance_score: float
  traffic_quality_score: float
  signing_key_id: string
  signature: bytes (Ed25519)
  merkle_root: bytes?        ← populated after on-chain anchoring
  on_chain_tx_hash: string?

Affiliate
  id: UUID
  tracking_identifier: string (unique)
  campaigns: AffiliateLink[]

AffiliateLink
  affiliate_id: UUID
  campaign_id: UUID
  tracking_url: string (unique)
  commission_rule: CPC | CPA | RevShare
  attribution_window_days: int [1,90]
  min_traffic_quality_threshold: int [0,100]

AuditLogEntry
  id: UUID
  sequence: bigint (monotonic)
  event_type: EventType
  actor_id: string
  affected_entity_id: string
  before_state: JSONB?
  after_state: JSONB?
  occurred_at: timestamp (ms precision)
  entry_hash: SHA256        ← hash(content + prev_entry_hash)
  prev_entry_hash: SHA256

SettlementReport
  id: UUID
  campaign_id: UUID
  billing_period_start: date
  billing_period_end: date
  total_impressions: int
  discarded_impressions: int
  valid_impressions_billed: int
  total_spend: decimal
  publisher_breakdowns: PublisherBreakdown[]
  report_hash: SHA256
  generated_at: timestamp
  on_chain_tx_hash: string?
```

---

## 4. Implementation Phases

### Phase 0 — Foundation (Weeks 1–2)

Set up the project skeleton, CI pipeline, shared libraries, and database schema.

- [ ] Initialize monorepo structure (`packages/` for each service)
- [ ] Configure TypeScript, ESLint, Prettier, Vitest
- [ ] Set up Docker Compose for local development (Postgres, Redis, Kafka, ClickHouse)
- [ ] Define shared domain types and Zod schemas
- [ ] Implement `AuditLog` service (append-only, hash-chain, PostgreSQL-backed)
- [ ] Implement `ComplianceScore` parser/serializer with round-trip property tests
- [ ] Database migrations (Flyway or Drizzle ORM)
- [ ] CI pipeline: lint → type-check → unit tests → integration tests

**Deliverable:** Running local stack, passing CI, AuditLog and ComplianceScore parser tested.

---

### Phase 1 — Publisher Onboarding and Scoring Engine (Weeks 3–5)

- [ ] Publisher registration API (POST `/v1/publishers`)
  - Field validation (domain URL, contact, categories, age-gate details)
  - Reject incomplete submissions with field-level errors
  - Write registration event to AuditLog
- [ ] Scoring Engine service
  - Weighted aggregate formula (30/30/20/20)
  - Age_Gate_Quality formula: `(present×50) + (bypass_resistance×0.40) + recency_points`
  - Consent_Record_Status: three-branch IF/THEN logic
  - Content_Category_Safety: four-tier taxonomy (low→100, medium→66, high→33, prohibited→0), minimum-wins
  - Traffic_Quality_Score integration (default 50 until 100 impressions)
  - Score clamped to [0, 100]
  - Score written to Redis on every recompute
  - Score change events published to Kafka
- [ ] Score API (GET `/v1/publishers/:id/score`) — p99 < 200ms
- [ ] Auto-suspension when score drops below 40
- [ ] Publisher credential issuance on approval

**Deliverable:** Publisher can register, receive a score, and be suspended automatically.

---

### Phase 2 — Age-Gate Verification (Weeks 6–7)

- [ ] Crawler-based verifier
  - Headless browser (Playwright) tests: direct URL, referrer spoofing, cookie manipulation
  - Any bypass = fail; result recorded in AuditLog
- [ ] Screenshot + manual review workflow
- [ ] Third-party Verifiable Credential integration (W3C VC verification)
- [ ] Signed attestation issuance (Ed25519, 90-day validity)
- [ ] Expiry scheduler: re-verify within 14 days of expiry; suspend on expiry
- [ ] Expired/revoked VC handling (treat as unverified, suspend)

**Deliverable:** All three verification methods working; age-gate score sub-component fully functional.

---

### Phase 3 — Consent Record Management (Weeks 8–9)

- [ ] Consent Record submission API (POST `/v1/publishers/:id/consent-records`)
  - Store SHA-256 hash in AuditLog; do not store raw document
  - Set expiry = submission date + 12 months
  - Block ad serving for category until record accepted
- [ ] Expiry notification scheduler (30d, 14d, 7d alerts via email + in-platform)
- [ ] Expiry enforcement: set sub-score to 0 within 60 seconds, suspend affected categories
- [ ] Dispute workflow (24h acknowledgement, 5-business-day resolution)
- [ ] Advertiser targeting condition: minimum Consent_Record_Status

**Deliverable:** Consent lifecycle fully managed; advertisers can filter by consent status.

---

### Phase 4 — Traffic Quality Scoring and Fraud Detection (Weeks 10–12)

- [ ] Impression evaluation pipeline (Kafka consumer)
  - Bot user-agent pattern matching
  - Datacenter IP range lookup
  - CTR anomaly detection (>10% over 1-hour rolling window)
  - Invalid referrer chain detection
  - Fraud probability score [0.0, 1.0] within 50ms
  - Timeout = treat as fraudulent (fail-closed)
- [ ] Discard logic: fraud_probability > 0.7 → discard, exclude from billing, log Fraud_Signal
- [ ] Rolling 30-day Traffic_Quality_Score computation in ClickHouse
  - Minimum 100 impressions floor (default 50 below threshold)
- [ ] Publisher suspension after 7 consecutive days below 30
- [ ] Traffic Attestation generation (Ed25519 signed, per valid impression)
- [ ] Attestation retrieval API (GET `/v1/attestations/:impression_id`) — p99 < 500ms

**Deliverable:** Every impression evaluated; fraudulent traffic excluded from billing; attestations generated.

---

### Phase 5 — Campaign Management and Ad Serving (Weeks 13–16)

- [ ] Campaign CRUD API
  - Required field validation with field-level errors
  - Targeting rule validation: return eligible publisher list within 3 seconds
  - Blocked-category conflict detection (exact string match)
  - Account-level vs. campaign-level blocked category override logic
- [ ] Ad Server hot path
  - Score lookup from Redis (< 30ms)
  - Eligible campaign selection (highest bid, earliest-creation tiebreak)
  - Fail-closed: no-fill if score unavailable within 30ms
  - Impression recorded in AuditLog
  - Attestation generated within 1 second
  - p99 decision latency < 100ms at 10,000 RPS
- [ ] Real-time compliance enforcement
  - Kafka consumer: score-change events → re-evaluate active campaigns → suspend within 60 seconds
  - Blocked-category re-evaluation within 5 minutes of publisher category update
  - In-flight impressions not recalled on suspension

**Deliverable:** Full ad serving loop with real-time compliance enforcement.

---

### Phase 6 — Affiliate Tracking and Settlement (Weeks 17–19)

- [ ] Affiliate management API
  - Unique tracking identifier per affiliate
  - Unique tracking link per campaign per affiliate
  - Attribution window configuration (1–90 days)
  - Minimum Traffic_Quality_Score threshold per affiliate
- [ ] Conversion attribution pipeline
  - Fraud check on originating impression
  - Duplicate deduplication by impression ID
  - Commission calculation (CPC / CPA / RevShare)
  - Affiliate dashboard (60-second update delay)
- [ ] Settlement Report generation
  - Triggered at billing period end (daily / weekly / monthly)
  - Available within 24 hours of period end
  - SHA-256 hash anchored in AuditLog within 1 hour
  - CSV and JSON export (< 30 seconds)
  - Dispute workflow (5-business-day resolution)
  - 36-month retention
- [ ] On-chain settlement (optional)
  - Smart contract deployment (EVM)
  - Settlement execution with transaction hash in AuditLog

**Deliverable:** Affiliate tracking, commission calculation, and settlement fully operational.

---

### Phase 7 — Web3 Attestation Anchoring (Weeks 20–21)

- [ ] Merkle tree builder for Traffic Attestation batches (max 10,000 per batch)
- [ ] On-chain anchor worker: Merkle root → EVM transaction within 1 hour of earliest impression
- [ ] Merkle proof API (GET `/v1/attestations/:id/proof`) — p99 < 500ms
- [ ] 404 handling for unknown or unanchored attestation IDs
- [ ] JSON-LD Verifiable Credential export (W3C VC Data Model 2.0 conformant)
- [ ] Public signing key published at `/.well-known/attestation-public-key`
- [ ] AuditLog hash-chain checkpoint anchoring (every 24 hours)
- [ ] On-chain settlement smart contract retry logic (3 retries on failure)

**Deliverable:** Full Web3 primitive layer operational; attestations independently verifiable.

---

### Phase 8 — Dashboards and Notifications (Weeks 22–24)

- [ ] Advertiser Dashboard
  - Per-campaign metrics (impressions, valid, discarded, spend, conversions, CPC) — 60-second refresh
  - Publisher compliance scores for active campaigns
  - Campaign pause / resume / terminate (with termination confirmation guard)
- [ ] Publisher Dashboard
  - Current Compliance_Score + all four sub-scores
  - 90-day daily historical trend per sub-score
  - Remediation steps when any sub-score < 70
  - Earnings, pending settlement, 12-month transaction history — 60-second refresh
- [ ] Notification system
  - Email + in-platform alerts for: consent record expiry (30d/14d/7d), score drop > 10 points in 24h, age-gate expiry, suspension events
  - Score change alert within 5 minutes

**Deliverable:** Full dashboard and notification layer; publishers can self-remediate.

---

### Phase 9 — Hardening, Performance, and Launch Readiness (Weeks 25–26)

- [ ] Load testing: Ad Server at 10,000 RPS, verify p99 < 100ms
- [ ] Chaos testing: score service unavailable → fail-closed behavior verified
- [ ] AuditLog hash-chain integrity verification endpoint
- [ ] Tamper-detection alert and write-lock on mismatch
- [ ] Security audit: input validation, rate limiting, auth/authz review
- [ ] 36-month data retention policies and archival jobs
- [ ] Runbook documentation
- [ ] Staging environment smoke tests

**Deliverable:** Production-ready platform.

---

## 5. Module Breakdown

```
packages/
├── audit-log/              # Append-only hash-chained ledger
├── scoring-engine/         # Compliance_Score and Traffic_Quality_Score computation
├── age-gate-verifier/      # Crawler, screenshot, and VC verification
├── consent-manager/        # Consent record lifecycle
├── fraud-detector/         # Per-impression fraud probability scoring
├── ad-server/              # Real-time ad selection and serving
├── campaign-manager/       # Campaign CRUD, targeting rule validation
├── affiliate-tracker/      # Affiliate links, conversion attribution
├── settlement/             # Settlement report generation and export
├── web3-anchor/            # Merkle tree, on-chain anchoring, VC export
├── notification/           # Email and in-platform alert delivery
├── dashboard-api/          # Aggregated read APIs for dashboards
├── identity/               # Advertiser/Publisher auth and credentials
└── shared/
    ├── domain-types/       # Shared TypeScript types and Zod schemas
    ├── compliance-score-codec/  # Parser/serializer with round-trip tests
    └── crypto/             # Ed25519 signing utilities
```

---

## 6. API Design Summary

All APIs are versioned under `/v1/`. Authentication uses JWT bearer tokens issued by the Identity service.

| Method | Path | Description |
|---|---|---|
| POST | `/v1/publishers` | Register a new publisher |
| GET | `/v1/publishers/:id/score` | Get current compliance score (< 200ms) |
| POST | `/v1/publishers/:id/age-gate/verify` | Trigger age-gate verification |
| POST | `/v1/publishers/:id/consent-records` | Submit a consent record |
| POST | `/v1/campaigns` | Create a campaign |
| GET | `/v1/campaigns/:id/eligible-publishers` | List eligible publishers (< 3s) |
| PATCH | `/v1/campaigns/:id/status` | Pause / resume / terminate |
| POST | `/v1/ad-request` | Ad serving endpoint (p99 < 100ms) |
| GET | `/v1/attestations/:impression_id` | Retrieve traffic attestation (< 500ms) |
| GET | `/v1/attestations/:impression_id/proof` | Merkle proof for on-chain verification |
| GET | `/v1/affiliates/:id/links` | List affiliate tracking links |
| POST | `/v1/conversions` | Record a conversion event |
| GET | `/v1/settlement-reports/:campaign_id` | Get settlement report |
| GET | `/v1/settlement-reports/:id/export` | Export as CSV or JSON |
| GET | `/v1/audit-log` | Query audit log entries |
| GET | `/v1/audit-log/verify` | Verify hash-chain integrity |
| GET | `/.well-known/attestation-public-key` | Public signing key |

---

## 7. Data Storage Strategy

| Data | Store | Rationale |
|---|---|---|
| Publisher profiles, campaigns, consent records | PostgreSQL | Relational integrity, ACID |
| Compliance scores (hot read) | Redis | Sub-millisecond lookup for ad serving |
| Impression events, rolling aggregates | ClickHouse | Column-store, fast rolling window queries |
| Audit log entries | PostgreSQL (append-only table) | ACID, hash-chain integrity |
| Traffic attestations | PostgreSQL + S3 archive | Fast lookup + long-term retention |
| Settlement reports | PostgreSQL + S3 export | Structured + file export |
| Event stream | Kafka | Durable, replayable, ordered |
| On-chain state | EVM blockchain | Immutable Merkle roots and settlement |

---

## 8. Security and Compliance Considerations

- **Authentication**: JWT with short expiry (15 min access, 7-day refresh). Role-based access control (Advertiser, Publisher, Affiliate, Compliance_Officer, Legal_Representative, Admin).
- **Input validation**: All API inputs validated with Zod schemas before processing. Parameterized queries throughout; no raw SQL string interpolation.
- **Secrets management**: Signing private keys stored in a secrets manager (e.g., AWS Secrets Manager); never logged or serialized.
- **Data minimization**: Consent record documents are never stored; only SHA-256 hashes are retained.
- **Audit log integrity**: Hash-chain prevents silent tampering; on-chain checkpoints provide external verification.
- **Fail-closed design**: Any compliance check timeout results in a no-fill response, not a served impression.
- **Rate limiting**: Ad serving endpoint rate-limited per publisher; API endpoints rate-limited per authenticated user.
- **GDPR / privacy**: Publisher contact data encrypted at rest; no personal data stored in Traffic Attestations.
- **Content safety**: The platform does not store, serve, or process explicit media. It handles only metadata, hashes, scores, and ad creatives (which must be non-explicit per platform policy).

---

## 9. Testing Strategy

### Unit Tests (Vitest)
- Scoring Engine formula correctness (all sub-score branches)
- ComplianceScore parser/serializer round-trip property
- Fraud probability score boundary conditions
- Blocked-category exact-match logic
- Affiliate commission calculation per rule type

### Property-Based Tests (fast-check)
- `ComplianceScore` round-trip: `parse(serialize(x)) ≡ x` for all valid inputs
- Score clamping: `score ∈ [0, 100]` for all input combinations
- Hash-chain integrity: appending N entries then verifying always passes
- Fraud score: `fraudProbability ∈ [0.0, 1.0]` for all impression inputs
- Traffic_Quality_Score: `tqs ∈ [0, 100]` for all discard-rate inputs

### Integration Tests
- Publisher registration → score assignment → suspension flow
- Age-gate verification → attestation issuance → expiry → suspension
- Consent record submission → expiry notification → suspension
- Campaign creation → eligible publisher list → real-time score drop → suspension
- Impression → fraud evaluation → attestation generation → Merkle anchoring
- Settlement report generation → hash anchoring → CSV/JSON export

### Performance Tests (k6)
- Ad Server: 10,000 RPS sustained, p99 < 100ms
- Score API: p99 < 200ms under concurrent load
- Attestation retrieval: p99 < 500ms

### End-to-End Tests
- Full advertiser journey: create campaign → serve impressions → view dashboard → export settlement
- Full publisher journey: register → verify age-gate → submit consent → view score → remediate

---

## 10. Deployment and Infrastructure

```
Production topology (Kubernetes):
├── ad-server (HPA: 10–100 pods, target CPU 60%)
├── scoring-engine (3 pods, Redis-backed)
├── fraud-detector (Kafka consumer group, 5 pods)
├── audit-log (2 pods, PostgreSQL primary + replica)
├── web3-anchor (1 pod, cron-triggered)
├── notification (2 pods, Kafka consumer)
├── dashboard-api (3 pods)
└── PostgreSQL (managed, multi-AZ)
    Redis (managed, cluster mode)
    Kafka (managed, 3 brokers)
    ClickHouse (managed, 2 shards)
```

- **CI/CD**: GitHub Actions (existing `ci.yml`) → build → test → Docker image → deploy to staging → smoke test → promote to production.
- **Observability**: OpenTelemetry traces on all services; Grafana dashboards for p99 latency, score computation lag, fraud discard rate, Kafka consumer lag.
- **Alerting**: PagerDuty integration for: ad server p99 > 100ms, audit log hash mismatch, on-chain anchor failure, publisher suspension spike.

---

## 11. Milestones and Timeline

| Phase | Weeks | Milestone |
|---|---|---|
| 0 — Foundation | 1–2 | Monorepo, CI, AuditLog, ComplianceScore codec |
| 1 — Publisher Onboarding + Scoring | 3–5 | Publisher registration, score computation, suspension |
| 2 — Age-Gate Verification | 6–7 | All three verification methods, attestation issuance |
| 3 — Consent Record Management | 8–9 | Consent lifecycle, expiry enforcement, dispute workflow |
| 4 — Traffic Quality + Fraud | 10–12 | Impression evaluation, fraud detection, attestations |
| 5 — Campaign + Ad Serving | 13–16 | Full ad serving loop, real-time compliance enforcement |
| 6 — Affiliate + Settlement | 17–19 | Affiliate tracking, commission, settlement reports |
| 7 — Web3 Anchoring | 20–21 | Merkle proofs, on-chain anchoring, VC export |
| 8 — Dashboards + Notifications | 22–24 | Full UI layer, alerts, remediation guidance |
| 9 — Hardening + Launch | 25–26 | Load testing, security audit, production readiness |

**Total estimated duration: 26 weeks (6.5 months)**

---

## 12. Open Questions and Risks

| # | Question / Risk | Owner | Status |
|---|---|---|---|
| 1 | Which EVM chain for on-chain settlement? (Polygon, Base, Arbitrum) — affects gas cost and finality time | Architecture | Open |
| 2 | Third-party age-gate VC providers: which providers will be supported at launch? | Product | Open |
| 3 | Content category taxonomy: who owns and maintains the predefined list? | Product / Legal | Open |
| 4 | Ad creative format support: banner only, or also video and native? | Product | Open |
| 5 | Fiat payment processing: which payment processor for advertiser billing? | Finance | Open |
| 6 | GDPR / jurisdiction: which legal jurisdictions are in scope at launch? | Legal | Open |
| 7 | Risk: Ad Server p99 < 100ms at 10,000 RPS may require Rust hot path — evaluate in Phase 5 load testing | Engineering | Monitoring |
| 8 | Risk: ClickHouse rolling aggregate latency for Traffic_Quality_Score — pre-aggregate in Kafka Streams if needed | Engineering | Monitoring |
| 9 | Risk: On-chain gas price spikes could delay Merkle anchoring — implement gas price cap with retry queue | Engineering | Open |
| 10 | Manual review SLAs (age-gate screenshots, consent disputes) require human ops team — staffing plan needed | Operations | Open |

---

*This document will be updated as open questions are resolved and implementation progresses. See `requirements.md` for the full acceptance criteria that govern each feature.*
