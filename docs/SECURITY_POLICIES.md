# Security Policies: Adult Ad Network Compliance Scoring

This document details the security protocols, data handling policies, and cryptographic standards enforced across the platform.

## 1. Data Retention Policy

The platform adheres to strict data retention schedules to balance operational requirements with data privacy and storage efficiency.

| Data Type | Retention Period | Rationale |
|---|---|---|
| **Audit Logs** | 36 Months | Legal compliance and dispute resolution. |
| **Impression Data** | 12 Months (Hot) / 36 Months (Cold) | Billing verification and fraud analysis. |
| **Settlement Reports** | 36 Months | Financial auditing and tax requirements. |
| **Traffic Attestations** | 24 Months | Verification window for advertisers. |
| **Publisher/Advertiser PII** | Duration of contract + 5 years | Regulatory compliance (KYC/AML). |

### Archival Process
Data older than the "Hot" retention period is moved to S3-compatible cold storage (e.g., Glacier) before permanent deletion at the end of the total retention period.

---

## 2. Data Minimization Strategy

To reduce the risk of sensitive data exposure, the platform employs a "Hash-First" strategy.

- **Consent Records**: Raw consent documents (ID scans, legal forms) are processed locally by the publisher or a trusted third-party. The platform stores only the **SHA-256 hash** of the document and the associated metadata (expiry, category).
- **Traffic Attestations**: Attestations do not contain end-user IP addresses or PII. They only contain compliance scores, timestamps, and campaign IDs.
- **Aggregated Analytics**: Impression-level data is aggregated into rolling windows within ClickHouse, reducing the need to query raw event logs for standard dashboarding.

---

## 3. Secrets Management

The platform utilizes a multi-tiered secrets management approach.

### Cryptographic Keys (Ed25519)
- **Usage**: Used for signing Traffic Attestations and Audit Log checkpoints.
- **Storage**: Private keys are never stored in the application database or source code. They are retrieved from a secure Secrets Manager (e.g., AWS Secrets Manager, HashiCorp Vault) at runtime.
- **Rotation**: Signing keys are rotated every 90 days. Old public keys are archived to allow verification of historical attestations.

### API Credentials
- **JWT**: Authentication uses short-lived JWT access tokens (15 minutes) and longer-lived refresh tokens (7 days).
- **Service-to-Service**: Internal communication between microservices is secured via mTLS or VPC-restricted internal load balancers.

---

## 4. Input Validation and Rate Limiting

### Input Validation
- **Schema-First**: All API endpoints use **Zod** schemas to validate incoming JSON payloads. Invalid requests are rejected with a `400 Bad Request` before reaching the business logic.
- **Strict Typing**: The system enforces strict TypeScript types and Zod schemas across the monorepo to prevent type-injection attacks.

### Rate Limiting Strategy
To protect against DDoS and brute-force attacks, the following limits are enforced at the API Gateway:

- **Ad Serving Endpoint (`/v1/ad-request`)**: Rate-limited per Publisher ID based on their historical traffic volume + a 20% burst margin.
- **Public API Endpoints**: 100 requests per minute per IP address.
- **Authenticated Endpoints**: 1,000 requests per minute per User ID.
- **Authentication (Login/Refresh)**: 5 requests per minute per IP to prevent credential stuffing.

---

## 5. Compliance Enforcement (Fail-Closed)

The system is designed with a **fail-closed** architecture. If any security or compliance check fails or times out:

1. The ad request is immediately rejected (no-fill).
2. A `COMPLIANCE_TIMEOUT` or `SECURITY_REJECTION` event is logged to the Audit Log.
3. No billing event is generated, ensuring advertisers never pay for unverified traffic.
