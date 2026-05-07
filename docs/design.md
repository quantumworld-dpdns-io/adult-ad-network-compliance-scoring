# System Design: Adult Ad Network with Compliance Scoring

This document outlines the system architecture, domain models, and data storage strategy for the Adult Ad Network with Compliance Scoring platform.

## 1. Architecture Overview

The platform is composed of six bounded services that communicate over internal APIs and an event bus. Each service owns its data store and exposes a versioned REST/gRPC interface.

```text
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

## 2. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Primary language | TypeScript (Node.js) | Strong typing, large ecosystem, good async I/O for ad serving |
| Ad Server hot path | Rust (optional) | Zero-cost abstractions, predictable latency for p99 < 100ms |
| API framework | Fastify (Node) / Axum (Rust) | Low overhead, schema validation built-in |
| Primary database | PostgreSQL 16 | ACID, JSONB for flexible payloads, row-level security |
| Cache / score store | Redis 7 | Sub-millisecond score lookups for ad serving hot path |
| Event bus | Apache Kafka | Durable, ordered event log; replay capability |
| Search / analytics | ClickHouse | Column-store for impression analytics and rolling aggregates |
| Object storage | S3-compatible | Settlement report exports, attestation archives |
| Blockchain (optional) | EVM-compatible | Low gas fees, EVM tooling maturity |
| Smart contracts | Solidity + Hardhat | Industry standard for EVM settlement contracts |
| Verifiable Credentials | W3C VC Data Model 2.0 | Standard for Traffic Attestation export |

## 3. Data Storage Strategy

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

## 4. Domain Model

### Core Entities

- **Publisher**: Represents an adult platform showing ads. Holds domain, contact, categories, and compliance score.
- **ComplianceScore**: Computed aggregate score (0-100) based on age gate quality, consent records, content safety, and traffic quality. Cached in Redis.
- **AgeGateVerification**: Tracks verification method (crawler/screenshot/VC) and status.
- **ConsentRecord**: Hash representation of a submitted consent document, its validity and status.
- **Advertiser & Campaign**: An advertiser funds campaigns containing creatives and specific targeting rules (min scores, required age gates, etc.).
- **Impression & TrafficAttestation**: An ad view event. When valid, generates a cryptographic attestation of compliance at the time of serve.
- **AuditLogEntry**: Monotonically sequenced, hash-chained ledger entry for all critical system events.
- **SettlementReport**: Aggregated billing metrics for campaigns over a period.
