import { AdminRole, ReleaseGrantStatus } from '@portfolio-immortalized/domain';

export class DalAuthorizationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 403) {
    super(message.includes(code) ? message : `[${code}] ${message}`);
    this.name = 'DalAuthorizationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Enforces ownership boundary: only the authenticated owner can access their own private resources.
 */
export function assertOwnerAccess(actorUserId: string, resourceOwnerId: string): void {
  if (!actorUserId || actorUserId !== resourceOwnerId) {
    throw new DalAuthorizationError(
      'ACCESS_DENIED',
      'You do not have permission to view or modify this resource.',
      403
    );
  }
}

/**
 * Enforces administrative role requirement.
 */
export function assertAdminRole(actorRole: string, allowedRoles: AdminRole[]): void {
  if (!allowedRoles.includes(actorRole as AdminRole)) {
    throw new DalAuthorizationError(
      'INSUFFICIENT_ADMIN_PRIVILEGE',
      'Your administrative role does not have permission to perform this action.',
      403
    );
  }
}

/**
 * Validates that a release grant is active, unexpired, and not revoked.
 */
export function assertValidReleaseGrant(
  grant: {
    status: string;
    expiresAt: Date;
    revokedAt?: Date | null;
  },
  checkTime: Date = new Date()
): void {
  if (grant.status !== ReleaseGrantStatus.ACTIVE) {
    throw new DalAuthorizationError(
      'RELEASE_GRANT_INACTIVE',
      `This release grant is currently in status ${grant.status} and cannot be accessed.`,
      403
    );
  }

  if (grant.revokedAt) {
    throw new DalAuthorizationError(
      'RELEASE_GRANT_REVOKED',
      'This release grant has been revoked.',
      403
    );
  }

  if (checkTime.getTime() > grant.expiresAt.getTime()) {
    throw new DalAuthorizationError(
      'RELEASE_GRANT_EXPIRED',
      'This release grant has expired.',
      403
    );
  }
}

/**
 * Enforces REL-04: Trustees are verification contacts only and have zero implicit access to the private vault.
 */
export function assertTrusteeCannotAccessVault(role: string): void {
  if (role === 'TRUSTEE') {
    throw new DalAuthorizationError(
      'TRUSTEE_VAULT_ACCESS_FORBIDDEN',
      'Trustees are verification contacts only and have zero access to private vault contents (REL-04).',
      403
    );
  }
}

