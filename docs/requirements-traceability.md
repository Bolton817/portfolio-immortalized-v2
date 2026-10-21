# Requirements Traceability Matrix
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Chapter 4 & Appendix H Baseline

| Requirement ID | Domain | Priority | Primary Specification | Implementation Component | Required Proof / Test Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-001** | Authentication | P0 | Minimal registration & email verification | `server/auth/`, `packages/validation/schemas/auth.ts` | `AUTH-01..04`, unverified access blocked |
| **AUTH-002** | Authentication | P0 | Multi-factor account recovery without single-token reliance | `server/auth/recovery.ts`, `server/audit/` | `AUTH-08`, recovery risk hold applied |
| **AUTH-003** | Authentication | P1 | Local device biometric unlock without server credential pass | `apps/mobile/src/services/auth.ts`, `apps/mobile/src/screens/settings/ProfileScreen.tsx` | `MOB-02`, biometric toggle & secure token storage |
| **PROF-001** | Profile | P0 | Progressive profile completion after signup | `packages/domain/`, `server/dal/profile.ts` | `PROFILE-01`, checklist display verified |
| **VAULT-001** | Vault | P0 | Owner can upload PDF, images, audio, video | `server/storage/`, `server/crypto/` | `VAULT-01..06`, hash/encryption committed |
| **VAULT-002** | Vault | P1 | Multi-page mobile document scan, rotate & reorder | `apps/mobile/src/screens/vault/ScannerScreen.tsx` | `VAULT-08`, page reorder/rotate & quality filters |
| **VAULT-003** | Vault | P1 | Resumable media upload and interrupted recovery | `server/storage/`, `packages/api-client/` | `VAULT-04/10`, resume on network reconnect |
| **MOB-004** | Mobile Client | P1 | Offline mutation queue with idempotent replay | `apps/mobile/src/services/offlineQueue.ts`, `apps/mobile/src/screens/vault/VaultScreen.tsx` | Auto-flush on network reconnect with idempotency key |
| **PEOPLE-001** | People | P0 | Owner invites trustees and beneficiaries | `server/dal/relationships.ts`, Brevo Adapter | `REL-01..03`, single-use expiring invite token |
| **POL-001** | Legacy Plan | P0 | Item-to-beneficiary access rules & instructions | `packages/domain/`, `server/dal/legacy-plan.ts` | Preview shows exact recipient-asset map |
| **MON-001** | Inactivity | P0 | Inactivity evaluation via scheduled jobs | `packages/domain/policies/inactivity.ts` | `CASE-01..03`, meaningful activity resets clock |
| **CASE-001** | Verification | P0 | Suspected death opens investigation, not release | `packages/domain/state-machine/death-case.ts` | `CASE-01`, `PEN-12`, zero timer-based release |
| **CASE-002** | Verification | P0 | Trustee evidence submission & required co-sign | `server/services/case.ts` | `CASE-04..05`, evidence hashes recorded |
| **CASE-003** | Verification | P0 | Admin manual case triage, hold, reopen, reject | `server/services/case.ts`, `server/audit/` | `CASE-09/12`, `PEN-09`, emergency hold halts pipeline |
| **REL-001** | Release | P0 | Two-person independent release authorization | `packages/domain/state-machine/death-case.ts` | `CASE-10..11`, `PEN-04`, reviewer != approver verified |
| **ADM-001** | Administration | P0 | Admin user search & metadata audit | `apps/web/app/(admin)/users/`, `server/dal/` | `ADMIN-01..06`, sensitive content masked |
| **ADM-002** | Administration | P0 | Account suspension/closure/deletion workflow | `server/services/lifecycle.ts` | `ADMIN-02/03`, `PEN-14`, legal hold blocks purge |
| **AI-001** | AI Gateway | P0 | AI routed through policy-aware gateway | `server/ai-gateway/` | `AI-01..07`, task allowlist enforced |
| **AI-002** | AI Gateway | P0 | AI prohibited from authorizing death/release | `server/ai-gateway/`, `packages/domain/` | No tool/endpoint confers release authority |
| **OPS-001** | Operations | P0 | Security events & critical workflows audited | `server/audit/`, `prisma/schema.prisma` | `ADMIN-07`, `OPS-05`, immutable audit records |
| **OBS-001** | Observability | P0 | Production readiness probe & PII-scrubbed JSON logs | `apps/web/app/api/v1/health/route.ts`, `server/src/observability/` | `PEN-10`, KMS/DB latency metrics & PII scrubber |
| **PEN-001** | Penetration Test | P0 | Automated adversarial test suite (14 attack vectors) | `server/tests/security-penetration.test.ts` | `PEN-01..14`, 100% pass across all vectors |
| **CONT-001** | Containerization | P0 | Multi-stage unprivileged Docker containers | `apps/web/Dockerfile`, `apps/worker/Dockerfile`, `docker-compose.yml` | Non-root UID 1001, standalone build & healthcheck |
| **GO-001** | Go-Live Readiness | P0 | Cutover runbook & Kenya statutory compliance attestation | `docs/runbooks/go-live-cutover.md`, `docs/compliance-attestation.md` | KDPA 2019 & Succession Act (Cap. 160) verified |
| **DR-001** | Disaster Recovery | P0 | Tested isolated backup restore procedure | `docs/runbooks/disaster-recovery.md` | `OPS-04`, isolated DB & key restore test |
