import crypto from 'node:crypto';
import {
  UserId,
  CaseId,
  AssetId,
  BeneficiaryId,
  ReleaseGrantId,
  ReleaseGrantStatus,
  DeathCaseState,
  makeReleaseGrantId,
} from '@portfolio-immortalized/domain';
import { DeathCaseDal } from '../dal/death-case.js';
import { LegacyPlanDal } from '../dal/legacy-plan.js';
import { VaultDal } from '../dal/vault.js';
import { AuditService } from '../audit/logger.js';
import { DalAuthorizationError } from '../dal/tenancy.js';

export interface ReleaseGrantRecord {
  id: ReleaseGrantId;
  caseId: CaseId;
  ownerId: UserId;
  beneficiaryId: BeneficiaryId;
  beneficiaryUserId: UserId | null;
  beneficiaryEmail: string;
  beneficiaryName?: string;
  status: ReleaseGrantStatus;
  expiresAt: Date;
  revokedAt: Date | null;
  accessToken: string;
  customInstructions: string | null;
  allocatedAssetIds: AssetId[];
  createdAt: Date;
}

export class ReleaseService {
  private grants: Map<string, ReleaseGrantRecord> = new Map();
  private deathCaseDal: DeathCaseDal;
  private legacyPlanDal: LegacyPlanDal;
  private vaultDal: VaultDal;
  private auditService: AuditService;

  constructor(
    deathCaseDal: DeathCaseDal,
    legacyPlanDal: LegacyPlanDal,
    vaultDal: VaultDal,
    auditService: AuditService = new AuditService()
  ) {
    this.deathCaseDal = deathCaseDal;
    this.legacyPlanDal = legacyPlanDal;
    this.vaultDal = vaultDal;
    this.auditService = auditService;
  }

  // ============================================================================
  // Grant Issuance & Case Release
  // ============================================================================

  async generateGrantsForAuthorizedCase(caseId: CaseId): Promise<ReleaseGrantRecord[]> {
    const caseRecord = await this.deathCaseDal.getCaseById(caseId);

    if (caseRecord.state !== DeathCaseState.AUTHORIZED) {
      throw new DalAuthorizationError(
        'INVALID_CASE_STATE',
        `Case must be in AUTHORIZED state to generate release grants (current: ${caseRecord.state})`,
        400
      );
    }

    // Step 1: Transition case to RELEASE_IN_PROGRESS
    await this.deathCaseDal.markReleaseInProgress(caseId);

    // Step 2: Fetch owner's published legacy plan
    const publishedPlan = await this.legacyPlanDal.getPublishedPlan(caseRecord.ownerId);
    if (!publishedPlan) {
      throw new DalAuthorizationError(
        'NO_PUBLISHED_PLAN',
        `Owner "${caseRecord.ownerId}" has no published legacy plan. Release grants cannot be issued.`,
        400
      );
    }

    const issuedGrants: ReleaseGrantRecord[] = [];
    const now = new Date();
    // 90-day validity window for release grants
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    let beneficiaryMap = new Map<string, { nameSnapshot?: string; emailSnapshot?: string; personUserId?: UserId | null }>();
    try {
      if (this.legacyPlanDal.relationshipDal) {
        const beneficiaries = await this.legacyPlanDal.relationshipDal.listBeneficiariesByOwner(caseRecord.ownerId);
        beneficiaryMap = new Map(beneficiaries.map((b) => [b.id as string, b]));
      }
    } catch {
      // Fallback
    }

    for (const instruction of publishedPlan.instructions) {
      const grantId = makeReleaseGrantId(crypto.randomUUID());
      const accessToken = crypto.randomBytes(32).toString('hex');
      const benRecord = beneficiaryMap.get(instruction.beneficiaryId as string);

      const grant: ReleaseGrantRecord = {
        id: grantId,
        caseId,
        ownerId: caseRecord.ownerId,
        beneficiaryId: instruction.beneficiaryId,
        beneficiaryUserId: benRecord?.personUserId ?? null,
        beneficiaryEmail: benRecord?.emailSnapshot ?? '',
        beneficiaryName: benRecord?.nameSnapshot,
        status: ReleaseGrantStatus.ACTIVE,
        expiresAt,
        revokedAt: null,
        accessToken,
        customInstructions: instruction.customInstructions ?? null,
        allocatedAssetIds: instruction.assignedAssetIds,
        createdAt: now,
      };

      this.grants.set(grantId, grant);
      issuedGrants.push(grant);

      await this.auditService.record({
        actorType: 'SYSTEM',
        actorId: 'system' as UserId,
        action: 'release.grant_issued',
        targetType: 'ReleaseGrant',
        targetId: grantId,
        outcome: 'SUCCESS',
        requestId: `req_${Date.now()}`,
        metadata: {
          caseId,
          beneficiaryId: instruction.beneficiaryId,
          allocatedAssetCount: instruction.assignedAssetIds.length,
          expiresAt,
        },
      });
    }

    // Step 3: Transition case to RELEASED
    await this.deathCaseDal.markCaseReleased(caseId);

    return issuedGrants;
  }

  // ============================================================================
  // Grant Queries
  // ============================================================================

  async listGrantsForBeneficiary(
    identifier: { beneficiaryId?: BeneficiaryId; beneficiaryUserId?: UserId; email?: string }
  ): Promise<ReleaseGrantRecord[]> {
    const now = new Date();
    const list = Array.from(this.grants.values()).filter((g) => {
      if (g.status !== ReleaseGrantStatus.ACTIVE) return false;
      if (g.expiresAt <= now) return false;

      if (identifier.beneficiaryId && g.beneficiaryId === identifier.beneficiaryId) return true;
      if (identifier.beneficiaryUserId && g.beneficiaryUserId === identifier.beneficiaryUserId) return true;
      if (identifier.email && g.beneficiaryEmail.toLowerCase() === identifier.email.toLowerCase()) return true;

      return false;
    });

    return list;
  }

  async getGrantById(grantId: ReleaseGrantId): Promise<ReleaseGrantRecord> {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new DalAuthorizationError('GRANT_NOT_FOUND', `ReleaseGrant "${grantId}" was not found.`, 404);
    }
    return grant;
  }

  // Bind authenticated beneficiary user ID to the grant
  async claimGrant(grantId: ReleaseGrantId, beneficiaryUserId: UserId): Promise<ReleaseGrantRecord> {
    const grant = await this.getGrantById(grantId);
    grant.beneficiaryUserId = beneficiaryUserId;
    return grant;
  }

  // ============================================================================
  // Decrypted Asset Download
  // ============================================================================

  async downloadReleasedAsset(
    grantId: ReleaseGrantId,
    requesterId: string,
    assetId: AssetId
  ): Promise<{
    plaintext: Buffer;
    mimeType: string;
    title: string;
    sha256: string;
    versionNumber: number;
  }> {
    const grant = await this.getGrantById(grantId);

    // 1. Validate grant status
    if (grant.status !== ReleaseGrantStatus.ACTIVE) {
      throw new DalAuthorizationError(
        'GRANT_INACTIVE',
        `ReleaseGrant is ${grant.status} and cannot be used for asset redemption.`,
        403
      );
    }

    // 2. Validate expiration
    if (grant.expiresAt <= new Date()) {
      throw new DalAuthorizationError(
        'GRANT_EXPIRED',
        'ReleaseGrant has expired. Please contact support.',
        403
      );
    }

    // 3. Strict Recipient Allocation Matrix Invariant (POL-01)
    // A beneficiary can ONLY download assets specifically allocated to their grant
    if (!grant.allocatedAssetIds.includes(assetId)) {
      throw new DalAuthorizationError(
        'ASSET_NOT_ALLOCATED_TO_GRANT',
        `Asset "${assetId}" is not allocated to this release grant. Access is strictly forbidden.`,
        403
      );
    }

    // 4. Retrieve asset from VaultDal without owner check (authorized via verified grant)
    const asset = await this.vaultDal.getAssetWithoutOwnerCheck(assetId);

    // 5. Decrypt using envelope crypto (KMS unwrap + AES-256-GCM authenticated tag verification)
    const decrypted = await this.vaultDal.decryptAssetPayload(asset);

    // 6. Record release download audit trail
    await this.auditService.record({
      actorType: 'USER',
      actorId: requesterId as UserId,
      action: 'release.asset_downloaded',
      targetType: 'Asset',
      targetId: assetId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        grantId,
        beneficiaryId: grant.beneficiaryId,
        versionNumber: decrypted.versionNumber,
        sizeBytes: decrypted.plaintext.length,
      },
    });

    return decrypted;
  }

  // ============================================================================
  // Grant Revocation (Emergency / Dispute)
  // ============================================================================

  async revokeGrant(
    grantId: ReleaseGrantId,
    adminId: UserId,
    rationale: string
  ): Promise<ReleaseGrantRecord> {
    const grant = await this.getGrantById(grantId);
    grant.status = ReleaseGrantStatus.REVOKED;
    grant.revokedAt = new Date();

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'release.grant_revoked',
      targetType: 'ReleaseGrant',
      targetId: grantId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: { rationale },
    });

    return grant;
  }
}
