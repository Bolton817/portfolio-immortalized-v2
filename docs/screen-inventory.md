# Screen and Surface Inventory
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Chapter 6, 7, 8, 9 & Blueprint Alignment

This inventory catalogs all client-facing screens across the **Mobile Application (Expo)**, **Owner Web Application**, **Trustee Portal**, **Beneficiary Portal**, and **Admin Console**.

---

## 1. Mobile Application Screens (`apps/mobile`)

The mobile client is optimized for touch, native media capture (camera scan, audio notes, video recording), and device-level biometric authentication (LocalAuthentication).

| Screen ID | Surface / Tab | Name | Primary Content & User Actions | Security & Edge States |
| :--- | :--- | :--- | :--- | :--- |
| **MOB-SCR-01** | Onboarding | Welcome Screen | Value proposition, "Create Account", "Sign In", links to Terms & Privacy. | No sensitive user data displayed pre-auth. |
| **MOB-SCR-02** | Onboarding | Sign Up | Email, password, display name, mandatory versioned consent checkboxes. | Rate limited, email normalization, generic conflict handling. |
| **MOB-SCR-03** | Onboarding | Email Verification | 6-digit OTP code entry or magic link handler, resend trigger. | Expiring single-use token, retry cooldown. |
| **MOB-SCR-04** | Onboarding | Sign In | Email + password/passkey credential input. | Rate limited, device fingerprinting, brute-force throttling. |
| **MOB-SCR-05** | Onboarding | App Lock Setup | Prompt to enable biometric unlock (FaceID / TouchID / BiometricPrompt). | Local prompt delegates to OS; no biometric templates sent to server. |
| **MOB-SCR-06** | Home Tab | Home Dashboard | Vault status banner ("Protected"), legacy metrics (Items, Trustees, Beneficiaries), guided setup checklist, recent activity. | **NO "I Am Alive" button.** Shows neutral investigation alert if case opened. |
| **MOB-SCR-07** | Vault Tab | Vault Overview | Filterable list (Wills, Documents, Scans, Media, Notes), search metadata, quick upload action sheet. | Search queries metadata only; empty state guides upload. |
| **MOB-SCR-08** | Vault Tab | Add Material Sheet | Source picker: Upload File, Camera Scan, Record Video, Record Audio, Write Message. | Requests permissions in context with plain-language reasons. |
| **MOB-SCR-09** | Vault Tab | Document Scanner | Multi-page capture, page crop, rotate, reorder, preview before PDF compilation. | Local page cache cleared after save; quality warning for blurry pages. |
| **MOB-SCR-10** | Vault Tab | Media Recorder | In-app video/audio recording with live preview, playback, retake, and title edit. | Strips EXIF/GPS metadata; background recording prohibited. |
| **MOB-SCR-11** | Vault Tab | Upload Review | Title, category, sensitivity level (C0..C3), recipient assignments, version intent. | Shows upload & encryption status; supports resume on reconnect. |
| **MOB-SCR-12** | Vault Tab | Asset Detail | Asset metadata, immutable versions list, assigned recipients, replace/retire actions. | Displays version history; replaces create new versions rather than overwriting. |
| **MOB-SCR-13** | People Tab | People Overview | Segmented tabs for Trustees and Beneficiaries, invitation status indicators. | Explains distinct trustee vs beneficiary boundaries clearly. |
| **MOB-SCR-14** | People Tab | Invite Trustee | Name, email, phone, relationship type, personal message, consent notice. | Generates single-use expiring token; Brevo sends neutral email. |
| **MOB-SCR-15** | People Tab | Add Beneficiary | Name, email, phone, relationship type, optional private note. | Minimal PII collected; government ID not requested until release. |
| **MOB-SCR-16** | People Tab | Assignment Editor | Matrix selector matching specific assets to designated beneficiaries. | Previews exact recipient-asset map before committing. |
| **MOB-SCR-17** | Legacy Tab | Legacy Messages | Dedicated list of audio notes, personal letters, and videos for loved ones. | Contextual instructions per recipient; preview restricted to owner. |
| **MOB-SCR-18** | Settings Tab | Profile & Identity | Legal name, date of birth, nationality, residence country, identity status. | Progressive collection; restricted fields require step-up reauth. |
| **MOB-SCR-19** | Settings Tab | Security & Sessions | Active device sessions, remote session revocation, passkeys management. | Immediate server-side invalidation on device revocation. |
| **MOB-SCR-20** | Settings Tab | Inactivity & Recovery | Current inactivity policy summary (90 days + 14d grace), recovery factor verification. | Explains inactivity concern process without claiming death detection. |
| **MOB-SCR-21** | Settings Tab | Account Closure | Account closure / deletion request with legal hold and retention disclosures. | Dry-run summary; retains required audit/case records. |

---

## 2. Owner Web Experience (`apps/web/app/(owner)`)

Optimized for desktop productivity: side navigation, dense tables, drag-and-drop file upload, batch recipient assignments.

| Screen ID | Route | Name | Purpose |
| :--- | :--- | :--- | :--- |
| **WEB-OWN-01** | `/dashboard` | Owner Dashboard | High-level status, setup progress, security notices, quick actions. |
| **WEB-OWN-02** | `/vault` | Vault Browser | Filterable data table of preserved assets, version numbers, integrity states. |
| **WEB-OWN-03** | `/vault/upload` | Upload & Encryption Workspace | Drag-and-drop chunked file upload with client-side preparation progress. |
| **WEB-OWN-04** | `/people` | Trusted Network Manager | Overview of invited trustees, acceptance status, and beneficiary directory. |
| **WEB-OWN-05** | `/legacy` | Legacy Plan Matrix | Full visual grid linking assets to beneficiaries with custom delivery notes. |
| **WEB-OWN-06** | `/settings` | Security & Account Settings | Profile completion, session management, and notification channel controls. |

---

## 3. Trustee Portal (`apps/web/app/(trustee)`)

Strictly scoped workspace for nominated trustees to review obligations, confirm status, and submit death evidence.

| Screen ID | Route | Name | Purpose & Security Boundaries |
| :--- | :--- | :--- | :--- |
| **WEB-TRS-01** | `/trustee/accept?token=...` | Invitation Acceptance | Displays requesting owner name, explains trustee duties, requires explicit acceptance. |
| **WEB-TRS-02** | `/trustee/portal` | Trustee Workspace | Assigned owner accounts and active task inbox. **No vault browsing permitted.** |
| **WEB-TRS-03** | `/trustee/cases/:id/evidence` | Evidence Submission | Upload death certificate / burial permit, issuing country, authority, and signed declaration. |
| **WEB-TRS-04** | `/trustee/cases/:id/co-sign` | Trustee Co-Sign Modal | Review submitted case evidence and provide formal co-signature under step-up auth. |
| **WEB-TRS-05** | `/trustee/conflict-report` | Conflict / Uncertainty Report | File a formal conflict of interest or suspicion of fraud; freezes case immediately. |

---

## 4. Beneficiary Portal (`apps/web/app/(beneficiary)`)

Dedicated interface for designated recipients to verify identity and access specifically assigned legacy materials.

| Screen ID | Route | Name | Purpose & Security Boundaries |
| :--- | :--- | :--- | :--- |
| **WEB-BEN-01** | `/beneficiary/verify` | Recipient Identity Check | Email/phone verification and proof-of-identity step-up matching release policy. |
| **WEB-BEN-02** | `/beneficiary/portal` | Assigned Materials Hub | Lists only specifically authorized `ReleaseGrant` items. No general vault access. |
| **WEB-BEN-03** | `/beneficiary/assets/:id/view` | Secure Asset Viewer | Short-lived authorized stream for video/audio or watermarked PDF viewer. |

---

## 5. Admin Console (`apps/web/app/(admin)`)

Desktop-first administrative surface with two-person release controls, emergency holds, and immutable audit trails.

| Screen ID | Route | Name | Purpose & Governance Controls |
| :--- | :--- | :--- | :--- |
| **WEB-ADM-01** | `/admin/dashboard` | Admin Operations Overview | Real-time platform metrics, open case queues, active holds, critical alerts. |
| **WEB-ADM-02** | `/admin/cases` | Verification Case Queue | Prioritized list of death cases (Inactivity escalations and Trustee reports). |
| **WEB-ADM-03** | `/admin/cases/:id` | Case Review Workspace | Evidence checklist verification, discrepancy flags, timeline, and hold controls. |
| **WEB-ADM-04** | `/admin/cases/:id/decision` | Case Decision Modal | Primary reviewer recommendation (`RECOMMEND_APPROVAL` / `REJECT`). |
| **WEB-ADM-05** | `/admin/cases/:id/approve` | Final Release Approval | Independent second approver sign-off (`APPROVE_RELEASE`). **Reviewer != Approver.** |
| **WEB-ADM-06** | `/admin/users` | User Directory | Audited account lookup, status filters, suspension, and session revocation. |
| **WEB-ADM-07** | `/admin/security` | Security & Incident Center | Emergency system-wide or case-specific hold placement and compromise triage. |
| **WEB-ADM-08** | `/admin/audit` | Append-Only Audit Log | Filterable, read-only audit log search with correlation ID and export capabilities. |
