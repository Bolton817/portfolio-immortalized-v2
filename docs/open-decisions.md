# Open Decisions Register
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Appendix A.1 Baseline

This register tracks all open architectural, operational, and legal policy decisions that must be resolved before specific release gates.

| Decision ID | Question / Decision Area | Recommended Default Baseline | Accountable Owner | Required Milestone |
| :--- | :--- | :--- | :--- | :--- |
| **OD-01** | Can service operator ever access plaintext through the key-management path? | Document threat model; use KMS/HSM envelope encryption with narrowly gated release; do not claim zero-knowledge. | Product Owner + Security Architect | Before encryption implementation |
| **OD-02** | What recovery mechanism makes assets available after death without a single-insider bypass? | Evaluate multi-party/threshold escrow or KMS release service with independent two-person authorization. | Security Architect | Before production crypto launch |
| **OD-03** | Which exact jurisdictions are supported at initial launch? | Kenya-only supported policy; flag all other jurisdictions as unsupported or requiring legal review. | Product Owner + Legal Adviser | Before public beta |
| **OD-04** | What evidence counts as legally sufficient proof of death? | Counsel-approved evidence matrix by issuing authority/jurisdiction; AI only extracts candidate values. | Legal + Operations | Before death-case integration tests |
| **OD-05** | How many trustees and independent confirmations are required? | Two active, separately authenticated trustees by default for high-risk death release; documented exception policy. | Product Owner + Legal | Before release workflow tests |
| **OD-06** | What is the inactivity reminder schedule and grace period? | Configurable versioned policy: 75-day reminder, 90-day threshold, 14-day grace period; no schedule marks user deceased. | Product Owner | Before production notices |
| **OD-07** | One hold duration or multiple stages? | Consistent minimum policy across the app: 72-hour hold after verified critical notices, pending legal review. | Product Owner + Legal | Before public beta |
| **OD-08** | Will SMS/push be part of MVP? | Email + in-app notices first via Brevo; add SMS/push after vendor, cost, and regional risk assessment. | Product Owner + Operations | Before MVP launch |
| **OD-09** | Primary private storage provider? | Private object storage evaluated on region, KMS integration, multipart upload, lifecycle, audit, and price. | Engineering + Security | Before vault implementation |
| **OD-10** | Use Cloudinary for any confidential assets? | **No.** Default high-confidentiality vault uses private storage; Cloudinary permitted only for public marketing media. | Security + Product Owner | Immediate baseline |
| **OD-11** | Which Better Auth login factors / plugins? | Passkeys plus secure recovery preferred; email OTP available where appropriate; no bearer tokens in localStorage. | Engineering + Security | Stage 1 Foundation |
| **OD-12** | Gemini vs Claude provider choice and data terms? | Provider-neutral AI gateway; start with low-risk tasks and commercial API terms with zero data training. | Product + Privacy | Before AI pilot |
| **OD-13** | What AI data processing is user-opt-in? | Optional audio/video transcription and scan analysis require explicit separate user consent. | Privacy Lead | Before AI pilot |
| **OD-14** | What retention duration applies to evidence, audit logs, and closed accounts? | Create retention schedule after legal review; no silent purge during open cases or legal holds. | Legal + Privacy | Before production launch |
| **OD-15** | RPO / RTO targets and hosting tier? | Proposed target: Database RPO <= 24h, Service RTO <= 8h; confirm with Supabase/hosting SLA. | Operations + Owner | Before staging deployment |
| **OD-16** | Who are the named release approvers and backup approvers? | Two-person approval; roles assigned to named individual staff with offboarding controls; no shared logins. | Company Leadership | Before launch |
| **OD-17** | Does user require offline access to originals? | **No offline plaintext in MVP.** Revisit only with secure local encrypted-cache threat model. | Product + Security | Immediate baseline |
| **OD-18** | How are disputes, court orders, and family disagreements handled? | Suspend release immediately under emergency hold and route to reviewed legal escalation policy. | Legal + Operations | Before public beta |
| **OD-19** | Does watermarking apply to all release copies? | Use recipient-specific derivative where technically appropriate; preserve original uploaded bytes unmodified. | Product + Legal | Before release delivery |
| **OD-20** | Is there a legal will creation / editor feature? | **No in MVP.** Securely store existing documents and display clear disclaimers regarding legal will execution validity. | Product + Legal | Immediate baseline |
