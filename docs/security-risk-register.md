# Security Risk Register
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Appendix D Baseline

| Risk ID | Risk Description | Initial Impact | Treatment & Engineering Verification | Accountable Owner |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | False death determination from inactivity | Critical | Inactivity triggers investigation only; dual human release approval required; no timer-only release grants. | Product + Security |
| **R-02** | Insider/admin releases assets improperly | Critical | Least privilege, named accounts, requester/approver separation, KMS release gating, append-only audit. | Security |
| **R-03** | Key loss makes legacy assets unrecoverable | Critical | Tested envelope encryption architecture, key-version inventory, backup restore drill, and recovery escrow. | Crypto Architect |
| **R-04** | Key service or application compromise exposes all files | Critical | Separate KMS account/IAM, per-asset unique DEKs, strictly monitored unwrap operations, workload identity. | Security |
| **R-05** | Cross-tenant IDOR exposes files or cases | Critical | Centralized DAL policy, strictly scoped queries, foreign key ownership enforcement, automated negative tests. | Engineering |
| **R-06** | Public/signed object URL leaks confidential media | High | Private object store, no URLs logged in telemetry, short-lived TTLs, application-level encryption. | Storage + Security |
| **R-07** | Trustee collusion / fraud | Critical | Independent contact verification, evidence checklist, admin review, owner dispute alerts, immediate hold. | Operations + Legal |
| **R-08** | Account takeover changes recipient instructions | Critical | Passkeys/MFA, action-bound step-up authentication, change alerts to existing channels, cooldown periods. | Identity + Security |
| **R-09** | Cloud/AI provider retention conflicts with privacy promise | High | Commercial API contracts with zero training terms, data minimization, approved data-class matrix, kill switch. | Privacy Lead |
| **R-10** | Prompt injection in uploaded document corrupts summary | High | Treat document content as untrusted data; no privileged tools given to AI; human verification mandatory. | AI Lead |
| **R-11** | Hard delete erases evidence needed for legal dispute | High | Controlled deletion lifecycle, legal hold checks, soft-delete grace periods, dry-run before purge. | Engineering + Legal |
| **R-12** | Duplicate background job issues duplicate or broader grants | Critical | Idempotency keys, transactional state checks, exact recipient-asset pairing, concurrency fault tests. | Engineering |
| **R-13** | Lost phone leaves local plaintext cache exposed | High | No offline plaintext files in MVP; OS SecureStore; cache clearing on logout; remote session revocation. | Mobile + Security |
| **R-14** | Notification provider outage prevents notice but case advances | High | Decouple delivery status from case progression; transactional outbox retry; no delivery-based proof of life. | Operations |
| **R-15** | Encrypted backup cannot be decrypted after key rotation | Critical | Key-version inventory, recovery credentials, periodic isolated restore exercises with sample asset unwrap. | Operations + Security |
| **R-16** | Excessive admin surveillance violates user privacy | High | Purpose-based access, view auditing on sensitive profile fields, data minimization, role reviews. | Privacy Lead |
| **R-17** | Invalid legal assumptions for foreign will or death evidence | Critical | Jurisdiction-specific legal review (Kenya-first baseline), explicit disclaimers regarding legal validity. | Legal |
| **R-18** | Sensitive document text exposed in email, push, or logs | High | Generic notification templates, strict PII redaction at logger source, DLP-like regression tests. | Engineering |
| **R-19** | Malicious file parser / decompression bomb compromises service | High | File quarantine, MIME/signature allowlist, isolated worker execution with CPU/memory/time limits. | Security |
| **R-20** | Database migration causes irreversible data loss | Critical | Version-controlled migrations, expand-and-contract changes, pre-migration backups, test restores. | Engineering |
| **R-21** | AI model update causes accuracy regression | Medium-High | Pinned model versions, evaluation benchmark suites, staged rollouts, feature-level rollback flags. | AI Lead |
| **R-22** | Single Super Admin identity lost or compromised | Critical | Controlled bootstrap procedure, at least two authorized admin custodians, no shared accounts. | Leadership |
| **R-23** | Storage deletion incomplete across derivatives or backups | High | Provider-neutral storage inventory, purge reconciliation jobs, audit tombstones. | Operations |
| **R-24** | Release grant cached after emergency hold or revocation | Critical | Short grant TTL, mandatory server-side grant checks on asset fetch, cache invalidation on hold. | Engineering |
| **R-25** | Watermark falsely marketed as preventing copying | Medium | Clear disclaimers that watermarking is a traceability deterrent, not a technical copy prevention mechanism. | Product + Legal |
