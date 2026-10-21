# Production Go-Live Cutover Runbook

**Platform:** Portfolio Immortalized — Pie Corp Limited  
**Document ID:** RB-OPS-002  
**Target Architecture:** Multi-Stage Containerized (Next.js Standalone + Worker Daemon + Managed PostgreSQL + Cloud KMS)  
**Regulatory Baseline:** Kenya Data Protection Act 2019 (ODPC) & Law of Succession Act (Cap. 160)  
**Security Classification:** C3 — Confidential Operational Runbook  
**Last Revised:** 2026-10-21  

---

## 1. Executive Summary & Cutover Objectives

This runbook specifies the step-by-step procedures for transitioning Portfolio Immortalized from staging to production. The primary operational objectives are:
1. **Zero Data Loss & Zero Plaintext Exposure:** All cryptographic keys, envelope encryptions, and customer data must strictly conform to AES-256-GCM envelope invariants (`ADR-001`, `ADR-002`).
2. **Dual-Custody Admin Bootstrap:** Establishing separated administrator roles (`SUPER_ADMIN`, `SECURITY_ADMIN`, `LEGAL_OFFICER`) before public traffic is routed.
3. **Automated Verification:** Passing all pre-flight security checks, migration validations, and container readiness probes (`/api/v1/health`).
4. **Deterministic Rollback:** Guaranteeing an actionable rollback path within a 15-minute operational window if unrecoverable errors occur.

---

## 2. Pre-Flight Checklist (T-72 Hours to T-4 Hours)

### 2.1 Cloud Infrastructure & IAM Provisioning
- [ ] **Cloud PostgreSQL (Production):**
  - PostgreSQL 16+ Multi-AZ cluster deployed with automated Point-in-Time Recovery (PITR) configured for 35 days.
  - Connection pooling enabled (PgBouncer or Supabase pooler) with SSL/TLS `sslmode=require`.
  - Service account assigned least-privilege `DML`/`DDL` scopes.
- [ ] **Cloud Key Management Service (Cloud KMS):**
  - Master Key Encryption Key (`kek-master-v1`) provisioned in Google Cloud KMS / AWS KMS.
  - IAM Key Encrypter/Decrypter role restricted exclusively to the web and worker production service account.
  - Automatic key rotation configured (annual cycle).
- [ ] **Private Vault Object Storage (S3 / GCS):**
  - Production vault bucket configured with default AES-256 server-side encryption.
  - Public access completely blocked (`BlockPublicAccess: True`).
  - Strict CORS policy restricting requests exclusively to the production domain.
- [ ] **Communications Gateways:**
  - Brevo transactional email API key provisioned and verified with DKIM, SPF, and DMARC enforcement.
  - Notification templates loaded and audited for zero death/mortality disclosure (`R-14`, `R-16`).
- [ ] **Observability & Error Tracking:**
  - Sentry production DSN configured with automated Kenyan PII scrubbing (`R-18`).
  - Structured JSON logging enabled with streaming to CloudWatch / Google Cloud Logging.

---

## 3. Zero-Downtime Database Migration (T-4 Hours to T-2 Hours)

Prior to deploying application containers, apply all Prisma database migrations against production:

```bash
# Step 1: Export production database connection strings
export DATABASE_URL="postgresql://db_app_user:${DB_PASSWORD}@prod-db-primary.internal:5432/portfolio_immortalized?schema=public&sslmode=require"
export DIRECT_URL="postgresql://db_admin_user:${DB_ADMIN_PASSWORD}@prod-db-primary.internal:5432/portfolio_immortalized?schema=public&sslmode=require"

# Step 2: Validate migration status (ensure zero drift)
npx prisma migrate status

# Step 3: Deploy pending schema migrations
npx prisma migrate deploy

# Step 4: Verify migration outcome
npx prisma migrate status
```

*Success Criteria:* `Database schema is up to date!` with zero unapplied or failed migrations.

---

## 4. Dual-Admin Bootstrap Ceremony (T-2 Hours)

Per statutory governance and platform invariants (`REL-001`, `AUTH-002`, `CASE-10`), **no single administrator** may hold unilateral release authority. Two distinct individuals must be bootstrapped:

```bash
# Step 1: Execute production admin bootstrap script
node server/dist/scripts/bootstrap-production-admins.js \
  --admin1-email="security-lead@piecorp.co.ke" \
  --admin1-role="SECURITY_ADMIN" \
  --admin2-email="legal-custody@piecorp.co.ke" \
  --admin2-role="LEGAL_OFFICER"

# Step 2: Confirm both administrators require hardware WebAuthn / FIDO2 MFA on first login
# Step 3: Audit log inspection
node -e "
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  db.auditLog.findMany({ where: { action: { startsWith: 'ADMIN_' } } })
    .then(logs => console.log('Admin bootstrap audit logs:', logs.length));
"
```

---

## 5. Container Deployment & Production Health Probe (T-1 Hour)

### 5.1 Service Deployment
Deploy the containerized workloads (`immortalized-web` and `immortalized-worker`):

```bash
# Pull and start services using production docker-compose
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Verify container status
docker compose ps
```

### 5.2 Automated Readiness Probe Verification
Verify the `/api/v1/health` endpoint:

```bash
curl -f -s https://api.portfolio-immortalized.com/api/v1/health | jq .
```

*Expected Output Schema:*
```json
{
  "status": "healthy",
  "timestamp": "2026-10-21T18:00:00.000Z",
  "uptimeSeconds": 120,
  "version": "0.1.0",
  "checks": {
    "database": {
      "status": "up",
      "latencyMs": 3.4
    },
    "kms": {
      "status": "up",
      "latencyMs": 1.2
    }
  },
  "memory": {
    "heapUsedMb": 54.2,
    "heapTotalMb": 98.6,
    "rssMb": 142.1
  }
}
```

*Gates:*
- `status` MUST be `"healthy"`.
- `checks.database.status` MUST be `"up"` (latency $\le 20$ms).
- `checks.kms.status` MUST be `"up"` (latency $\le 10$ms).
- If any check fails, do NOT proceed with DNS cutover.

---

## 6. DNS Cutover & Traffic Ramp-Up (T-0)

1. **Pre-Cutover TTL:** Ensure Cloudflare / Route53 DNS TTL is reduced to 300 seconds (5 minutes).
2. **Switch CNAME Records:** Point `app.portfolio-immortalized.com` and `api.portfolio-immortalized.com` to the production Application Load Balancer (ALB).
3. **Execute Synthetic Production Smoke Tests:**
   ```bash
   # Synthetic Test 1: User Registration & Email Verification Handshake
   curl -s -X POST https://api.portfolio-immortalized.com/api/v1/auth/register-probe ...

   # Synthetic Test 2: Inactivity Heartbeat Ping
   curl -s -X POST https://api.portfolio-immortalized.com/api/v1/health/synthetic-ping ...

   # Synthetic Test 3: KMS Envelope Encryption Round-Trip
   npm test -- server/tests/security-penetration.test.ts
   ```

---

## 7. Post-Cutover Monitoring (T+1 Hour to T+24 Hours)

1. **Real-Time Telemetry:** Monitor P95 / P99 latency dashboards. Alert if `/api/v1/vault/*` P95 exceeds 500ms.
2. **PII Scrubbing Verification:** Sample CloudWatch logs and ensure Kenyan IDs (7-8 digits) and phone numbers (+254...) are replaced with `[REDACTED_KENYAN_ID]` and `[REDACTED_PHONE]`.
3. **Worker Daemon Verification:**
   ```bash
   docker logs immortalized-worker --tail 100 | grep -E "INACTIVITY_BATCH_PROCESSED|DISPATCH_BATCH_COMPLETE"
   ```

---

## 8. Rollback Protocol & Abort Criteria

### 8.1 Abort Criteria (Automatic Rollback Triggered if Any Occur):
- Database migration error or schema incompatibility.
- KMS master key unwrap failure (error in `/api/v1/health` KMS probe).
- Error rate on public endpoints exceeds 0.5% over a 5-minute rolling window.
- Unsanitized PII detected in production logs.

### 8.2 Rollback Procedure (Execution Time: $\le$ 10 Minutes):
```bash
# Step 1: Revert DNS CNAME to maintenance page / previous stable target
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch file://dns-rollback.json

# Step 2: Stop application containers to prevent partial state writes
docker compose down

# Step 3: If database migration rollback is strictly necessary:
# Run reverse migration script or restore PostgreSQL to PITR snapshot taken at T-4h:
gcloud sql instances clone immortalized-db-primary immortalized-db-rollback \
  --point-in-time="2026-10-21T13:55:00Z"

# Step 4: Convene incident post-mortem with Security & Legal Leads
```
