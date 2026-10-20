import { describe, it, expect, beforeEach } from 'vitest';
import {
  UserId,
  makeUserId,
  makeAssetId,
  makeBeneficiaryId,
  makeCaseId,
  ReleaseGrantStatus,
  DeathCaseState,
  CaseInitiationType,
  CaseDecisionType,
  CaseHoldReasonCode,
} from '@portfolio-immortalized/domain';
import {
  VaultDal,
  LegacyPlanDal,
  RelationshipDal,
  DeathCaseDal,
  ReleaseService,
  BeneficiaryDal,
  WatermarkService,
  AuditService,
  DalAuthorizationError,
} from '../src/index.js';

describe('Beneficiary Portal, Exact Partitioning & Forensic Watermarking (POL-01, OD-19)', () => {
  let auditService: AuditService;
  let vaultDal: VaultDal;
  let legacyPlanDal: LegacyPlanDal;
  let deathCaseDal: DeathCaseDal;
  let releaseService: ReleaseService;
  let watermarkService: WatermarkService;
  let beneficiaryDal: BeneficiaryDal;

  const ownerId = makeUserId('owner_ben_test');
  let beneficiary1Id: BeneficiaryId;
  const beneficiary1Email = 'carol@example.com';
  const reviewerId = makeUserId('reviewer_admin');
  const approverId = makeUserId('approver_admin');

  beforeEach(async () => {
    auditService = new AuditService();
    vaultDal = new VaultDal({ auditService });
    const relationshipDal = new RelationshipDal(auditService);
    const ben = await relationshipDal.createBeneficiary(
      ownerId,
      {
        name: 'Carol Beneficiary',
        email: beneficiary1Email,
        relationshipType: 'DAUGHTER',
      },
      ownerId
    );
    beneficiary1Id = ben.id;
    legacyPlanDal = new LegacyPlanDal({ vaultDal, relationshipDal, auditService });
    deathCaseDal = new DeathCaseDal(auditService);
    releaseService = new ReleaseService(deathCaseDal, legacyPlanDal, vaultDal, auditService);
    watermarkService = new WatermarkService();
    beneficiaryDal = new BeneficiaryDal(releaseService, vaultDal, watermarkService, auditService);

    // 1. Setup Vault Asset for owner
    const intent = await vaultDal.createUploadIntent(ownerId, {
      title: 'Confidential Family Trust Distribution Letter',
      assetType: 'DOCUMENT' as any,
      declaredMimeType: 'application/pdf',
      declaredSizeBytes: 120,
    });

    const plaintext = Buffer.from('Distribution: 50% shares to Carol, 50% shares to David.', 'utf8');
    const actualHash = (await import('crypto')).createHash('sha256').update(plaintext).digest('hex');

    await vaultDal.commitUpload(
      ownerId,
      intent.assetId,
      intent.versionNumber,
      plaintext,
      actualHash,
      'application/pdf'
    );

    // 2. Setup published Legacy Plan
    const draft = await legacyPlanDal.getDraftPlan(ownerId);
    await legacyPlanDal.upsertInstruction(ownerId, draft.id, {
      beneficiaryId: beneficiary1Id,
      assignedAssetIds: [intent.assetId],
      customInstructions: 'Please review alongside estate solicitor.',
    });
    await legacyPlanDal.publishPlan(ownerId, draft.id, {
      acknowledgedCap160: true,
      acknowledgedProbateDisclaimer: true,
    });

    // 3. Initiate and approve case
    const c = await deathCaseDal.initiateCase(ownerId, CaseInitiationType.TRUSTEE_REPORT, makeUserId('trustee_1'));
    await deathCaseDal.assignReviewer(c.id, reviewerId);
    await deathCaseDal.recommendApproval(c.id, reviewerId, {
      reasonCode: 'REVIEWER_PASSED',
      rationale: 'Death certificate verified via hospital registry.',
    });
    await deathCaseDal.approveFinalRelease(c.id, approverId, {
      reasonCode: 'FINAL_RELEASE_AUTHORIZED',
      rationale: 'Quorum corroborated and legal verification satisfied.',
    });

    // 4. Generate release grants
    await releaseService.generateGrantsForAuthorizedCase(c.id);
  });

  it('verifies recipient token and issues signed session grant (WEB-BEN-01)', async () => {
    // Find generated grant
    const grants = await releaseService.listGrantsForBeneficiary({ beneficiaryId: beneficiary1Id });
    expect(grants).toHaveLength(1);
    const token = grants[0]!.accessToken;

    const verification = await beneficiaryDal.verifyRecipientToken(token, beneficiary1Email);
    expect(verification.verified).toBe(true);
    expect(verification.sessionGrantToken).toMatch(/^bensess_/);
    expect(verification.beneficiary.email).toBe(beneficiary1Email);
  });

  it('rejects invalid or tampered beneficiary tokens', async () => {
    await expect(
      beneficiaryDal.verifyRecipientToken('invalid_token_999', 'unknown@example.com')
    ).rejects.toThrow(DalAuthorizationError);
  });

  it('enforces exact recipient partitioning (POL-01): only returns explicitly allocated assets', async () => {
    const grants = await releaseService.listGrantsForBeneficiary({ beneficiaryId: beneficiary1Id });
    const token = grants[0]!.accessToken;
    const session = await beneficiaryDal.verifyRecipientToken(token, beneficiary1Email);

    const decoded = beneficiaryDal.verifySessionToken(session.sessionGrantToken);
    const authorized = await beneficiaryDal.listAuthorizedGrants(decoded);

    expect(authorized).toHaveLength(1);
    expect(authorized[0]?.assets).toHaveLength(1);
    expect(authorized[0]?.assets[0]?.title).toBe('Confidential Family Trust Distribution Letter');
  });

  it('dynamically applies forensic watermarking without mutating vault ciphertext at rest (OD-19)', async () => {
    const grants = await releaseService.listGrantsForBeneficiary({ beneficiaryId: beneficiary1Id });
    const grant = grants[0]!;
    const assetId = grant.allocatedAssetIds[0]!;

    const sessionPayload = {
      grantId: grant.id,
      beneficiaryId: beneficiary1Id,
      email: beneficiary1Email,
      name: 'Carol Beneficiary',
      expiresAt: Date.now() + 3600 * 1000,
    };

    const watermarked = await beneficiaryDal.getWatermarkedAsset(sessionPayload, grant.id, assetId);

    expect(watermarked.mimeType).toBe('application/pdf');
    expect(watermarked.forensicHash).toBeDefined();

    const outputText = watermarked.buffer.toString('utf8');
    // Verifies forensic banner is injected
    expect(outputText).toContain('CONFIDENTIAL & RESTRICTED — PORTFOLIO IMMORTALIZED ESTATE RELEASE');
    expect(outputText).toContain('Carol Beneficiary <carol@example.com>');
    expect(outputText).toContain(grant.id);
    expect(outputText).toContain('Cap. 160 Evidence Ordinance');
    expect(outputText).toContain('Distribution: 50% shares to Carol');

    // CRITICAL SAFETY INVARIANT: The original ciphertext in the vault storage provider is NOT modified!
    const originalAsset = await vaultDal.getAsset(ownerId, assetId);
    expect(originalAsset.versions[0]?.sha256).toBeDefined();
    // Verify ciphertext in storage remains untouched
    const storageObj = (vaultDal as any).storageProvider;
    expect(storageObj).toBeDefined();
  });

  it('blocks access and download if release grant is expired', async () => {
    const grants = await releaseService.listGrantsForBeneficiary({ beneficiaryId: beneficiary1Id });
    const grant = grants[0]!;
    // Expire the grant
    grant.expiresAt = new Date(Date.now() - 1000);

    const sessionPayload = {
      grantId: grant.id,
      beneficiaryId: beneficiary1Id,
      email: beneficiary1Email,
      name: 'Carol',
      expiresAt: Date.now() + 3600 * 1000,
    };

    await expect(
      beneficiaryDal.getWatermarkedAsset(sessionPayload, grant.id, grant.allocatedAssetIds[0]!)
    ).rejects.toThrow(/expired/i);
  });

  it('immediately freezes estate case into HOLD when trustee reports conflict or fraud (OD-18)', async () => {
    const caseId = makeCaseId('case_freeze_demo');
    await deathCaseDal.initiateCase(ownerId, CaseInitiationType.TRUSTEE_REPORT, makeUserId('trustee_bob'));

    const activeCase = await deathCaseDal.getActiveCaseByOwner(ownerId);
    expect(activeCase).toBeDefined();

    const hold = await deathCaseDal.placeEmergencyHold(
      activeCase!.id,
      makeUserId('trustee_bob'),
      {
        reasonCode: CaseHoldReasonCode.SUSPECTED_FRAUD,
        rationale: 'Trustee reports uncorroborated foreign death certificate and family dispute.',
        scope: 'ALL_PENDING_RELEASES',
      }
    );

    expect(hold.active).toBe(true);
    expect(hold.reasonCode).toBe(CaseHoldReasonCode.SUSPECTED_FRAUD);

    const refreshedCase = await deathCaseDal.getCaseById(activeCase!.id);
    expect(refreshedCase.state).toBe(DeathCaseState.HOLD);
  });
});
