# Statutory Compliance Attestation & Regulatory Mapping

**Entity:** Pie Corp Limited (Platform: Portfolio Immortalized)  
**Jurisdiction:** Republic of Kenya  
**Statutory Frameworks:**
1. Kenya Data Protection Act, 2019 (Act No. 24 of 2019) & Data Protection Regulations, 2021
2. Law of Succession Act, Chapter 160 (Cap. 160, Laws of Kenya)
3. Kenya Evidence Act, Chapter 80 (Cap. 80, Laws of Kenya) — Section 106B Electronic Records Admissibility
**Document ID:** COMP-KEN-2026-V1  
**Classification:** C2 — Legal & Compliance Governance Attestation  
**Date of Assessment:** 2026-10-21  

---

## 1. Statutory Executive Statement

Pie Corp Limited has engineered and implemented *Portfolio Immortalized* to serve as a high-assurance digital legacy custody and post-mortem controlled-release platform. The system architecture embodies the principles of **Data Protection by Design and by Default** (Section 41, KDPA 2019) and aligns digital asset devolution with the statutory requirements of the **Law of Succession Act (Cap. 160)**.

This document provides a formal legal-technical mapping demonstrating how the technical controls, cryptographic invariants, and operational runbooks satisfy the statutory mandates of the Republic of Kenya.

---

## 2. Kenya Data Protection Act, 2019 (KDPA) Compliance Matrix

| KDPA Section | Statutory Requirement | Platform Technical Control | Verification / Test Proof |
| :--- | :--- | :--- | :--- |
| **Section 18 & 19** | Mandatory Registration with the Office of the Data Protection Commissioner (ODPC) as Data Controller and Data Processor. | Dual registration lodged with ODPC under Category: Data Controllers and Processors of High-Risk / Sensitive Personal Data. Dedicated Data Protection Officer (DPO) designated. | Legal filing record: ODPC/DPC/REG/2026-PC817. |
| **Section 25(a)** | Lawfulness, Fairness, and Transparency. | Granular consent collection at registration (`AUTH-001`). Clear terms specifying digital legacy custody. Real-time audit logs for all owner, trustee, and admin actions. | `AUTH-01..04`, `OPS-001`, `server/audit/audit-service.ts`. |
| **Section 25(b)** | Purpose Limitation. | Vault assets are encrypted and inaccessible for advertising, profiling, or unauthorized AI training. AI Gateway tasks are strictly policy-allowlisted (`AI-001`). | `AI-01..07`, zero AI execution of unauthorized tasks. |
| **Section 25(c)** | Data Minimization. | Minimal registration profile (name, email, password) with progressive completion (`PROF-001`). Zero unnecessary metadata stored. | `PROFILE-01`, `server/dal/profile.ts`. |
| **Section 25(d)** | Accuracy & Rectification. | Owners maintain continuous ability to edit, update, re-key, and re-order vault items and legacy plans prior to case verification. | `VAULT-001`, `POL-001`, `packages/domain/`. |
| **Section 25(e)** | Storage Limitation. | Automatic soft-deletion retention rules. Scheduled outbox dispatch purges. Safe purge of mobile client decrypted caches on app backgrounding / logout (`R-13`). | `server/services/lifecycle.ts`, `apps/mobile/src/services/auth.ts`. |
| **Section 25(f) & Section 41** | Security of Processing & Data Protection by Design. | Envelope Encryption using AES-256-GCM (`ADR-001`). Plaintext never written to permanent disks. Cryptographic DEKs unique per asset. Automated PII redaction in structured logs (`R-18`). | `crypto-envelope.test.ts`, `PEN-10`, `server/observability/logger.ts`. |
| **Section 29 & Section 44** | Processing of Sensitive Personal Data (Health, Biometrics, Family Records). | Local device biometric authentication (`AUTH-003`) stored exclusively on device hardware Secure Enclave via Expo SecureStore; biometric credentials are never transmitted over network. | `AUTH-003`, `apps/mobile/src/services/auth.ts`. |
| **Section 31** | Data Protection Impact Assessment (DPIA). | Comprehensive DPIA completed covering catastrophic release risk, dual-custody verification, and forensic tracing. | Approved DPIA Reference: `DPIA-PI-2026-Q4`. |
| **Section 48 & 49** | Transfer of Personal Data Outside Kenya. | Data Localization: Primary database and KMS instance provisioned within authorized regional boundaries. Cryptographic KEK keys remain restricted to designated regions. | Infrastructure Config: `docs/runbooks/disaster-recovery.md`. |
| **Section 40** | Right to Erasure ("Right to be Forgotten"). | Owner account deletion workflow purges vault ciphertext and destroys DEKs, rendering ciphertext permanently unrecoverable, subject to statutory preservation exceptions. | `server/services/lifecycle.ts`, `ADMIN-02/03`. |

---

## 3. Law of Succession Act (Cap. 160) Alignment

The devolution of property upon death in Kenya is governed by the Law of Succession Act (Cap. 160). Portfolio Immortalized incorporates statutory protections to ensure that digital asset releases do not usurp or conflict with legal succession:

### 3.1 Prohibition of Arbitrary or Timer-Based Releases (`CASE-01`)
- **Statutory Conflict Avoided:** Under Cap. 160, succession cannot be triggered merely by presumption or silence. Section 118 of the Evidence Act requires proof of death.
- **Platform Invariant:** Portfolio Immortalized strictly enforces **Zero Timer-Based Release**. Inactivity or missed heartbeats exclusively open an investigation inquiry (`CASE-001`). Beneficiary grants cannot be generated or released without verified proof of death.
- **Test Proof:** `PEN-12` (`Zero timer-based release verification: missed heartbeats open an investigation case but never transition to RELEASE_APPROVED`).

### 3.2 Dual-Custody Verification & Separation of Duties (`REL-001`, `CASE-10`)
- **Statutory Intent:** Mitigate fraudulent claims and elder exploitation.
- **Platform Invariant:** Two distinct authorized individuals (e.g. Legal Officer + Security Admin) must independently review and approve death evidence. A single administrator cannot review and approve the same release (`approverId !== reviewerId`).
- **Test Proof:** `PEN-04` (`Dual-custody separation of duties: Approver and Reviewer must be distinct administrators`).

### 3.3 Asymmetric Emergency Hold & Succession Dispute Freeze (`CASE-03`, `R-24`)
- **Statutory Alignment:** Sections 45–47 of Cap. 160 prohibit intermeddling with the estate of a deceased person. When probate disputes arise (e.g., caveator filings under Section 67), estate distribution must freeze immediately.
- **Platform Invariant:** Any single trustee, legal representative, or administrator can unilaterally invoke an instant emergency hold that freezes all download grants, outbox dispatches, and verification workflows. Removal of the hold requires dual-administrator sign-off.
- **Test Proof:** `PEN-09` (`Asymmetric emergency hold: Instant freeze halts beneficiary downloads`).

### 3.4 Legal Preservation Holds (`ADM-002`, `R-11`)
- **Statutory Alignment:** Compliance with court orders, subpoenas, and preservation directives under Section 68 of Cap. 160.
- **Platform Invariant:** If an owner account is flagged with an active legal hold or pending succession inquiry, deletion requests are categorically rejected.
- **Test Proof:** `PEN-14` (`Legal preservation hold: Account deletion is blocked when active legal hold or pending case exists`).

---

## 4. Evidence Act (Cap. 80, Sec. 106B) & Forensic Traceability

Under Section 106B of the Kenya Evidence Act, electronic records are admissible in judicial proceedings provided their integrity, production chain of custody, and identity can be authenticated:

1. **Dynamic Recipient Derivative Watermarking (`OD-19`):**
   - When an authorized beneficiary accesses an released asset, the system generates an ephemeral, cryptographically watermarked derivative without modifying the original vault ciphertext.
   - Watermark embeds: `Beneficiary Name`, `Beneficiary National ID / Email`, `Grant UUID`, `Release Timestamp (UTC)`, and `Platform Digital Certificate`.
   - Prevents unauthorized re-distribution and enables deterministic forensic attribution in the High Court of Kenya.
   - **Test Proof:** `PEN-13` (`Forensic recipient derivative watermarking: Released assets embed recipient attribution without altering vault ciphertext`).

2. **Immutable Audit Trail (`OPS-001`):**
   - All state transitions, relationship invitations, evidence uploads, triage decisions, and grant redemptions are recorded in append-only audit logs with SHA-256 payload integrity digests.
   - Logs are tamper-evident and protected against administrative modification or deletion.

---

## 5. Formal Attestation Sign-Off

The undersigned certify that the architectural controls, cryptographic boundaries, and operational runbooks for Portfolio Immortalized have been reviewed and verified for statutory compliance with the Kenya Data Protection Act, 2019 and the Law of Succession Act (Cap. 160):

```
Chief Technology Officer & Lead Architect
Pie Corp Limited
Date: 2026-10-21

Data Protection Officer (DPO) & Legal Counsel
Pie Corp Limited
Date: 2026-10-21
```
