import {
  AdminRole,
  UserAccountStatus,
  maskEmail,
} from '@portfolio-immortalized/domain';
import {
  ListAdminUsersQueryInput,
} from '@portfolio-immortalized/validation';
import { AuditService } from '../audit/logger.js';

export interface UserAccountRecord {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  status: UserAccountStatus;
  roles: AdminRole[];
  activeSessionsCount: number;
  lastMeaningfulActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaskedUserSummary {
  id: string;
  email: string;
  maskedEmail: string;
  displayName: string;
  emailVerified: boolean;
  status: UserAccountStatus;
  roles: AdminRole[];
  activeSessionsCount: number;
  lastMeaningfulActivityAt: string;
  createdAt: string;
}

export interface SystemHoldStatus {
  active: boolean;
  reasonCode?: string;
  rationale?: string;
  placedById?: string;
  placedAt?: Date;
  liftedById?: string;
  liftedRationale?: string;
  liftedAt?: Date;
}

export class AdminDalError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AdminDalError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Administrative DAL providing audited management of user lifecycles,
 * remote session revocation, and platform-wide emergency hold status.
 */
export class AdminDal {
  private users: Map<string, UserAccountRecord> = new Map();
  private systemHold: SystemHoldStatus = { active: false };
  private auditService: AuditService;

  constructor(auditService: AuditService = new AuditService()) {
    this.auditService = auditService;
    this.seedDefaultUsers();
  }

  private seedDefaultUsers(): void {
    const defaultUsers: UserAccountRecord[] = [
      {
        id: 'usr_owner_1',
        email: 'owner1@example.com',
        displayName: 'Mwangi Kamau',
        emailVerified: true,
        status: UserAccountStatus.ACTIVE,
        roles: [],
        activeSessionsCount: 2,
        lastMeaningfulActivityAt: new Date(),
        createdAt: new Date('2026-01-15T08:00:00Z'),
        updatedAt: new Date(),
      },
      {
        id: 'usr_owner_2',
        email: 'wairimu.chege@example.com',
        displayName: 'Wairimu Chege',
        emailVerified: true,
        status: UserAccountStatus.ACTIVE,
        roles: [],
        activeSessionsCount: 1,
        lastMeaningfulActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45), // 45 days ago
        createdAt: new Date('2026-02-01T09:30:00Z'),
        updatedAt: new Date(),
      },
      {
        id: 'usr_suspended_1',
        email: 'otieno.juma@example.com',
        displayName: 'Otieno Juma',
        emailVerified: true,
        status: UserAccountStatus.SUSPENDED,
        roles: [],
        activeSessionsCount: 0,
        lastMeaningfulActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
        createdAt: new Date('2026-02-10T11:00:00Z'),
        updatedAt: new Date(),
      },
      {
        id: 'usr_admin_reviewer',
        email: 'reviewer@piecorp.com',
        displayName: 'Alice Njeri (Reviewer)',
        emailVerified: true,
        status: UserAccountStatus.ACTIVE,
        roles: [AdminRole.CASE_REVIEWER],
        activeSessionsCount: 1,
        lastMeaningfulActivityAt: new Date(),
        createdAt: new Date('2025-11-01T10:00:00Z'),
        updatedAt: new Date(),
      },
      {
        id: 'usr_admin_approver',
        email: 'approver@piecorp.com',
        displayName: 'Bob Mutua (Approver)',
        emailVerified: true,
        status: UserAccountStatus.ACTIVE,
        roles: [AdminRole.RELEASE_APPROVER],
        activeSessionsCount: 1,
        lastMeaningfulActivityAt: new Date(),
        createdAt: new Date('2025-11-01T10:00:00Z'),
        updatedAt: new Date(),
      },
      {
        id: 'usr_admin_security',
        email: 'security@piecorp.com',
        displayName: 'Charlie Kiprono (SecOps)',
        emailVerified: true,
        status: UserAccountStatus.ACTIVE,
        roles: [AdminRole.SECURITY_ADMIN],
        activeSessionsCount: 1,
        lastMeaningfulActivityAt: new Date(),
        createdAt: new Date('2025-11-01T10:00:00Z'),
        updatedAt: new Date(),
      },
      {
        id: 'usr_admin_auditor',
        email: 'auditor@piecorp.com',
        displayName: 'Diana Wekesa (Compliance)',
        emailVerified: true,
        status: UserAccountStatus.ACTIVE,
        roles: [AdminRole.AUDITOR],
        activeSessionsCount: 1,
        lastMeaningfulActivityAt: new Date(),
        createdAt: new Date('2025-11-01T10:00:00Z'),
        updatedAt: new Date(),
      },
      {
        id: 'usr_admin_super',
        email: 'superadmin@piecorp.com',
        displayName: 'Eve Omondi (Platform Custodian)',
        emailVerified: true,
        status: UserAccountStatus.ACTIVE,
        roles: [AdminRole.SUPER_ADMIN],
        activeSessionsCount: 1,
        lastMeaningfulActivityAt: new Date(),
        createdAt: new Date('2025-11-01T10:00:00Z'),
        updatedAt: new Date(),
      },
    ];

    for (const u of defaultUsers) {
      this.users.set(u.id, u);
    }
  }

  // ============================================================================
  // User Management
  // ============================================================================

  async listUsers(query?: ListAdminUsersQueryInput): Promise<{ users: MaskedUserSummary[]; total: number }> {
    let all = Array.from(this.users.values());

    if (query?.status) {
      all = all.filter((u) => u.status === query.status);
    }

    if (query?.search) {
      const s = query.search.toLowerCase();
      all = all.filter(
        (u) =>
          u.id.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          u.displayName.toLowerCase().includes(s)
      );
    }

    const total = all.length;
    const limit = query?.limit ?? 20;
    const paginated = all.slice(0, limit);

    const summaries: MaskedUserSummary[] = paginated.map((u) => ({
      id: u.id,
      email: u.email,
      maskedEmail: maskEmail(u.email),
      displayName: u.displayName,
      emailVerified: u.emailVerified,
      status: u.status,
      roles: u.roles,
      activeSessionsCount: u.activeSessionsCount,
      lastMeaningfulActivityAt: u.lastMeaningfulActivityAt.toISOString(),
      createdAt: u.createdAt.toISOString(),
    }));

    return { users: summaries, total };
  }

  async getUserById(userId: string): Promise<UserAccountRecord | null> {
    return this.users.get(userId) ?? null;
  }

  async upsertUser(user: UserAccountRecord): Promise<UserAccountRecord> {
    this.users.set(user.id, user);
    return user;
  }

  async updateUserStatus(
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    reason: string,
    adminUserId: string
  ): Promise<UserAccountRecord> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AdminDalError('USER_NOT_FOUND', `User with ID ${userId} does not exist`, 404);
    }

    const previousStatus = user.status;
    const targetStatus = status === 'ACTIVE' ? UserAccountStatus.ACTIVE : UserAccountStatus.SUSPENDED;

    user.status = targetStatus;
    user.updatedAt = new Date();

    // If suspended, invalidate all active sessions immediately
    if (targetStatus === UserAccountStatus.SUSPENDED) {
      user.activeSessionsCount = 0;
    }

    this.users.set(userId, user);

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: adminUserId,
      action: 'user.status_updated',
      targetType: 'User',
      targetId: userId,
      outcome: 'SUCCESS',
      reasonCode: reason,
      requestId: `req_${Date.now()}`,
      metadata: {
        previousStatus,
        newStatus: targetStatus,
        reason,
      },
    });

    return user;
  }

  async revokeUserSessions(
    userId: string,
    reason: string,
    adminUserId: string
  ): Promise<{ revokedCount: number }> {
    const user = this.users.get(userId);
    if (!user) {
      throw new AdminDalError('USER_NOT_FOUND', `User with ID ${userId} does not exist`, 404);
    }

    const previousSessions = user.activeSessionsCount;
    user.activeSessionsCount = 0;
    user.updatedAt = new Date();
    this.users.set(userId, user);

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: adminUserId,
      action: 'security.sessions_revoked',
      targetType: 'User',
      targetId: userId,
      outcome: 'SUCCESS',
      reasonCode: reason,
      requestId: `req_${Date.now()}`,
      metadata: {
        revokedSessionsCount: previousSessions,
        reason,
      },
    });

    return { revokedCount: previousSessions };
  }

  // ============================================================================
  // Emergency System-Wide Hold
  // ============================================================================

  async getSystemHoldStatus(): Promise<SystemHoldStatus> {
    return { ...this.systemHold };
  }

  async toggleSystemHold(
    active: boolean,
    reasonCode: string,
    rationale: string,
    adminUserId: string
  ): Promise<SystemHoldStatus> {
    if (active) {
      this.systemHold = {
        active: true,
        reasonCode,
        rationale,
        placedById: adminUserId,
        placedAt: new Date(),
        liftedById: undefined,
        liftedRationale: undefined,
        liftedAt: undefined,
      };

      await this.auditService.record({
        actorType: 'ADMIN',
        actorId: adminUserId,
        action: 'security.system_hold_placed',
        targetType: 'System',
        targetId: 'PLATFORM_WIDE',
        outcome: 'SUCCESS',
        reasonCode,
        requestId: `req_${Date.now()}`,
        metadata: { rationale },
      });
    } else {
      this.systemHold = {
        active: false,
        reasonCode: this.systemHold.reasonCode,
        rationale: this.systemHold.rationale,
        placedById: this.systemHold.placedById,
        placedAt: this.systemHold.placedAt,
        liftedById: adminUserId,
        liftedRationale: rationale,
        liftedAt: new Date(),
      };

      await this.auditService.record({
        actorType: 'ADMIN',
        actorId: adminUserId,
        action: 'security.system_hold_lifted',
        targetType: 'System',
        targetId: 'PLATFORM_WIDE',
        outcome: 'SUCCESS',
        reasonCode,
        requestId: `req_${Date.now()}`,
        metadata: { rationale },
      });
    }

    return { ...this.systemHold };
  }
}
