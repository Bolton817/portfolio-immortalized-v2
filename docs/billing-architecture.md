# Billing & Monetization Architecture
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Chapter 34, Appendix A (OD-08, OD-15), BILL-001

---

## 1. Executive Summary

Portfolio Immortalized implements a dual-gateway monetization architecture tailored to both domestic Kenyan subscribers and the international diaspora. The billing subsystem enables seamless subscription management across three distinct tiers, enforcing hard operational quotas and feature access gates while maintaining zero cardholder data on application servers in strict compliance with PCI-DSS SAQ-A and the Kenya Data Protection Act (KDPA) 2019.

---

## 2. Subscription Tiers & Quota Matrix

| Tier | Billing Cycle | Domestic Price (KES) | International Price (USD) | Encrypted Storage | Max Trustees | Max Beneficiaries | Media Memos | Statutory Will Builder | Priority Triage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Starter** | Lifetime Free | KES 0 | $0 | 1 GB | 2 | 3 | ❌ Disabled | ❌ Disabled | ❌ Standard |
| **Heritage** | Annual | KES 4,999 / yr | $39.99 / yr | 25 GB | 5 | 20 | ✅ Enabled | ✅ Cap. 160 Compliant | ✅ Expedited |
| **Dynasty** | Annual | KES 14,999 / yr | $149.99 / yr | 100 GB | Unlimited | Unlimited | ✅ Enabled | ✅ Cap. 160 Compliant | ✅ Dedicated SLA |

---

## 3. Dual Payment Gateway Architecture

```
                       +-----------------------------------+
                       |    Client (Web / iOS / Android)   |
                       +-----------------+-----------------+
                                         |
                       +-----------------v-----------------+
                       |     API Gateway / Billing Routes  |
                       +--------+--------------------+-----+
                                |                    |
              (Kenyan Shillings |                    | (Foreign Cards
                    STK Push)   |                    |   Stripe Checkout)
                                v                    v
                 +-------------------+          +-------------------+
                 | Safaricom Daraja  |          |  Stripe Billing   |
                 |  2.0 STK Push API |          |  Checkout & Portal|
                 +---------+---------+          +---------+---------+
                           |                              |
                  (Callback Payload)             (Webhook Event)
                           v                              v
                 +-------------------+          +-------------------+
                 |   MpesaService    |          |   StripeService   |
                 +---------+---------+          +---------+---------+
                           |                              |
                           +--------------+---------------+
                                          |
                                          v
                               +--------------------+
                               |     BillingDal     |
                               +----------+---------+
                                          |
                                          v
                               +--------------------+
                               | TierQuotaEnforcer  |
                               +--------------------+
```

### 3.1 Domestic Mobile Money: Safaricom M-Pesa Daraja 2.0
- **Protocol:** REST JSON over HTTPS with OAuth 2.0 Bearer token authentication.
- **Workflow:**
  1. The user initiates a subscription upgrade from the web or mobile app, providing their active Safaricom phone number (`07...` or `01...`).
  2. The server normalizes the MSISDN to E.164 (`+254...`) and issues an asynchronous STK Push request to the Safaricom Daraja endpoint.
  3. The request includes a SHA-256 base64 password generated via:
     $$\text{Password} = \text{Base64Encode}(\text{ShortCode} \parallel \text{Passkey} \parallel \text{Timestamp})$$
  4. The subscriber receives an instant USSD prompt on their handset requesting their secret M-Pesa PIN.
  5. Safaricom delivers an asynchronous callback to `/api/v1/billing/mpesa`. Upon verifying `ResultCode === 0`, the transaction receipt number (`MpesaReceiptNumber`) is recorded, the subscription status is set to `ACTIVE`, and an invoice record is minted.

### 3.2 International Card Billing: Stripe Billing
- **Protocol:** Hosted Stripe Checkout Sessions and Customer Portals.
- **Security:**
  - Zero PAN, CVV, or cardholder credentials touch Pie Corp Limited servers.
  - Transactions are initiated with cryptographically signed metadata.
  - Asynchronous webhook events (`checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_succeeded`) are processed idempotently.

---

## 4. Tier Quota Enforcement & Operational Boundaries

The `TierQuotaEnforcer` acts as a mandatory pre-condition guard across storage, relationship nomination, and statutory will builder modules:

1. **Storage Quota (`assertStorageWithinQuota`):**
   - Evaluates current vault asset footprint plus incoming asset payload before generating pre-signed S3/KMS upload URLs.
   - Throws `QuotaExceededError (STORAGE_QUOTA_EXCEEDED)` if the upload breaches the tier cap (1GB / 25GB / 100GB).
2. **Trustee Quota (`assertTrusteeWithinLimit`):**
   - Blocks trustee invitations beyond the tier maximum (2 for Starter, 5 for Heritage).
3. **Beneficiary Quota (`assertBeneficiaryWithinLimit`):**
   - Restricts legacy plan beneficiary nominations beyond tier limits.
4. **Feature Gates (`assertFeatureAllowed`):**
   - Enforces Heritage/Dynasty requirement for accessing the interactive Statutory Will Builder (`WILL_BUILDER`) and video/audio memo recordings (`MEDIA_MEMOS`).

---

## 5. Security & Statutory Compliance (PCI-DSS & KDPA 2019)

- **Zero Cardholder Storage:** No payment card numbers, verification values (CVV), or bank accounts are stored. Only tokenized external subscription IDs and transaction references are retained in `BillingDal`.
- **Neutral Audit Trails:** Every subscription update, quota breach, and invoice generation is recorded in the append-only `AuditService` table with actor context, timestamp, and transaction hashes.
- **Data Subject Rights:** Subscription and invoice histories are tied to the tenant's isolated data partition, exportable under KDPA Section 40, and scrubbed upon confirmed account deletion under legal retention bounds.
