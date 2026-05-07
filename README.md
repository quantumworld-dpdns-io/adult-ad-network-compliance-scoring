# adult-ad-network-compliance-scoring

> Adult ad network with compliance scoring – verifies age-gate and consent-compliant inventory for brand-safe advertising

## Overview

This repository is part of the [quantumworld-dpdns-io](https://github.com/quantumworld-dpdns-io) Wild SaaS & Tech Development initiative.

## Project Structure

This project is organized as a monorepo using NPM workspaces:

```
.
├── packages/
│   ├── ad-server/          # Real-time ad selection and serving
│   ├── age-gate-verifier/  # Crawler, screenshot, and VC verification
│   ├── affiliate-tracker/  # Affiliate links, conversion attribution
│   ├── audit-log/          # Append-only hash-chained ledger
│   ├── campaign-manager/   # Campaign CRUD, targeting rule validation
│   ├── consent-manager/    # Consent record lifecycle
│   ├── dashboard-api/      # Aggregated read APIs for dashboards
│   ├── fraud-detector/     # Per-impression fraud probability scoring
│   ├── identity/           # Advertiser/Publisher auth and credentials
│   ├── notification/       # Email and in-platform alert delivery
│   ├── scoring-engine/     # Compliance_Score and Traffic_Quality_Score computation
│   ├── settlement/         # Settlement report generation and export
│   ├── shared/             # Shared types, schemas, and utilities
│   └── web3-anchor/        # Merkle tree, on-chain anchoring, VC export
├── docs/                   # Architecture decisions, API specs, tasks
├── .github/                # CI/CD pipelines
└── docker-compose.yml      # Local development infrastructure
```

## Features

- **Compliance Scoring**: Multi-dimensional scoring (0-100) based on age gates, consent, content safety, and traffic quality.
- **Fail-Closed Ad Serving**: Ad server rejects requests if compliance cannot be verified in real-time.
- **Immutable Audit Trail**: All critical events recorded in a hash-chained, append-only ledger.
- **Fraud Detection**: Real-time evaluation of impressions for bot patterns and CTR anomalies.
- **Traffic Attestations**: Ed25519-signed attestations for every valid impression, anchored in Merkle trees.
- **Web3 Primaries**: On-chain anchoring of attestations and settlement reports (EVM-compatible).
- **Affiliate Tracking**: Robust attribution pipeline with fraud-aware commission calculation.

## Getting Started

### Prerequisites

- Node.js (v20+)
- Docker and Docker Compose

### Installation

```bash
# Clone the repo
git clone https://github.com/quantumworld-dpdns-io/adult-ad-network-compliance-scoring.git
cd adult-ad-network-compliance-scoring

# Install dependencies
npm install
```

### Development Environment

The project uses Docker Compose to manage local infrastructure (PostgreSQL, Redis, Kafka, ClickHouse).

```bash
# Setup environment variables
cp .env.example .env

# Start infrastructure
docker-compose up -d

# Run all tests
npm test
```

## Documentation

- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [System Design](docs/design.md)
- [Implementation Tasks](docs/tasks.md)

## Contributing

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) before opening a pull request.

## License

[MIT](LICENSE)
