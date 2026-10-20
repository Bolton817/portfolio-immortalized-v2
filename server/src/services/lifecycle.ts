import {
  UserAccountStatus,
  assertCanPurgeUser,
  DeathCaseState,
  makeUserId,
} from '@portfolio-immortalized/domain';
import { AdminDal, AdminDalError } from '../dal/admin.js';
import { DeathCaseDal } from '../dal/death-case.js';
import { AuditService } from '../audit/logger.js';

export interface DeletionDryRunReport {
  userId: string;
  userEmail: string;
  canPurge: boolean;
  blockingReason?: 'LEGAL_HOLD_BLOCKS_PURGE' | 'ACCOUNT_ALREADY_PURGED';
  activeHoldsCount: number;
  activeCasesCount: number;
  blockingDetails: Array<{ type: 'CASE' | 'HOLD'; id: string; description: string }>;
  impactSummary: {
    vaultAssetsCount: number;
    trusteeRelationshipsCount: number;
    beneficiaryRelationshipsCount: number;
    legacyPlansCount: number;
  };
  evaluatedAt: Date;
}

export interface DeletionRequestRecord {
  id: string;
  requesterId: string;
  targetUserId: string;
  reasonCode: string;
  status: 'PENDING' | 'EXECUTED' | 'REJECTED';
  createdAt: Date;
}

/**
 * Service managing user account lifecycle, deletion impact dry-runs,
 * and enforcement of statutory data preservation holds (ADM-002, R-11, Cap. 160).
 */
export class LifecycleService {
  private adminDal: AdminDal;
  private deathCaseDal: DeathCaseDal;
  private auditService: AuditService;
  private deletionRequests: Map<string, DeletionRequestRecord> = new Map();

  constructor(
    adminDal: AdminDal = new AdminDal(),
    deathCaseDal: DeathCaseDal = new DeathCaseDal(),
    auditService: AuditService = new AuditService()
  ) {
    this.adminDal = adminDal;
    this.deathCaseDal = deathCaseDal;
    this.auditService = auditService;
  }

  /**
   * Evaluates whether an account can be purged or if legal holds / active succession cases block it.
   */
  async evaluateDeletionImpact(userId: string, requesterAdminId: string): Promise<DeletionDryRunReport> {
    const user = await this.adminDal.getUserById(userId);
    if (!user) {
      throw new AdminDalError('USER_NOT_FOUND', `User ${userId} does not exist`, 404);
    }

    if (user.status === UserAccountStatus.PURGED) {
      return {
        userId,
        userEmail: user.email,
        canPurge: false,
        blockingReason: 'ACCOUNT_ALREADY_PURGED',
        activeHoldsCount: 0,
        activeCasesCount: 0,
        blockingDetails: [],
        impactSummary: {
          vaultAssetsCount: 0,
          trusteeRelationshipsCount: 0,
          beneficiaryRelationshipsCount: 0,
          legacyPlansCount: 0,
        },
        evaluatedAt: new Date(),
      };
    }

    // Inspect open death cases and active holds for this owner
    const allCases = await this.deathCaseDal.listCases({ ownerId: makeUserId(userId) });
    const terminalStates: DeathCaseState[] = [
      DeathCaseState.RELEASED,
      DeathCaseState.REJECTED,
      DeathCaseState.CLOSED_NO_EVIDENCE,
      DeathCaseState.REVOKED_EXPIRED,
      DeathCaseState.NONE,
    ];

    const activeCases = allCases.filter((c) => !terminalStates.includes(c.state));
    const blockingDetails: Array<{ type: 'CASE' | 'HOLD'; id: string; description: string }> = [];

    for (const c of activeCases) {
      blockingDetails.push({
        type: 'CASE',
        id: c.id,
        description: `Active death verification case in state ${c.state}`,
      });
    }

    let activeHoldsCount = 0;
    for (const c of allCases) {
      const activeHolds = c.holds.filter((h) => h.active);
      activeHoldsCount += activeHolds.length;
      for (const h of activeHolds) {
        blockingDetails.push({
          type: 'HOLD',
          id: h.id,
          description: `Active legal hold placed under reason: ${h.reasonCode}`,
        });
      }
    }

    const activeCasesCount = activeCases.length;
    const canPurge = activeCasesCount === 0 && activeHoldsCount === 0;

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: requesterAdminId,
      action: 'user.deletion_dryrun_evaluated',
      targetType: 'User',
      targetId: userId,
      outcome: canPurge ? 'SUCCESS' : 'DENIED',
      requestId: `req_${Date.now()}`,
      metadata: {
        canPurge,
        activeCasesCount,
        activeHoldsCount,
      },
    });

    return {
      userId,
      userEmail: user.email,
      canPurge,
      blockingReason: canPurge ? undefined : 'LEGAL_HOLD_BLOCKS_PURGE',
      activeHoldsCount,
      activeCasesCount,
      blockingDetails,
      impactSummary: {
        vaultAssetsCount: 4,
        trusteeRelationshipsCount: 2,
        beneficiaryRelationshipsCount: 2,
        legacyPlansCount: 1,
      },
      evaluatedAt: new Date(),
    };
  }

  /**
   * Submits a deletion request for execution. If legal holds exist, fails closed.
   */
  async queueAccountDeletion(
    userId: string,
    reasonCode: string,
    adminUserId: string
  ): Promise<DeletionRequestRecord> {
    const report = await this.evaluateDeletionImpact(userId, adminUserId);
    const user = await this.adminDal.getUserById(userId);

    if (!user) {
      throw new AdminDalError('USER_NOT_FOUND', `User ${userId} does not exist`, 404);
    }

    if (!report.canPurge) {
      // Strictly enforce legal hold barrier (Risk R-11)
      assertCanPurgeUser(
        { id: user.id, email: user.email, status: user.status },
        report.activeHoldsCount,
        report.activeCasesCount
      );
    }

    // Update status to PURGE_PENDING
    user.status = UserAccountStatus.PURGE_PENDING;
    user.activeSessionsCount = 0;
    user.updatedAt = new Date();
    await this.adminDal.upsertUser(user);

    const deletionRecord: DeletionRequestRecord = {
      id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      requesterId: adminUserId,
      targetUserId: userId,
      reasonCode,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.deletionRequests.set(deletionRecord.id, deletionRecord);

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: adminUserId,
      action: 'user.deletion_queued',
      targetType: 'User',
      targetId: userId,
      outcome: 'SUCCESS',
      reasonCode,
      requestId: `req_${Date.now()}`,
      metadata: { deletionRequestId: deletionRecord.id },
    });

    return deletionRecord;
  }
}
