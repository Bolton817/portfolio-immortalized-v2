import { AdminRole, AdminPermission } from './enums.js';

/**
 * Account lifecycle states for registered users
 * Compliant with ADR-007, ADM-002 and Kenya Data Protection Act 2019
 */
export enum UserAccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSURE_REQUESTED = 'CLOSURE_REQUESTED',
  PURGE_PENDING = 'PURGE_PENDING',
  PURGED = 'PURGED',
}

/**
 * Strict RBAC permission matrix mapping AdminRole to authorized AdminPermissions.
 * Appendix E.1 and ADR-007 (Separation of Duties).
 */
export const ROLE_PERMISSIONS_MATRIX: Record<AdminRole, readonly AdminPermission[]> = {
  [AdminRole.CASE_REVIEWER]: [
    AdminPermission.CASES_READ,
    AdminPermission.CASES_ASSIGN,
    AdminPermission.CASES_EVIDENCE_REQUEST,
    AdminPermission.CASES_REVIEW,
    AdminPermission.CASES_RECOMMEND,
    AdminPermission.CASES_HOLD,
    AdminPermission.USERS_READ,
    AdminPermission.RELATIONSHIPS_READ,
  ],
  [AdminRole.RELEASE_APPROVER]: [
    AdminPermission.CASES_READ,
    AdminPermission.RELEASES_PLAN_READ,
    AdminPermission.RELEASES_APPROVE,
    AdminPermission.RELEASES_REVOKE,
    AdminPermission.RELEASES_AUDIT,
    AdminPermission.CASES_HOLD,
    AdminPermission.CASES_REOPEN,
  ],
  [AdminRole.SECURITY_ADMIN]: [
    AdminPermission.SECURITY_SESSIONS_REVOKE,
    AdminPermission.SECURITY_ALERTS_READ,
    AdminPermission.SECURITY_INCIDENT_MANAGE,
    AdminPermission.SECURITY_KEYOPS_READ,
    AdminPermission.CASES_HOLD,
    AdminPermission.USERS_SUSPEND,
    AdminPermission.USERS_RESTORE,
    AdminPermission.AUDIT_READ,
    AdminPermission.AUDIT_EXPORT,
  ],
  [AdminRole.SUPPORT_ADMIN]: [
    AdminPermission.USERS_READ,
    AdminPermission.RELATIONSHIPS_READ,
    AdminPermission.RELATIONSHIPS_INVITE_RESEND,
    AdminPermission.CASES_READ,
    AdminPermission.AUDIT_READ,
  ],
  [AdminRole.AUDITOR]: [
    AdminPermission.USERS_READ,
    AdminPermission.RELATIONSHIPS_READ,
    AdminPermission.CASES_READ,
    AdminPermission.RELEASES_AUDIT,
    AdminPermission.SECURITY_ALERTS_READ,
    AdminPermission.AUDIT_READ,
    AdminPermission.AUDIT_EXPORT,
    AdminPermission.AI_JOBS_READ,
  ],
  [AdminRole.OPERATIONS_ENGINEER]: [
    AdminPermission.AUDIT_READ,
    AdminPermission.SECURITY_ALERTS_READ,
    AdminPermission.AI_JOBS_READ,
    AdminPermission.AI_TASK_DISABLE,
    AdminPermission.POLICY_CONFIGURE,
  ],
  [AdminRole.SUPER_ADMIN]: Object.values(AdminPermission),
};

/**
 * Checks whether an administrator holding any of the specified roles has the requested permission.
 */
export function hasAdminPermission(roles: AdminRole[], permission: AdminPermission): boolean {
  for (const role of roles) {
    const allowed = ROLE_PERMISSIONS_MATRIX[role];
    if (allowed && allowed.includes(permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Authorization error thrown when an administrator lacks required permissions.
 */
export class AdminAuthorizationError extends Error {
  public readonly code = 'ADMIN_AUTHORIZATION_DENIED';
  public readonly statusCode = 403;
  public readonly requiredPermission: AdminPermission;
  public readonly adminRoles: AdminRole[];

  constructor(permission: AdminPermission, roles: AdminRole[], adminId?: string) {
    super(
      `Administrator ${adminId ?? 'user'} with roles [${roles.join(', ')}] lacks required permission: ${permission}`
    );
    this.name = 'AdminAuthorizationError';
    this.requiredPermission = permission;
    this.adminRoles = roles;
  }
}

/**
 * Enforces that the administrator has the required permission, or throws AdminAuthorizationError.
 */
export function assertAdminPermission(
  roles: AdminRole[],
  permission: AdminPermission,
  adminId?: string
): void {
  if (!hasAdminPermission(roles, permission)) {
    throw new AdminAuthorizationError(permission, roles, adminId);
  }
}

/**
 * Error thrown when an account purge is attempted but blocked by an active legal hold or open death case.
 * Requirement ADM-002, Risk R-11, Law of Succession Act (Cap. 160).
 */
export class LegalHoldBlocksPurgeError extends Error {
  public readonly code = 'LEGAL_HOLD_BLOCKS_PURGE';
  public readonly statusCode = 409;
  public readonly activeHoldsCount: number;
  public readonly activeCasesCount: number;

  constructor(userId: string, activeHoldsCount: number, activeCasesCount: number) {
    super(
      `Account purge for user ${userId} is blocked by ${activeHoldsCount} active legal hold(s) and ${activeCasesCount} open death case(s). Data preservation is legally mandated.`
    );
    this.name = 'LegalHoldBlocksPurgeError';
    this.activeHoldsCount = activeHoldsCount;
    this.activeCasesCount = activeCasesCount;
  }
}

/**
 * Evaluates whether an account can be purged or if legal preservation rules block it.
 */
export function assertCanPurgeUser(
  user: { id: string; email: string; status: UserAccountStatus },
  activeHoldsCount: number,
  activeCasesCount: number
): void {
  if (activeHoldsCount > 0 || activeCasesCount > 0) {
    throw new LegalHoldBlocksPurgeError(user.id, activeHoldsCount, activeCasesCount);
  }
}

/**
 * PII masking utilities for administrative views to prevent excessive surveillance (Risk R-16).
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***@***.***';
  const [local, domain] = parts;
  if (!local || !domain) return '***@***.***';
  const maskedLocal = local.length <= 2 ? `${local[0]}***` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
}

export function maskIdentifier(id: string): string {
  if (id.length <= 8) return '****';
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return 'N/A';
  if (phone.length <= 4) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}
