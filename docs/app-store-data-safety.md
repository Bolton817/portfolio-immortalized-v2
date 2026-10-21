# Mobile App Store & Google Play Data Safety Disclosures
**Application:** Portfolio Immortalized (`com.piecorp.portfolioimmortalized`)  
**Operating Entity:** Pie Corp Limited (Nairobi, Kenya)  
**TDD Reference:** Chapter 35 (App Store & Play Store Compliance), Chapter 14 (Security Architecture)  
**Regulatory Baselines:** Apple App Store Review Guidelines (5.1.1, 5.1.2, 2.1), Google Play User Data Policy, Kenya Data Protection Act 2019 (Section 40), Law of Succession Act (Cap. 160).

---

## 1. Apple App Store Privacy Nutrition Labels

### 1.1 Data Used to Track You
* **Tracking Status:** **NO DATA COLLECTED FOR TRACKING.**  
* Portfolio Immortalized does not display third-party advertisements, does not integrate cross-app ad brokers (IDFA/GAID tracking is completely disabled), and does not share user identifiers with data brokers.

### 1.2 Data Linked to You
The following data categories are collected and linked to the user's authenticated account identity strictly for core estate planning functionality:

| Data Category | Data Type | Purpose | Encryption Status | Retention & Deletion |
| :--- | :--- | :--- | :--- | :--- |
| **Contact Info** | Name, Email address, Phone number | Account registration, Multi-Factor Authentication (SMS/TOTP), Security verification | Encrypted at rest (AES-256) & transit (TLS 1.3) | Deletable via in-app account deletion (subject to statutory holds) |
| **User Content** | Documents, Photos, Audio, Video (Vault assets) | Digital estate asset preservation and beneficiary allocation | Envelope encrypted client/server with per-asset DEK & KMS KEK | Deletable by owner; frozen upon death case opening |
| **Identifiers** | User ID, Device ID (push tokens) | Account management, APNs push alerts for inactivity/security | Hashed / pseudonymous | Purged upon device unlinking or account closure |
| **Sensitive Info** | Trustee/Beneficiary relationship mapping, Estate instructions | Execution of digital legacy plan | Field-level encrypted in relational database | Retained per succession statutory requirements |
| **Diagnostics** | Crash reports, Performance logs | App stability, system observability | Scrubbed of PII (regex sanitization of emails/phones) | Automatically rolled over after 90 days |

### 1.3 Data Not Linked to You
* Aggregate crash rates and memory performance metrics collected via sanitized, unauthenticated crash reporters.

---

## 2. Google Play Data Safety Section Declarations

### 2.1 Data Collection & Security Disclosures
* **Data Transferred in Transit:** All network communication is strictly encrypted over HTTPS using **TLS 1.3** with strict certificate pinning and modern cipher suites (`ECDHE-ECDSA-AES128-GCM-SHA256`).
* **Data Encrypted at Rest:** All stored user metadata is encrypted using **AES-256-GCM**. Vault payload blobs are envelope-encrypted using isolated envelope data keys (`DEK`) wrapped by Cloud KMS root keys (`KEK`).
* **Independent Security Review:** System adheres to annual external penetration testing and automated adversarial CI verification (`server/tests/security-penetration.test.ts`).

### 2.2 Category Declarations in Google Play Console

1. **Personal Info:**
   - *Name, Email Address, Phone Number:* Collected for App Functionality, Account Management, Fraud Prevention.
2. **Financial Info:**
   - *In-App Purchase / Subscription History:* Processed through Google Play Billing. Raw payment cards are never handled or stored by Pie Corp Limited.
3. **Photos and Videos:**
   - *User Vault Media:* Collected solely for user-initiated digital estate storage. Never shared with third parties or used for model training/advertising.
4. **Audio Files:**
   - *Voice Memos / Legacy Instructions:* Collected strictly upon user recording.
5. **Files and Docs:**
   - *Wills, Title Deeds, Insurance Policies, Scanned Paperwork:* Collected strictly for legacy vault preservation.
6. **Device or Other Identifiers:**
   - *Firebase Cloud Messaging (FCM) Token:* Collected strictly for push delivery of critical inactivity warnings and security alerts.

---

## 3. Account Deletion Compliance (Apple Guideline 5.1.1(v) & KDPA Sec 40)

### 3.1 In-App Deletion Mechanism
* **Screen Location:** Settings Tab -> Profile Screen -> "Delete Account & Purge Vault" (`apps/mobile/src/screens/settings/ProfileScreen.tsx`).
* **Web Portal Equivalent:** Profile Management -> Account Settings -> "Initiate Account Closure".

### 3.2 Statutory Retention & Legal Hold Disclosures
In accordance with Section 40 of the Kenya Data Protection Act 2019 and the Law of Succession Act (Cap. 160):
1. **Immediate Purge:** If the account has no active verification cases, no pending trustee claims, and no statutory audit holds, the account status transitions to `PENDING_DELETION`. All encryption keys in KMS for vault assets are marked for cryptographic erasure (destruction within 30 days).
2. **Statutory Retention Holds:** If an active estate verification investigation or death claim has been formally initiated, data deletion is legally stayed (`PEN-14` / `ADMIN-03`). The user is notified in-app of the statutory hold with citation to Cap. 160.

---

## 4. App Store Reviewer Sandbox & Testing Credentials (TDD Chapter 35.3)

To enable App Store and Google Play policy reviewers to test all mobile features without requiring external phone verification or live death certificates:

### 4.1 Demo Sandbox Accounts
| Account Type | Email | Password | Pre-Seeded State |
| :--- | :--- | :--- | :--- |
| **Estate Owner (Standard)** | `reviewer@piecorp.co` | `AppleReview2026!#` | 3 vault assets, 2 verified trustees, 1 legacy plan |
| **Estate Owner (Empty)** | `test-reviewer-new@apple.com` | `StoreReview2026!#` | Clean onboarding state, profile checklist at 25% |
| **Trustee Demo** | `reviewer-trustee@piecorp.co` | `StoreTrustee2026!#` | Trustee invitation pending claim acceptance |

### 4.2 Synthetic Reviewer Isolation Modes
1. **SMS & Email Mocking:** The backend detects `isReviewerAccount()` (emails matching `@piecorp.co` or `*reviewer*@apple.com`) and automatically returns static OTP `123456` in logs without dispatching external SMS/Email carrier fees.
2. **Biometric Simulator:** The mobile client supports Expo LocalAuthentication fallback for simulated biometric enrollment on App Store Review simulators.
3. **Readiness Probe:** Reviewers can inspect the public health endpoint at `https://api.portfolioimmortalized.com/api/v1/health` for real-time subsystem verification.

---

## 5. Mobile Runtime Permissions Justification

| Permission | Android Manifest / iOS Info.plist Key | User-Facing Usage String | Justification |
| :--- | :--- | :--- | :--- |
| **Camera** | `NSCameraUsageDescription` / `android.permission.CAMERA` | "Portfolio Immortalized needs camera access to scan physical documents, wills, and estate records into your encrypted vault." | Required for the in-app document scanner (`ScannerScreen.tsx`) to digitize estate documents. |
| **Microphone** | `NSMicrophoneUsageDescription` / `android.permission.RECORD_AUDIO` | "Portfolio Immortalized needs microphone access to record encrypted audio messages and legacy instructions for your beneficiaries." | Required for voice legacy recordings. |
| **Biometrics** | `NSFaceIDUsageDescription` / `android.permission.USE_BIOMETRIC` | "Portfolio Immortalized uses Face ID to quickly and securely unlock your encrypted vault." | Required for hardware-backed local device vault unlocking without password re-entry. |
