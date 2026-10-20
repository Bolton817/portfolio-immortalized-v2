# Legal Jurisdiction Guide & Kenya Compliance Checklist
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Chapter 2, 25 & Blueprint Alignment

---

## 1. Statutory Product Boundaries & Disclaimers

Portfolio Immortalized provides secure digital custody and controlled-release mechanisms for vital records and personal instructions.

1. **Not a Law Firm or Attorney Substitute:**
   - The platform does not provide legal advice, draft legally binding testamentary instruments, or review legal sufficiency.
   - Storage of a document does not confer probate validity, prove genuine execution, or supersede subsequent physical or formal wills under applicable law.
2. **Definition of "Beneficiary":**
   - Inside Portfolio Immortalized, "Beneficiary" designates an authorized recipient of digital assets within the application service. It does not confer legal status as an heir or estate distributee under the Law of Succession.
3. **Definition of "Trustee":**
   - The platform "Trustee" is a designated verification contact empowered to confirm status reports and submit evidence. This is an operational role and is distinct from an executor, administrator, or fiduciary trustee under trust law unless appointed by a formal court grant.

---

## 2. Kenya-First Statutory Compliance Checklist (TDD Chapter 25.4)

### A. Data Protection Act, 2019 (ODPC)
- [x] **Data Protection Impact Assessment (DPIA):** Conducted prior to production handling of special category data (biometrics, identity records, death certificates).
- [x] **Lawful Basis & Notice:** Clear, explicit consent recorded separately from terms of service; purpose-limited data processing.
- [x] **Data Subject Rights:** Mechanisms for data access, correction, restriction, and account deletion subject to documented legal hold exceptions.
- [x] **Data Minimization:** AI operations strictly minimized; no automated profiling of surviving family members.
- [x] **Cross-Border Transfers:** Verification of cloud server regions (PostgreSQL, Object Storage, Email delivery) complying with Section 48 & 49 of the Data Protection Act.

### B. Law of Succession Act (Cap. 160)
- [x] **Testamentary Requirements:** The platform reminds users that formal wills in Kenya require compliance with Section 11 of Cap. 160 (in writing, signed by testator, attested by two or more competent witnesses present at the same time).
- [x] **Evidence Standards for Death:** Only official death certificates issued by the Civil Registration Services or equivalent competent authorities, burial permits, or certified court orders are eligible for verification.
- [x] **Dispute Suspension:** Any competing claims, caveat filings, or court orders immediately trigger an administrative `HOLD`, suspending release until legal resolution.
