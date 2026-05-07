# Operational Runbook: Adult Ad Network Compliance Scoring

This document provides procedures for operating and maintaining the Compliance Scoring platform.

## 1. Infrastructure Management

The core infrastructure consists of PostgreSQL, Redis, Kafka, and ClickHouse, managed via Docker Compose for development and Kubernetes for production.

### Starting the Infrastructure

**Development/Staging:**
```bash
docker-compose up -d
```

**Production (Kubernetes):**
Ensure the target namespace is active and apply the manifests:
```bash
kubectl apply -f k8s/
```

### Stopping the Infrastructure

**Development/Staging:**
```bash
docker-compose down
```

**Production (Kubernetes):**
Graceful scale-down of deployments:
```bash
kubectl scale deployment --all --replicas=0
```

---

## 2. Monitoring and Health Checks

### Service Health
All services expose health check endpoints. In the Docker environment, these are monitored automatically.

- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`
- **Kafka**: `kafka-broker-api-versions.sh`
- **ClickHouse**: `wget http://localhost:8123/ping`

### Kafka Consumer Lag
Monitoring consumer lag is critical for real-time compliance enforcement.

**Manual Check:**
```bash
docker exec compliance-kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group scoring-engine-group \
  --describe
```

**Grafana:**
Monitor the "Kafka Consumer Lag" dashboard. High lag in the `scoring-engine` or `fraud-detector` groups can lead to serving impressions based on stale compliance data.

---

## 3. Incident Response: `PUBLISHER_SUSPENDED` Spike

A spike in `PUBLISHER_SUSPENDED` events occurs when multiple publishers drop below the minimum compliance threshold (default: 40) simultaneously.

### Initial Diagnostics
1. **Check External Dependencies**: Verify if a third-party Age-Gate VC provider is down or returning errors.
2. **Review Scoring Logs**: Search for "Score Recomputation" events in the `scoring-engine` logs to see if a specific sub-score (e.g., `age_gate_quality`) triggered the drop.
3. **Verify Compliance Logic**: Ensure no recent configuration changes to the scoring weights were deployed.

### Remediation Steps
- **Provider Failure**: If a provider is down, consider temporarily adjusting the `age_gate_quality` weight or extending verification grace periods via the `campaign-manager` configuration.
- **Manual Override**: For legitimate publishers incorrectly caught in a spike, use the administrative API to issue a 24-hour temporary compliance override.
- **Notification**: Ensure the `notification` service has successfully sent remediation steps to all affected publishers.

---

## 4. Manual Remediation: Hash-Chain Integrity Failure

The Audit Log uses a cryptographic hash-chain where `entry_hash = SHA256(content + prev_entry_hash)`. A failure indicates tampering or data corruption.

### Identification
The system triggers an `AUDIT_LOG_INTEGRITY_FAILURE` alert if the `GET /v1/audit-log/verify` endpoint returns a mismatch.

### Remediation Steps
1. **Isolate the Record**: Identify the first sequence number where the hash mismatch occurs.
2. **Read-Only Lock**: Immediately place the audit log table in read-only mode to prevent further chain corruption if the system is under attack.
3. **Verify against Checkpoints**: Compare the local state against the last 24-hour on-chain Merkle root anchor (if Web3 anchoring is enabled).
4. **Restore from Backup**:
   - If corruption is isolated to a few records and backups are healthy, restore the affected rows.
   - Recalculate the hashes from the point of restoration forward to re-establish the chain.
5. **Security Audit**: If tampering is suspected, rotate all Ed25519 signing keys and conduct a full identity/auth audit.
