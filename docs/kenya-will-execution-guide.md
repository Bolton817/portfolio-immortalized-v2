# Statutory Will Execution & Probate Guide (Republic of Kenya)
**Kenya Law of Succession Act (Cap. 160) & Probate Rules**
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Appendix A (OD-20, WILL-001)

---

## 1. Statutory Legal Framework

Under Kenyan law, the creation, execution, and probate of written testamentary dispositions are strictly governed by the **Law of Succession Act (Cap. 160 of the Laws of Kenya)** and the **Probate and Administration Rules**. 

The Portfolio Immortalized Statutory Will Builder generates formal testamentary documents specifically structured to comply with Kenyan jurisprudence, the High Court of Kenya Probate and Administration Division, and subordinate magistrates' courts having jurisdiction.

---

## 2. Core Legal Requirements for Execution

### 2.1 Testamentary Capacity (Section 5, Cap. 160)
- **Age:** The testator must have attained the age of majority (**eighteen (18) years**).
- **Sound Mind:** The testator must be of sound mind, memory, and understanding at the time of execution. A will or any part thereof, the making of which has been caused by fraud, coercion, importunity, or mistake, is void under Section 7.

### 2.2 Formalities of Execution (Section 11, Cap. 160)
For a written will to be valid in Kenya, Section 11 imposes mandatory statutory requirements:
1. **Signature by Testator:** The will must be signed by the testator (or marked with their thumbprint), or signed by some other person in the testator's presence and by their direction.
2. **Joint Witness Quorum:** The testator's signature must be made or acknowledged in the presence of **at least two (2) competent adult witnesses present at the exact same time**.
3. **Attestation in Testator's Presence:** Each witness must sign/attest the will in the presence of the testator. (The witnesses need not sign in each other's presence, though doing so simultaneously in the presence of all parties is standard best practice to prevent probate challenges).

---

## 3. The Witness Forfeiture Rule (Section 13, Cap. 160)

> [!CAUTION]
> **Statutory Disqualification of Beneficiary Witnesses:**
> Under **Section 13 of Cap. 160**, if any person who attests the execution of a will (or the spouse of such person) is named as a beneficiary to any bequest, legacy, or interest in the estate, **that gift or bequest is completely NULL AND VOID**.
> 
> The will itself remains valid, but the witness and their spouse forfeit all rights to inherit under that testamentary instrument.

### Verification Enforced by Portfolio Immortalized:
The `Cap160WillValidator` automatically scans:
- All nominated witness names and Kenyan National Identity Card numbers.
- All primary and contingent beneficiaries named in specific bequests and residuary estate allocations.
- Flags an immediate blocking error (`Section 13 Cap. 160 Statutory Conflict`) if any match is detected, requiring the testator to nominate completely independent witnesses (e.g., an Advocate of the High Court of Kenya, a doctor, a banker, or an independent colleague).

---

## 4. Appointment of Executors & Trustees (Section 21)

Under Section 21 of Cap. 160, a testator may appoint one or more executors to prove the will and administer the estate:
- **Primary Executor:** At least one primary executor must be nominated.
- **Alternate / Substitute Executor:** Recommended in case the primary executor predeceases the testator, renounces probate, or is unable to act.
- **Minors:** If any beneficiary is a minor child under 18 years, Section 21 mandates the appointment of at least **two executors/trustees** or a trust corporation for grant of representation with will annexed.

---

## 5. Integration with Portfolio Immortalized Encrypted Vault

Kenyan probate courts require clarity regarding physical and intangible assets. Portfolio Immortalized incorporates a dedicated statutory testamentary clause:

```text
5. DIGITAL LEGACY & PORTFOLIO IMMORTALIZED VAULT ASSETS
I direct that my private digital documents, memory recordings, letters, and estate records 
securely stored in my Portfolio Immortalized encrypted vault (Pie Corp Limited) shall be released 
strictly in accordance with my registered Legacy Plan instructions and controlled verification policies.
```

This legally authorizes the named executors to recognize the automated cryptographic release of digital documents and directives upon certified death verification, preventing disputes over unauthorized digital asset access.

---

## 6. Physical Custody Registry & Storage

A will cannot be probated as a digital-only copy under current Kenyan court practice; the **original physical signed paper will** must be lodged in court during the petition for grant of probate.

Portfolio Immortalized provides the **Physical Custody Registry** (`WillDal.recordPhysicalCustody`) to track:
1. **Bank Safe Deposit Box:** Bank name, branch (e.g., KCB, NCBA, Stanbic, Equity), box number, and authorized keyholders.
2. **Law Firm / Advocate Custody:** Name of law firm, practicing advocate contact details, physical office location, and safe deposit reference.
3. **Private Safe / Home Custody:** Fireproof safe location, trusted custodian details.

---

## 7. High Court Probate Petition Checklist (Post-Mortem)

Upon the death of the testator, the named executors must present the following documents to the High Court of Kenya (Probate and Administration Division):
1. **Original Will:** The original signed and attested will document.
2. **Death Certificate:** Certified copy of the official entry in the Register of Deaths issued by the Civil Registration Department (Form D2 / Births and Deaths Registration Act Cap. 149).
3. **Petition for Probate (P&A Form 78):** Duly verified by the executors.
4. **Affidavit of Justification of Executors (P&A Form 80).**
5. **Affidavit of Due Execution (P&A Form 3):** Sworn by one of the attesting witnesses confirming they saw the testator sign.
6. **Schedule of Assets and Liabilities (P&A Form 109).**
7. **Gazette Notice:** Publication in the Kenya Gazette for 30 days to invite objections before the Grant of Probate is issued.
