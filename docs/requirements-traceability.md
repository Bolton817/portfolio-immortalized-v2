# Requirements Traceability Matrix
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Chapter 4 & Appendix H Baseline

| Requirement ID | Domain | Priority | Primary Specification | Implementation Component | Required Proof / Test Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-001** | Authentication | P0 | Minimal registration & email verification | `server/auth/`, `packages/validation/schemas/auth.ts` | `AUTH-01..04`, unverified access blocked |
| **AUTH-002** | Authentication | P0 | Multi-factor account recovery without single-token reliance | `server/auth/recovery.ts`, `server/audit/` | `AUTH-08`, recovery risk hold applied |
| **AUTH-003** | Authentication | P1 | Local device biometric unlock without server credential pass | `apps/mobile/`, Expo SecureStore / LocalAuthentication | `MOB-02`, biometric removed fallback |
| **PROF-001** | Profile | P0 | Progressive profile completion after signup | `packages/domain/`, `server/dal/profile.ts` | `PROFILE-01`, checklist display verified |
| **VAULT-001** | Vault | P0 | Owner can upload PDF, images, audio, video | `server/storage/`, `server/crypto/` | `VAULT-01..06`, hash/encryption committed |
| **VAULT-002** | Vault | P1 | Multi-page mobile document scan & reorder | `apps/mobile/src/screens/vault/Scanner.tsx` | `VAULT-08`, page rotate/reorder tests |
| **VAULT-003** | Vault | P1 | Resumable media upload and interrupted recovery | `server/storage/`, `packages/api-client/` | `VAULT-04/10`, resume on network reconnect |
| **PEOPLE-001** | People | P0 | Owner invites trustees and beneficiaries | `server/dal/relationships.ts`, Brevo Adapter | `REL-01..03`, single-use expiring invite token |
| **POL-001** | Legacy Plan | P0 | Item-to-beneficiary access rules & instructions | `packages/domain/`, `server/dal/legacy-plan.ts` | Preview shows exact recipient-asset map |
| **MON-001** | Inactivity | P0 | Inactivity evaluation via scheduled jobs | `packages/domain/policies/inactivity.ts` | `CASE-01..03`, meaningful activity resets clock |
| **CASE-001** | Verification | P0 | Suspected death opens investigation, not release | `packages/domain/state-machine/death-case.ts` | `CASE-01`, no timer-based release |
| **CASE-002** | Verification | P0 | Trustee evidence submission & required co-sign | `server/services/case.ts` | `CASE-04..05`, evidence hashes recorded |
| **CASE-003** | Verification | P0 | Admin manual case triage, hold, reopen, reject | `server/services/case.ts`, `server/audit/` | `CASE-09/12`, emergency hold halts pipeline |
| **REL-001** | Release | P0 | Two-person independent release authorization | `packages/domain/state-machine/death-case.ts` | `CASE-10..11`, reviewer != approver verified |
| **ADM-001** | Administration | P0 | Admin user search & metadata audit | `apps/web/app/(admin)/users/`, `server/dal/` | `ADMIN-01..06`, sensitive content masked |
| **ADM-002** | Administration | P0 | Account suspension/closure/deletion workflow | `server/services/lifecycle.ts` | `ADMIN-02/03`, legal hold blocks purge |
| **AI-001** | AI Gateway | P0 | AI routed through policy-aware gateway | `server/ai-gateway/` | `AI-01..07`, task allowlist enforced |
| **AI-002** | AI Gateway | P0 | AI prohibited from authorizing death/release | `server/ai-gateway/`, `packages/domain/` | No tool/endpoint confers release authority |
| **OPS-001** | Operations | P0 | Security events & critical workflows audited | `server/audit/`, `prisma/schema.prisma` | `ADMIN-07`, `OPS-05`, immutable audit records |
| **DR-001** | Disaster Recovery | P0 | Tested isolated backup restore procedure | `docs/runbooks/disaster-recovery.md` | `OPS-04`, isolated DB & key restore test |
