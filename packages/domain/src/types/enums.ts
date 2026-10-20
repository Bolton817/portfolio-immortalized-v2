/**
 * Data classification levels based on TDD Appendix I.1
 */
export enum DataClassification {
  C0_PUBLIC = 'C0_PUBLIC',
  C1_INTERNAL = 'C1_INTERNAL',
  C2_PRIVATE_PERSONAL = 'C2_PRIVATE_PERSONAL',
  C3_HIGH_CONFIDENTIAL = 'C3_HIGH_CONFIDENTIAL',
  C4_CRITICAL_SECRETS = 'C4_CRITICAL_SECRETS',
}

/**
 * Types of legacy assets allowed in the vault
 */
export enum AssetType {
  WILL = 'WILL',
  IDENTITY = 'IDENTITY',
  DOCUMENT = 'DOCUMENT',
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  MESSAGE = 'MESSAGE',
  EVIDENCE = 'EVIDENCE',
  OTHER = 'OTHER',
}

/**
 * Confidentiality sensitivity levels for assets
 */
export enum AssetSensitivity {
  HIGH_CONFIDENTIAL = 'HIGH_CONFIDENTIAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  GENERAL_PRIVATE = 'GENERAL_PRIVATE',
  PUBLIC_APPROVED = 'PUBLIC_APPROVED',
}

/**
 * Asset operational lifecycle status
 */
export enum AssetStatus {
  PENDING = 'PENDING',
  AVAILABLE = 'AVAILABLE',
  QUARANTINED = 'QUARANTINED',
  RETIRED = 'RETIRED',
  LEGAL_HOLD = 'LEGAL_HOLD',
  PURGE_PENDING = 'PURGE_PENDING',
  PURGED = 'PURGED',
}

/**
 * Malware / integrity scan status for an asset version
 */
export enum VersionScanStatus {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  SUSPICIOUS = 'SUSPICIOUS',
  FAILED = 'FAILED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

/**
 * Network relationship role
 */
export enum RelationshipRole {
  TRUSTEE = 'TRUSTEE',
  BENEFICIARY = 'BENEFICIARY',
}

/**
 * Relationship invitation and engagement status
 */
export enum RelationshipStatus {
  INVITED = 'INVITED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  REMOVED = 'REMOVED',
  UNREACHABLE = 'UNREACHABLE',
}

/**
 * Formal Death Case workflow states (Chapter 11 & Appendix C)
 */
export enum DeathCaseState {
  NONE = 'NONE',
  INACTIVITY_REVIEW = 'INACTIVITY_REVIEW',
  REPORTED = 'REPORTED',
  EVIDENCE_PENDING = 'EVIDENCE_PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  NEEDS_MORE_INFO = 'NEEDS_MORE_INFO',
  DISPUTED = 'DISPUTED',
  HOLD = 'HOLD',
  READY_FOR_SECOND_REVIEW = 'READY_FOR_SECOND_REVIEW',
  AUTHORIZED = 'AUTHORIZED',
  RELEASE_IN_PROGRESS = 'RELEASE_IN_PROGRESS',
  RELEASED = 'RELEASED',
  REJECTED = 'REJECTED',
  CLOSED_NO_EVIDENCE = 'CLOSED_NO_EVIDENCE',
  REVOKED_EXPIRED = 'REVOKED_EXPIRED',
}

/**
 * How a death case was initiated
 */
export enum CaseInitiationType {
  INACTIVITY = 'INACTIVITY',
  TRUSTEE_REPORT = 'TRUSTEE_REPORT',
  ADMIN_REPORT = 'ADMIN_REPORT',
  EXTERNAL_NOTICE = 'EXTERNAL_NOTICE',
  OTHER_APPROVED = 'OTHER_APPROVED',
}

/**
 * Administrator case decision types
 */
export enum CaseDecisionType {
  RECOMMEND_APPROVAL = 'RECOMMEND_APPROVAL',
  RECOMMEND_REJECTION = 'RECOMMEND_REJECTION',
  FINAL_APPROVAL = 'FINAL_APPROVAL',
  FINAL_REJECTION = 'FINAL_REJECTION',
  HOLD = 'HOLD',
  REOPEN = 'REOPEN',
}

/**
 * Status of an issued release grant for a beneficiary
 */
export enum ReleaseGrantStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

/**
 * Reason codes for placing a case on hold
 */
export enum CaseHoldReasonCode {
  OWNER_RESPONSE_RECEIVED = 'OWNER_RESPONSE_RECEIVED',
  CONFLICTING_EVIDENCE = 'CONFLICTING_EVIDENCE',
  SUSPECTED_FRAUD = 'SUSPECTED_FRAUD',
  LEGAL_DISPUTE = 'LEGAL_DISPUTE',
  ADMINISTRATIVE_HOLD = 'ADMINISTRATIVE_HOLD',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
}

/**
 * Administrative roles with granular separation of duties
 */
export enum AdminRole {
  SUPPORT_ADMIN = 'SUPPORT_ADMIN',
  SECURITY_ADMIN = 'SECURITY_ADMIN',
  CASE_REVIEWER = 'CASE_REVIEWER',
  RELEASE_APPROVER = 'RELEASE_APPROVER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  AUDITOR = 'AUDITOR',
  OPERATIONS_ENGINEER = 'OPERATIONS_ENGINEER',
}

/**
 * Specific permission catalogue IDs (Appendix E.1)
 */
export enum AdminPermission {
  USERS_READ = 'users.read',
  USERS_SUSPEND = 'users.suspend',
  USERS_RESTORE = 'users.restore',
  USERS_CLOSE_REQUEST = 'users.close.request',
  USERS_PURGE_APPROVE = 'users.purge.approve',
  RELATIONSHIPS_READ = 'relationships.read',
  RELATIONSHIPS_CORRECT = 'relationships.correct',
  RELATIONSHIPS_REMOVE = 'relationships.remove',
  RELATIONSHIPS_INVITE_RESEND = 'relationships.invite.resend',
  CASES_READ = 'cases.read',
  CASES_ASSIGN = 'cases.assign',
  CASES_EVIDENCE_REQUEST = 'cases.evidence.request',
  CASES_REVIEW = 'cases.review',
  CASES_RECOMMEND = 'cases.recommend',
  CASES_HOLD = 'cases.hold',
  CASES_REOPEN = 'cases.reopen',
  RELEASES_PLAN_READ = 'releases.plan.read',
  RELEASES_APPROVE = 'releases.approve',
  RELEASES_REVOKE = 'releases.revoke',
  RELEASES_AUDIT = 'releases.audit',
  SECURITY_SESSIONS_REVOKE = 'security.sessions.revoke',
  SECURITY_ALERTS_READ = 'security.alerts.read',
  SECURITY_INCIDENT_MANAGE = 'security.incident.manage',
  SECURITY_KEYOPS_READ = 'security.keyops.read',
  AUDIT_READ = 'audit.read',
  AUDIT_EXPORT = 'audit.export',
  AI_JOBS_READ = 'ai.jobs.read',
  AI_TASK_DISABLE = 'ai.task.disable',
  ADMIN_ROLES_ASSIGN = 'admin.roles.assign',
  POLICY_CONFIGURE = 'policy.configure',
}

/**
 * Operational status of a legacy plan
 */
export enum LegacyPlanStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SUPERSEDED = 'SUPERSEDED',
}

/**
 * Triggers determining when a beneficiary receives their assigned materials
 */
export enum LegacyDeliveryTrigger {
  UPON_RELEASE_AUTHORIZATION = 'UPON_RELEASE_AUTHORIZATION',
  SCHEDULED_DAYS_AFTER_RELEASE = 'SCHEDULED_DAYS_AFTER_RELEASE',
}

