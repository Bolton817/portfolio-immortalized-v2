import { describe, it, expect, beforeEach } from 'vitest';
import {
  AdminRole,
  AdminPermission,
  UserAccountStatus,
  hasAdminPermission,
  assertAdminPermission,
  AdminAuthorizationError,
  assertCanPurgeUser,
  LegalHoldBlocksPurgeError,
  CaseInitiationType,
  CaseHoldReasonCode,
  makeUserId,
  maskEmail,
} from '@portfolio-immortalized/domain';
import {
  AdminDal,
  LifecycleService,
  AuditQueryService,
  DeathCaseDal,
  AuditService,
  MemoryAuditSink,
} from '../src/index.js';

describe('Stage 7: Administrative Console & Security Operations', () => {
  let auditSink: MemoryAuditSink;
  let auditService: AuditService;
  let adminDal: AdminDal;
  let deathCaseDal: DeathCaseDal;
  let lifecycleService: LifecycleService;
  let auditQueryService: AuditQueryService;

  beforeEach(() => {
    auditSink = new MemoryAuditSink();
    auditService = new AuditService(auditSink);
    adminDal = new AdminDal(auditService);
    deathCaseDal = new DeathCaseDal(auditService);
    lifecycleService = new LifecycleService(adminDal, deathCaseDal, auditService);
    auditQueryService = new AuditQueryService(auditSink);
  });

  // ============================================================================
  // 1. RBAC Permission Matrix & Enforcement (ADR-007)
  // ============================================================================
  describe('RBAC Permission Matrix & Separation of Duties (ADR-007)', () => {
    it('allows CASE_REVIEWER to review cases but forbids final release approval', () => {
      const reviewerRoles = [AdminRole.CASE_REVIEWER];

      expect(hasAdminPermission(reviewerRoles, AdminPermission.CASES_REVIEW)).toBe(true);
      expect(hasAdminPermission(reviewerRoles, AdminPermission.CASES_RECOMMEND)).toBe(true);
      expect(hasAdminPermission(reviewerRoles, AdminPermission.RELEASES_APPROVE)).toBe(false);
      expect(hasAdminPermission(reviewerRoles, AdminPermission.SECURITY_SESSIONS_REVOKE)).toBe(false);

      expect(() =>
        assertAdminPermission(reviewerRoles, AdminPermission.CASES_REVIEW, 'usr_reviewer')
      ).not.toThrow();

      expect(() =>
        assertAdminPermission(reviewerRoles, AdminPermission.RELEASES_APPROVE, 'usr_reviewer')
      ).toThrow(AdminAuthorizationError);
    });

    it('allows RELEASE_APPROVER to approve releases but forbids session revocation', () => {
      const approverRoles = [AdminRole.RELEASE_APPROVER];

      expect(hasAdminPermission(approverRoles, AdminPermission.RELEASES_APPROVE)).toBe(true);
      expect(hasAdminPermission(approverRoles, AdminPermission.RELEASES_PLAN_READ)).toBe(true);
      expect(hasAdminPermission(approverRoles, AdminPermission.CASES_REVIEW)).toBe(false);
      expect(hasAdminPermission(approverRoles, AdminPermission.SECURITY_SESSIONS_REVOKE)).toBe(false);
    });

    it('allows SECURITY_ADMIN to suspend users, revoke sessions, and manage incidents', () => {
      const secRoles = [AdminRole.SECURITY_ADMIN];

      expect(hasAdminPermission(secRoles, AdminPermission.USERS_SUSPEND)).toBe(true);
      expect(hasAdminPermission(secRoles, AdminPermission.USERS_RESTORE)).toBe(true);
      expect(hasAdminPermission(secRoles, AdminPermission.SECURITY_SESSIONS_REVOKE)).toBe(true);
      expect(hasAdminPermission(secRoles, AdminPermission.SECURITY_INCIDENT_MANAGE)).toBe(true);
      expect(hasAdminPermission(secRoles, AdminPermission.AUDIT_READ)).toBe(true);
      expect(hasAdminPermission(secRoles, AdminPermission.AUDIT_EXPORT)).toBe(true);
      expect(hasAdminPermission(secRoles, AdminPermission.RELEASES_APPROVE)).toBe(false);
    });

    it('allows SUPER_ADMIN all catalogue permissions', () => {
      const superRoles = [AdminRole.SUPER_ADMIN];

      for (const perm of Object.values(AdminPermission)) {
        expect(hasAdminPermission(superRoles, perm)).toBe(true);
      }
    });

    it('throws AdminAuthorizationError with HTTP 403 when administrator lacks scope', () => {
      try {
        assertAdminPermission([AdminRole.SUPPORT_ADMIN], AdminPermission.SECURITY_SESSIONS_REVOKE, 'support_1');
        expect.fail('Should have thrown AdminAuthorizationError');
      } catch (err) {
        expect(err).toBeInstanceOf(AdminAuthorizationError);
        const adminErr = err as AdminAuthorizationError;
        expect(adminErr.statusCode).toBe(403);
        expect(adminErr.code).toBe('ADMIN_AUTHORIZATION_DENIED');
        expect(adminErr.requiredPermission).toBe(AdminPermission.SECURITY_SESSIONS_REVOKE);
      }
    });
  });

  // ============================================================================
  // 2. User Account Status & Remote Session Revocation (ADM-001, R-07)
  // ============================================================================
  describe('User Account Lifecycle & Remote Session Revocation (ADM-001, R-07)', () => {
    it('lists users with masked PII and pagination', async () => {
      const res = await adminDal.listUsers({ limit: 10 });

      expect(res.total).toBeGreaterThan(0);
      expect(res.users.length).toBeGreaterThan(0);

      const firstUser = res.users[0];
      expect(firstUser).toBeDefined();
      expect(firstUser.maskedEmail).toMatch(/\*\*\*/);
      expect(maskEmail('test.user@example.com')).toBe('te***r@example.com');
    });

    it('suspends user account and automatically zeroes active sessions', async () => {
      const user = await adminDal.getUserById('usr_owner_1');
      expect(user).not.toBeNull();
      expect(user?.status).toBe(UserAccountStatus.ACTIVE);
      expect(user?.activeSessionsCount).toBeGreaterThan(0);

      const updated = await adminDal.updateUserStatus(
        'usr_owner_1',
        'SUSPENDED',
        'Suspected credential compromise from unusual IP',
        'usr_admin_security'
      );

      expect(updated.status).toBe(UserAccountStatus.SUSPENDED);
      expect(updated.activeSessionsCount).toBe(0);

      // Verify audit trail logged
      const lastAudit = auditSink.events[0];
      expect(lastAudit.action).toBe('user.status_updated');
      expect(lastAudit.targetId).toBe('usr_owner_1');
      expect(lastAudit.outcome).toBe('SUCCESS');
    });

    it('restores suspended user account', async () => {
      const restored = await adminDal.updateUserStatus(
        'usr_suspended_1',
        'ACTIVE',
        'Account owner completed identity re-verification',
        'usr_admin_security'
      );

      expect(restored.status).toBe(UserAccountStatus.ACTIVE);

      const lastAudit = auditSink.events[0];
      expect(lastAudit.action).toBe('user.status_updated');
      expect(lastAudit.metadata?.newStatus).toBe(UserAccountStatus.ACTIVE);
    });

    it('revokes active user sessions remotely and logs audit record', async () => {
      const user = await adminDal.getUserById('usr_owner_2');
      expect(user).not.toBeNull();
      expect(user?.activeSessionsCount).toBe(1);

      const res = await adminDal.revokeUserSessions(
        'usr_owner_2',
        'User reported lost mobile device with active token',
        'usr_admin_security'
      );

      expect(res.revokedCount).toBe(1);

      const refreshed = await adminDal.getUserById('usr_owner_2');
      expect(refreshed?.activeSessionsCount).toBe(0);

      const lastAudit = auditSink.events[0];
      expect(lastAudit.action).toBe('security.sessions_revoked');
      expect(lastAudit.targetId).toBe('usr_owner_2');
    });
  });

  // ============================================================================
  // 3. Deletion Dry-Run & Legal Hold Protection (ADM-002, Risk R-11)
  // ============================================================================
  describe('Account Deletion Impact & Legal Hold Barrier (ADM-002, Risk R-11)', () => {
    it('dry-run reports canPurge=true when user has zero active cases or holds', async () => {
      const report = await lifecycleService.evaluateDeletionImpact('usr_owner_2', 'usr_admin_super');

      expect(report.canPurge).toBe(true);
      expect(report.blockingReason).toBeUndefined();
      expect(report.activeCasesCount).toBe(0);
      expect(report.activeHoldsCount).toBe(0);
      expect(report.impactSummary.vaultAssetsCount).toBeGreaterThan(0);
    });

    it('dry-run reports canPurge=false when user has an active death case', async () => {
      // Initiate a death verification case for usr_owner_1
      const ownerId = makeUserId('usr_owner_1');
      const initiatedCase = await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        makeUserId('trustee_1'),
        { informantStatement: 'Owner passed away' }
      );
      expect(initiatedCase).toBeDefined();

      const report = await lifecycleService.evaluateDeletionImpact('usr_owner_1', 'usr_admin_super');

      expect(report.canPurge).toBe(false);
      expect(report.blockingReason).toBe('LEGAL_HOLD_BLOCKS_PURGE');
      expect(report.activeCasesCount).toBe(1);
      expect(report.blockingDetails.length).toBeGreaterThan(0);
      expect(report.blockingDetails[0].type).toBe('CASE');
    });

    it('dry-run reports canPurge=false when an active case hold exists', async () => {
      const ownerId = makeUserId('usr_owner_1');
      const caseRecord = await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        makeUserId('trustee_1'),
        { informantStatement: 'Owner passed away' }
      );
      await deathCaseDal.placeEmergencyHold(
        caseRecord.id,
        makeUserId('usr_admin_security'),
        {
          reasonCode: CaseHoldReasonCode.LEGAL_DISPUTE,
          rationale: 'Succession court injunction issued by Nairobi High Court',
        }
      );

      const report = await lifecycleService.evaluateDeletionImpact('usr_owner_1', 'usr_admin_super');

      expect(report.canPurge).toBe(false);
      expect(report.blockingReason).toBe('LEGAL_HOLD_BLOCKS_PURGE');
      expect(report.activeHoldsCount).toBe(1);
      expect(report.blockingDetails.some((d) => d.type === 'HOLD')).toBe(true);
    });

    it('queueAccountDeletion throws LegalHoldBlocksPurgeError (409) if active holds exist', async () => {
      const ownerId = makeUserId('usr_owner_1');
      await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        makeUserId('trustee_1'),
        { informantStatement: 'Owner passed away' }
      );

      await expect(
        lifecycleService.queueAccountDeletion(
          'usr_owner_1',
          'GDPR_RIGHT_TO_ERASURE',
          'usr_admin_super'
        )
      ).rejects.toThrow(LegalHoldBlocksPurgeError);

      try {
        assertCanPurgeUser({ id: 'usr_owner_1', email: 'owner@example.com', status: UserAccountStatus.ACTIVE }, 1, 1);
        expect.fail('Should have thrown LegalHoldBlocksPurgeError');
      } catch (err) {
        expect(err).toBeInstanceOf(LegalHoldBlocksPurgeError);
        const holdErr = err as LegalHoldBlocksPurgeError;
        expect(holdErr.statusCode).toBe(409);
        expect(holdErr.code).toBe('LEGAL_HOLD_BLOCKS_PURGE');
      }
    });

    it('queueAccountDeletion succeeds and transitions account to PURGE_PENDING when no holds exist', async () => {
      const res = await lifecycleService.queueAccountDeletion(
        'usr_owner_2',
        'USER_EXPLICIT_CLOSURE',
        'usr_admin_super'
      );

      expect(res.status).toBe('PENDING');
      expect(res.targetUserId).toBe('usr_owner_2');

      const user = await adminDal.getUserById('usr_owner_2');
      expect(user?.status).toBe(UserAccountStatus.PURGE_PENDING);

      const lastAudit = auditSink.events[0];
      expect(lastAudit.action).toBe('user.deletion_queued');
      expect(lastAudit.targetId).toBe('usr_owner_2');
    });
  });

  // ============================================================================
  // 4. Platform-Wide Emergency Hold (CASE-03, ADR-006, OPS-001)
  // ============================================================================
  describe('Platform-Wide Emergency Hold (CASE-03, ADR-006, OPS-001)', () => {
    it('initial system hold status is inactive', async () => {
      const status = await adminDal.getSystemHoldStatus();
      expect(status.active).toBe(false);
    });

    it('places system-wide hold and logs audit entry', async () => {
      const hold = await adminDal.toggleSystemHold(
        true,
        'SUSPECTED_ZERO_DAY_EXPLOIT',
        'Freezing all release grants platform-wide pending cryptographic integrity review',
        'usr_admin_security'
      );

      expect(hold.active).toBe(true);
      expect(hold.placedById).toBe('usr_admin_security');
      expect(hold.reasonCode).toBe('SUSPECTED_ZERO_DAY_EXPLOIT');

      const lastAudit = auditSink.events[0];
      expect(lastAudit.action).toBe('security.system_hold_placed');
      expect(lastAudit.targetType).toBe('System');
    });

    it('lifts system-wide hold with documented rationale', async () => {
      const lifted = await adminDal.toggleSystemHold(
        false,
        'SYSTEM_INTEGRITY_VERIFIED',
        'Security patch applied and key derivation verified clean',
        'usr_admin_super'
      );

      expect(lifted.active).toBe(false);
      expect(lifted.liftedById).toBe('usr_admin_super');
      expect(lifted.liftedRationale).toContain('Security patch applied');

      const lastAudit = auditSink.events[0];
      expect(lastAudit.action).toBe('security.system_hold_lifted');
    });
  });

  // ============================================================================
  // 5. Audit Trail Query & Export (OPS-001, ADR-010)
  // ============================================================================
  describe('Audit Trail Multi-Attribute Query & CSV Export (OPS-001, ADR-010)', () => {
    it('filters audit events by actor, action, and target', async () => {
      // Record distinct events
      await auditService.record({
        actorType: 'ADMIN',
        actorId: 'usr_admin_reviewer',
        action: 'death_case.recommend_approval',
        targetType: 'DeathCase',
        targetId: 'case_test_999',
        outcome: 'SUCCESS',
        requestId: 'req_test_101',
      });

      await auditService.record({
        actorType: 'USER',
        actorId: 'usr_owner_1',
        action: 'vault.asset_deleted',
        targetType: 'Asset',
        targetId: 'ast_test_555',
        outcome: 'DENIED',
        reasonCode: 'READ_ONLY_ARCHIVE',
        requestId: 'req_test_102',
      });

      const reviewerEvents = await auditQueryService.search({ actorId: 'usr_admin_reviewer' });
      expect(reviewerEvents.total).toBeGreaterThan(0);
      expect(reviewerEvents.events.every((e) => e.actorId === 'usr_admin_reviewer')).toBe(true);

      const deniedEvents = await auditQueryService.search({ outcome: 'DENIED' });
      expect(deniedEvents.events.some((e) => e.action === 'vault.asset_deleted')).toBe(true);

      const caseEvents = await auditQueryService.search({ targetType: 'DeathCase' });
      expect(caseEvents.events.every((e) => e.targetType === 'DeathCase')).toBe(true);
    });

    it('exports audit events to valid RFC 4180 CSV format', async () => {
      const csv = await auditQueryService.exportCsv();

      expect(typeof csv).toBe('string');
      const lines = csv.split('\r\n');
      expect(lines.length).toBeGreaterThan(1);

      // Header row
      expect(lines[0]).toBe('id,occurredAt,actorType,actorId,action,targetType,targetId,outcome,reasonCode,requestId,metadata');

      // Data row validation
      const firstRow = lines[1];
      expect(firstRow).toContain('aud_');
      expect(firstRow).toContain('SUCCESS');
    });
  });
});
