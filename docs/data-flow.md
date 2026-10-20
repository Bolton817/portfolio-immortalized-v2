# End-to-End Data Flow & Sequence Specifications
**Portfolio Immortalized — Pie Corp Limited**
**Document Control:** TDD Chapter 10, 11, 13, 18, 23 & 24

This document defines the primary request paths and stateful lifecycles for critical platform workflows.

---

## 1. Owner Vault Upload & Envelope Encryption Flow

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Account Holder
    participant Client as Mobile / Web Client
    participant API as Next.js API Route (/api/v1/uploads)
    participant DAL as Data Access Layer
    participant KMS as KMS / HSM Key Service
    participant Storage as Private Object Storage
    participant DB as PostgreSQL (Supabase)

    Owner->>Client: Selects file (e.g. Will.pdf)
    Client->>API: POST /api/v1/uploads (Create Upload Intent)
    Note over API: Validates mime type, size, quota,<br/>derives ownerId from trusted session
    API-->>Client: Returns uploadId, maxChunkBytes, preparation policy

    Note over Client,KMS: Envelope Encryption Phase
    Client->>API: POST /api/v1/assets/prepare-key (or server-side envelope)
    API->>KMS: wrapKey(DEK, KEK_Reference)
    KMS-->>API: Returns wrapped DEK
    API->>Storage: Store encrypted ciphertext
    API->>DB: In single transaction:<br/>1. Create Asset & AssetVersion<br/>2. Create StorageObjectRef & KeyEnvelope<br/>3. Emit AuditEvent & OutboxEvent
    DB-->>API: Commit confirmed
    API-->>Client: 201 Created (Asset metadata committed)
    Client-->>Owner: Displays "Vault Protected - Item Saved"
```

---

## 2. Inactivity Monitoring & Concern Escalation Flow

```mermaid
sequenceDiagram
    autonumber
    participant Worker as Scheduled Inactivity Worker
    participant DB as PostgreSQL (Supabase)
    participant Outbox as Transactional Outbox
    participant Brevo as Brevo Notification Adapter
    actor Owner as Account Holder

    loop Periodic Sweep (Daily)
        Worker->>DB: Query accounts with (NOW - lastMeaningfulActivityAt) >= 75 days
        Note over Worker: Filters out passive app pings,<br/>evaluates InactivityPolicyConfig
        
        alt 75 Days Inactive (Reminder Due)
            Worker->>Outbox: Enqueue discreet owner reminder
        else 90 Days Inactive (Threshold Reached)
            Worker->>DB: In transaction:<br/>1. Set case.state = INACTIVITY_REVIEW<br/>2. Emit AuditEvent & OutboxEvent
            Worker->>Outbox: Enqueue critical owner inquiry
        else 104 Days Inactive (Grace Period Expired)
            Worker->>DB: In transaction:<br/>1. Set case.state = UNDER_REVIEW<br/>2. Enqueue trustee inquiry notifications
        end
    end

    Outbox->>Brevo: Deliver neutral notification email
    Brevo-->>Owner: Delivers email ("Routine account check required")
    
    opt Owner Logs In / Reconfirms
        Owner->>DB: Authenticated meaningful activity
        DB->>DB: 1. Reset lastMeaningfulActivityAt = NOW()<br/>2. Transition case to CLOSED_NO_EVIDENCE<br/>3. Cancel scheduled escalation
    end
```

---

## 3. Trustee Death Evidence Submission & Review

```mermaid
sequenceDiagram
    autonumber
    actor Trustee as Appointed Trustee
    participant Portal as Trustee Portal (/trustee)
    participant API as Next.js API (/api/v1/cases/:id/evidence)
    participant DB as PostgreSQL (Supabase)
    actor Admin1 as Case Reviewer (Admin)

    Trustee->>Portal: Enters death report & uploads Certificate
    Portal->>API: POST /api/v1/cases/:id/evidence
    Note over API: Checks caller is active trustee for owner.<br/>Requires submitter certification.<br/>Files quarantined for malware scan.
    API->>DB: 1. Transition case to EVIDENCE_PENDING<br/>2. Store DeathEvidence record & file hash<br/>3. Write AuditEvent
    API-->>Portal: 202 Accepted (Case updated)

    Admin1->>API: Review evidence against official checklists
    alt Insufficient Evidence
        Admin1->>API: POST /api/v1/cases/:id/review-decision (NEEDS_MORE_INFO)
    else Evidence Verified & Quorum Met
        Admin1->>API: POST /api/v1/cases/:id/review-decision (RECOMMEND_APPROVAL)
        API->>DB: Transition case to READY_FOR_SECOND_REVIEW
        Note over API,DB: Locks reviewerId = Admin1.<br/>Admin1 CANNOT approve final release.
    end
```

---

## 4. Two-Person Final Release & Beneficiary Access Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin2 as Release Approver (Admin != Admin1)
    participant API as Next.js API (/api/v1/cases/:id/final-approval)
    participant DB as PostgreSQL (Supabase)
    participant Worker as Release Planner Worker
    actor Beneficiary as Designated Recipient
    participant BenPortal as Beneficiary Portal

    Admin2->>API: POST /api/v1/cases/:id/final-approval
    Note over API: ENFORCE SEPARATION OF DUTIES:<br/>assert(Admin2.id !== case.reviewerId)<br/>assert(no active holds)
    API->>DB: In transaction:<br/>1. Transition case to AUTHORIZED<br/>2. Record CaseDecision (FINAL_APPROVAL)<br/>3. Emit AuditEvent
    
    Worker->>DB: Claim AUTHORIZED case
    Worker->>DB: Generate ReleaseGrant for each beneficiary<br/>mapping only specifically assigned AssetVersions
    Worker->>DB: Transition case to RELEASED
    
    Beneficiary->>BenPortal: Access link from notification
    BenPortal->>API: GET /api/v1/beneficiary/grants
    Note over API: Validates identity & grant validity (active, not expired, not revoked)
    API-->>BenPortal: Returns authorized item list
    Beneficiary->>BenPortal: Requests asset download/view
    BenPortal->>API: POST /api/v1/beneficiary/grants/:id/access
    Note over API: Decrypts only the granted item in memory,<br/>watermarks derivative with recipient name & date,<br/>and logs AuditEvent.
    API-->>Beneficiary: Delivers asset stream
```
