# STRIDE Threat Model & Security Boundaries
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Chapter 20 Baseline

---

## 1. Security Trust Boundaries

```
[Boundary A: Untrusted Clients]
       │ (Browser, Mobile App, Deep Links, Uploaded Files)
       ▼
[Boundary B: Authenticated API Gateway / Routes]
       │ (Better Auth session resolution, input validation, CSRF/origin checks)
       ▼
[Boundary C: Data Access Layer (DAL) & Domain Services]
       │ (Object-level authorization, state machine preconditions, separation of duties)
       ├───► [Boundary D: PostgreSQL on Supabase] (Relational constraints, RESTRICT deletion)
       ├───► [Boundary E: Private Object Storage] (Ciphertext files, isolated buckets, opaque keys)
       ├───► [Boundary F: KMS Key-Management Service] (KEK wrapping/unwrapping, release policy gated)
       └───► [Boundary G: External Services] (Brevo Email, AI Gateway, Cloudinary)
[Boundary H: Privileged Operations & Administrators]
       (Named individual accounts, step-up MFA/passkeys, two-person release rule, audit trail)
```

---

## 2. STRIDE Threat Analysis

### Spoofing
- **Threat:** Malicious actor spoofs trustee or beneficiary identity to gain unauthorized access.
- **Controls:** Server-side session verification via Better Auth; single-use, cryptographically random, hashed invitation tokens; verified contact binding; step-up authentication on high-risk actions.
- **Threat:** Client spoofs `ownerId`, `role`, or `adminId` in request payloads.
- **Controls:** Actor identity and permissions derived exclusively from server-side session state in Boundary B/C; client-supplied identity fields in request bodies are ignored.

### Tampering
- **Threat:** Beneficiary alters URL parameters or API payloads to request unassigned asset versions.
- **Controls:** `ReleaseGrant` validation strictly cross-checks `grant_id`, `beneficiary_id`, `asset_version_id`, expiry, and active hold status in a transactional barrier.
- **Threat:** Attacker tampers with encrypted asset bytes or attempts ciphertext swapping between accounts.
- **Controls:** AEAD (AES-256-GCM) with authenticated associated data (AAD) binding asset ID, version, and tenant metadata; integrity check failure produces fail-closed denial and security alert.

### Repudiation
- **Threat:** Admin denies making an unauthorized case decision or emergency hold modification.
- **Controls:** Immutable `AuditEvent` log written transactionally with every privileged action, recording named actor ID, action name, target, timestamp, rationale, and trace ID. Direct UPDATE and DELETE on audit records prohibited.

### Information Disclosure
- **Threat:** Unauthenticated or unauthorized user discovers whether a sensitive legal document exists via API error messages or timing attacks.
- **Controls:** Uniform error responses (generic 404/403 with standard `ApiErrorEnvelope`); no leaking of foreign resource IDs, stack traces, or SQL errors.
- **Threat:** Cleartext private files or keys leaked in email, push notifications, or application logs.
- **Controls:** Emails use generic neutral notifications; push previews contain no sensitive titles or content; logs redact PII, tokens, and encryption envelopes at source.

### Denial of Service
- **Threat:** Resource exhaustion via decompression bombs, oversized uploads, or continuous AI gateway queries.
- **Controls:** Server-enforced MIME/magic-number validation, file size limits, rate limiting on auth and upload endpoints, token/cost budgets, circuit breakers, and global spend limits on AI tasks.

### Elevation of Privilege
- **Threat:** Case reviewer attempts to self-approve a death release case.
- **Controls:** Separation of duties enforced by domain services: `decision.actor_admin_id != case.reviewer_id` for final release approval; requires two distinct authorized staff members.
- **Threat:** Malicious trustee submits false death report to automatically unlock vault.
- **Controls:** Death report only transitions case to `REPORTED` or `EVIDENCE_PENDING`; no automated release pathway exists; quorum and independent review required.
