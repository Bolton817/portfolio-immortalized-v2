# Disaster Recovery & Key Infrastructure Restoration Runbook (DR-001 / OPS-04)

**Platform:** Portfolio Immortalized (Pie Corp Limited)  
**Standard:** ISO 27001 / SOC 2 Type II / Hong Kong Cap. 160 Evidence Ordinance  
**Classification:** C3 — Confidential Infrastructure Runbook  
**Last Revised:** 2026-10-20  

---

## 1. Objectives & Critical Targets

| Objective | Metric Target | Governance Invariant |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | $\le$ 15 minutes | Continuous Write-Ahead Log (WAL) streaming to secondary multi-region bucket with object-lock. |
| **RTO (Recovery Time Objective)** | $\le$ 2 hours | Automated cloud cluster failover, read replica promotion, and envelope KMS re-attachment. |
| **Data Integrity Invariant** | 100% Zero Bit-Rot | Cryptographic SHA-256 envelope verification without exposing plaintext DEKs into storage. |
| **Separation of Duties** | Dual-Person Signoff | DR failover or emergency restore must be co-authorized by at least two distinct `SECURITY_ADMIN` or `SUPER_ADMIN` keys. |

---

## 2. Emergency Escalation & Platform Freeze Phase

Prior to executing any snapshot restoration or failover:

```bash
# Step 1: Immediately invoke the platform-wide emergency hold
curl -X POST "https://api.portfolio-immortalized.com/api/v1/admin/security/hold" \
  -H "Authorization: Bearer $SECURITY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reasonCode": "SECURITY_INCIDENT",
    "rationale": "Invoking emergency platform hold for disaster recovery failover procedure.",
    "affectedOwnerId": "ALL"
  }'
```

*Verification:* Ensure `/api/v1/admin/security/status` returns `systemHoldActive: true`. All background workers, outbox dispatchers, and beneficiary downloads are immediately halted.

---

## 3. Database Restoration & Point-in-Time Recovery (PITR)

### 3.1 Primary Cloud PostgreSQL Failover
If the primary PostgreSQL cluster in Hong Kong (Region A) is unavailable:

```bash
# 1. Promote warm standby replica in Region B (Singapore / Tokyo)
gcloud sql instances promote-replica immortalized-db-replica-b \
  --project=portfolio-immortalized-prod

# OR (for AWS RDS Multi-AZ / Aurora Global Database):
aws rds failover-db-cluster \
  --db-cluster-identifier immortalized-aurora-cluster-hk
```

### 3.2 Point-in-Time Restoration from Immutable Backup
To restore to a specific timestamp before a corruption or security incident:

```bash
# Restore PostgreSQL cluster to target timestamp (UTC)
gcloud sql instances clone immortalized-db-primary immortalized-db-restored \
  --point-in-time="2026-10-20T14:30:00Z" \
  --project=portfolio-immortalized-prod

# Verify schema integrity & migration state
npx.cmd prisma migrate status
```

---

## 4. KMS Master Key (KEK) & HSM Restoration

Per Architectural Decision **`ADR-001`** and **`ADR-002`**, individual asset Data Encryption Keys (DEKs) are wrapped with master Key Encryption Keys (KEKs).

1. **Verify Cloud KMS Key Availability:**
   ```bash
   gcloud kms keys describe vault-kek-master-v1 \
     --keyring=immortalized-vault-ring \
     --location=asia-east2
   ```
2. **Multi-Region Failover Key Alignment:**
   If Region A KMS is inaccessible, activate the secondary replicated key ring in Region B:
   ```bash
   export KMS_MASTER_KEY_ID="projects/portfolio-immortalized-prod/locations/asia-southeast1/keyRings/immortalized-dr-ring/cryptoKeys/vault-kek-master-v1-replica"
   ```
3. **Envelope Unwrapping Diagnostic:**
   Run the test unwrapper script in an isolated sandbox to confirm that wrapped DEKs can be unwrapped:
   ```bash
   npm.cmd run test -- server/tests/crypto-envelope.test.ts
   ```

---

## 5. Storage Object Vault Synchronization & Audit Verification

```bash
# 1. Inspect bucket object replication status between Primary and DR vaults
gsutil rsync -r -d gs://immortalized-vault-primary gs://immortalized-vault-dr-replica

# 2. Re-index and verify asset version hash consistency
npm.cmd run worker:tick -- --forceSweep=false --processOutboxLimit=10
```

### 5.1 Verification Checklist

- [ ] Emergency hold banner visible on `/admin/security` and all user dashboards.
- [ ] Database connectivity verified (`SELECT count(*) FROM users;`).
- [ ] KMS test unwrap succeeds without tag verification failures.
- [ ] Outbox queue verified intact with zero dropped transactions.
- [ ] Background worker completes trial tick without unhandled exceptions.
- [ ] Two authorized security administrators sign off in the immutable audit log:

```json
{
  "actorType": "ADMIN",
  "action": "admin.dr_restoration_certified",
  "targetType": "System",
  "targetId": "GLOBAL",
  "outcome": "SUCCESS",
  "metadata": {
    "targetRPO": "< 15 min",
    "actualRPO": "4 min 12 sec",
    "rtoElapsedMinutes": 38,
    "certifiedBy": ["admin_sec_1", "admin_sec_2"]
  }
}
```

---

## 6. Post-Recovery Unfreezing

Once dual-person certification is completed, lift the emergency hold:

```bash
curl -X POST "https://api.portfolio-immortalized.com/api/v1/admin/security/hold" \
  -H "Authorization: Bearer $SECURITY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reasonCode": "SECURITY_INCIDENT",
    "rationale": "DR restoration complete and verified. Resuming standard operations.",
    "affectedOwnerId": "ALL"
  }'
```
