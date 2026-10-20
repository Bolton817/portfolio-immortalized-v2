import { describe, it, expect, beforeEach } from 'vitest';
import {
  makeUserId,
  makeCaseId,
  makeAssetId,
  makeBeneficiaryId,
  DeathCaseState,
  CaseInitiationType,
  CaseHoldReasonCode,
  AssetType,
  AssetSensitivity,
} from '@portfolio-immortalized/domain';
import { DeathCaseDal } from '../src/dal/death-case.js';
import { InactivitySweepService } from '../src/services/inactivity.js';
import { ReleaseService } from '../src/services/release.js';
import { LegacyPlanDal } from '../src/dal/legacy-plan.js';
import { VaultDal } from '../src/dal/vault.js';
import { LocalStorageProvider } from '../src/storage/provider.js';
import { EnvelopeEncryptionService, InMemoryKmsClient } from '../src/crypto/envelope.js';
import { AuditService } from '../src/audit/logger.js';
import crypto from 'node:crypto';

import { RelationshipDal } from '../src/dal/relationships.js';

describe('Stage 5: Verification Engine, Inactivity Sweeps & Multi-Person Release', () => {
  let deathCaseDal: DeathCaseDal;
  let auditService: AuditService;
  let inactivityService: InactivitySweepService;
  let legacyPlanDal: LegacyPlanDal;
  let vaultDal: VaultDal;
  let relationshipDal: RelationshipDal;
  let releaseService: ReleaseService;

  const ownerId = makeUserId('00000000-0000-0000-0000-000000000001');
  const trustee1Id = makeUserId('00000000-0000-0000-0000-000000000011');
  const trustee2Id = makeUserId('00000000-0000-0000-0000-000000000012');
  const reviewerAdminId = makeUserId('00000000-0000-0000-0000-000000000021');
  const approverAdminId = makeUserId('00000000-0000-0000-0000-000000000022');
  const securityAdminId = makeUserId('00000000-0000-0000-0000-000000000031');

  beforeEach(() => {
    auditService = new AuditService();
    deathCaseDal = new DeathCaseDal(auditService);
    inactivityService = new InactivitySweepService(deathCaseDal, auditService);

    const storageProvider = new LocalStorageProvider();
    vaultDal = new VaultDal({ storageProvider, auditService });
    relationshipDal = new RelationshipDal(auditService);
    legacyPlanDal = new LegacyPlanDal({ vaultDal, relationshipDal, auditService });
    releaseService = new ReleaseService(deathCaseDal, legacyPlanDal, vaultDal, auditService);
  });

  describe('Death Case Initiation & Evidence Workflow', () => {
    it('initiates a death case from trustee report into REPORTED state', async () => {
      const deathCase = await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        trustee1Id,
        {
          statement: 'Family informed us of owner passing in Nairobi Hospital.',
          relationshipType: 'PRIMARY_TRUSTEE',
        }
      );

      expect(deathCase.id).toBeDefined();
      expect(deathCase.state).toBe(DeathCaseState.REPORTED);
      expect(deathCase.ownerId).toBe(ownerId);
      expect(deathCase.stateVersion).toBe(1);
    });

    it('submits evidence with issuing authority and transitions to EVIDENCE_PENDING', async () => {
      const deathCase = await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        trustee1Id
      );

      const evidence = await deathCaseDal.submitEvidence(deathCase.id, trustee1Id, {
        caseId: deathCase.id,
        uploadId: crypto.randomUUID(),
        evidenceType: 'DEATH_CERTIFICATE',
        issuingAuthority: 'Civil Registration Department, Kenya',
        issuingCountry: 'KE',
        issueDate: '2026-03-15',
        submitterDeclarationAccepted: true,
        notes: 'Official certificate authenticated with Registrar of Births and Deaths stamp.',
      });

      expect(evidence.id).toBeDefined();
      expect(evidence.issuingAuthority).toBe('Civil Registration Department, Kenya');

      const updated = await deathCaseDal.getCaseById(deathCase.id);
      expect(updated.state).toBe(DeathCaseState.EVIDENCE_PENDING);
      expect(updated.evidence.length).toBe(1);
    });

    it('tracks trustee co-signatures and advances to UNDER_REVIEW when checklist completes', async () => {
      const deathCase = await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        trustee1Id
      );

      await deathCaseDal.submitEvidence(deathCase.id, trustee1Id, {
        caseId: deathCase.id,
        uploadId: crypto.randomUUID(),
        evidenceType: 'BURIAL_PERMIT',
        issuingAuthority: 'Nairobi City County',
        issuingCountry: 'KE',
        issueDate: '2026-03-14',
        submitterDeclarationAccepted: true,
      });

      // Trustee 1 co-signs
      await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee1Id, {
        caseId: deathCase.id,
        attestationConfirmed: true,
        rationale: 'I was present at the memorial service and confirm the passing.',
      });

      // Trustee 2 co-signs
      const updated = await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee2Id, {
        caseId: deathCase.id,
        attestationConfirmed: true,
        rationale: 'I independently verified with the hospital and confirm.',
      });

      expect(updated.trusteeSignatures.length).toBe(2);
      expect(updated.state).toBe(DeathCaseState.UNDER_REVIEW);
    });
  });

  describe('Two-Person Independent Release Authorization (ADR-007, REL-001)', () => {
    async function prepareCaseUnderReview() {
      const deathCase = await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        trustee1Id
      );
      await deathCaseDal.submitEvidence(deathCase.id, trustee1Id, {
        caseId: deathCase.id,
        uploadId: crypto.randomUUID(),
        evidenceType: 'DEATH_CERTIFICATE',
        issuingAuthority: 'Department of Civil Registration',
        issuingCountry: 'KE',
        issueDate: '2026-03-15',
        submitterDeclarationAccepted: true,
      });
      await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee1Id, {
        caseId: deathCase.id,
        attestationConfirmed: true,
        rationale: 'Verified.',
      });
      await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee2Id, {
        caseId: deathCase.id,
        attestationConfirmed: true,
        rationale: 'Confirmed.',
      });
      return deathCaseDal.getCaseById(deathCase.id);
    }

    it('allows assigned reviewer to recommend approval advancing state to READY_FOR_SECOND_REVIEW', async () => {
      const deathCase = await prepareCaseUnderReview();

      await deathCaseDal.assignReviewer(deathCase.id, securityAdminId, reviewerAdminId);

      const recommended = await deathCaseDal.submitReviewRecommendation(deathCase.id, reviewerAdminId, {
        expectedStateVersion: deathCase.stateVersion,
        decision: 'RECOMMEND_APPROVAL',
        checklistVerified: true,
        rationale: 'All official seals, registration numbers, and trustee statements verified against government registry.',
      });

      expect(recommended.state).toBe(DeathCaseState.READY_FOR_SECOND_REVIEW);
      expect(recommended.decisions.length).toBe(1);
    });

    it('STRICTLY BLOCKS final approval when approverId === reviewerId (Separation of Duties)', async () => {
      const deathCase = await prepareCaseUnderReview();
      await deathCaseDal.assignReviewer(deathCase.id, securityAdminId, reviewerAdminId);

      const readyCase = await deathCaseDal.submitReviewRecommendation(deathCase.id, reviewerAdminId, {
        expectedStateVersion: deathCase.stateVersion,
        decision: 'RECOMMEND_APPROVAL',
        checklistVerified: true,
        rationale: 'Checklist verified.',
      });

      // Reviewer tries to approve their own recommendation!
      await expect(
        deathCaseDal.grantFinalApproval(readyCase.id, reviewerAdminId, {
          expectedStateVersion: readyCase.stateVersion,
          decision: 'APPROVE_RELEASE',
          reasonCode: 'EVIDENCE_VERIFIED',
          rationale: 'Self approval attempt.',
        })
      ).rejects.toThrow(/Separation of duties violation/i);
    });

    it('authorizes release when independent second approver grants final approval', async () => {
      const deathCase = await prepareCaseUnderReview();
      await deathCaseDal.assignReviewer(deathCase.id, securityAdminId, reviewerAdminId);

      const readyCase = await deathCaseDal.submitReviewRecommendation(deathCase.id, reviewerAdminId, {
        expectedStateVersion: deathCase.stateVersion,
        decision: 'RECOMMEND_APPROVAL',
        checklistVerified: true,
        rationale: 'Checklist verified.',
      });

      // Independent distinct administrator gives final approval
      const authorizedCase = await deathCaseDal.grantFinalApproval(readyCase.id, approverAdminId, {
        expectedStateVersion: readyCase.stateVersion,
        decision: 'APPROVE_RELEASE',
        reasonCode: 'EVIDENCE_VERIFIED',
        rationale: 'Secondary audit of registry seal completed. Release authorized.',
      });

      expect(authorizedCase.state).toBe(DeathCaseState.AUTHORIZED);
    });
  });

  describe('Asymmetric Emergency Hold & Resolution (CASE-03, ADR-006)', () => {
    it('allows security admin to immediately freeze pipeline with emergency hold', async () => {
      const deathCase = await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        trustee1Id
      );

      const hold = await deathCaseDal.placeEmergencyHold(deathCase.id, securityAdminId, {
        reasonCode: CaseHoldReasonCode.SUSPECTED_FRAUD,
        rationale: 'Informant identity could not be verified; preliminary hold placed pending forensic check.',
        scope: 'ALL_PENDING_RELEASES',
      });

      expect(hold.id).toBeDefined();
      expect(hold.active).toBe(true);

      const heldCase = await deathCaseDal.getCaseById(deathCase.id);
      expect(heldCase.state).toBe(DeathCaseState.HOLD);

      // Verify no progression allowed while on hold
      await expect(
        deathCaseDal.submitEvidence(deathCase.id, trustee1Id, {
          caseId: deathCase.id,
          uploadId: crypto.randomUUID(),
          evidenceType: 'OBITUARY',
          issuingAuthority: 'Daily Nation',
          issuingCountry: 'KE',
          issueDate: '2026-03-16',
          submitterDeclarationAccepted: true,
        })
      ).rejects.toThrow(/currently on HOLD/i);
    });

    it('lifts hold with formal rationale and returns case to UNDER_REVIEW', async () => {
      const deathCase = await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        trustee1Id
      );

      const hold = await deathCaseDal.placeEmergencyHold(deathCase.id, securityAdminId, {
        reasonCode: CaseHoldReasonCode.ADMINISTRATIVE_HOLD,
        rationale: 'Internal legal audit hold.',
        scope: 'ALL_PENDING_RELEASES',
      });

      const lifted = await deathCaseDal.resolveEmergencyHold(deathCase.id, securityAdminId, {
        holdId: hold.id,
        rationale: 'Audit cleared by Chief Legal Officer.',
      });

      expect(lifted.active).toBe(false);
      expect(lifted.liftedRationale).toContain('Chief Legal Officer');

      const restoredCase = await deathCaseDal.getCaseById(deathCase.id);
      expect(restoredCase.state).toBe(DeathCaseState.UNDER_REVIEW);
    });
  });

  describe('Inactivity Evaluation & Owner Activity Preemption (MON-01, CASE-01)', () => {
    it('filters out passive heartbeats and only accepts qualifying meaningful activity', async () => {
      inactivityService.registerOwner(ownerId, new Date('2026-01-01'));

      // Disqualified passive telemetry
      const passive1 = await inactivityService.recordActivity(ownerId, 'APP_LAUNCH_PASSIVE');
      const passive2 = await inactivityService.recordActivity(ownerId, 'BACKGROUND_TOKEN_REFRESH');
      expect(passive1).toBe(false);
      expect(passive2).toBe(false);

      // Qualifying meaningful activity
      const meaningful = await inactivityService.recordActivity(ownerId, 'AUTH_LOGIN_SUCCESS');
      expect(meaningful).toBe(true);
    });

    it('opens an investigation at 104 days (90d threshold + 14d grace) without releasing assets', async () => {
      // 105 days ago
      const pastDate = new Date(Date.now() - 105 * 24 * 60 * 60 * 1000);
      inactivityService.registerOwner(ownerId, pastDate);

      const sweep = await inactivityService.executeSweep();
      expect(sweep.investigationsOpened).toBe(1);

      const activeCase = await deathCaseDal.getActiveCaseByOwner(ownerId);
      expect(activeCase).not.toBeNull();
      expect(activeCase?.state).toBe(DeathCaseState.INACTIVITY_REVIEW);
      expect(activeCase?.initiationType).toBe(CaseInitiationType.INACTIVITY);
    });

    it('preempts and closes inactivity investigation when owner verified active', async () => {
      const pastDate = new Date(Date.now() - 105 * 24 * 60 * 60 * 1000);
      inactivityService.registerOwner(ownerId, pastDate);
      await inactivityService.executeSweep();

      // Owner logs in
      await inactivityService.recordActivity(ownerId, 'AUTH_PASSKEY_VERIFIED');

      const activeCase = await deathCaseDal.getActiveCaseByOwner(ownerId);
      // Closed cases are excluded from getActiveCaseByOwner
      expect(activeCase).toBeNull();

      const allCases = await deathCaseDal.listCases({ ownerId });
      expect(allCases[0]?.state).toBe(DeathCaseState.CLOSED_NO_EVIDENCE);
    });
  });

  describe('Release Grant Generation & Exact Recipient Partitioning (POL-01)', () => {
    it('issues grants from published plan and allows beneficiary to decrypt allocated assets only', async () => {
      // 1. Upload an asset to vault
      const uploadIntent = await vaultDal.createUploadIntent(ownerId, {
        fileName: 'Title_Deed_Land_Parcel_442.pdf',
        title: 'Title Deed Land Parcel 442',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 1024,
        category: AssetType.DOCUMENT,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      });

      const fileContent = Buffer.from('%PDF-1.4 Mock land parcel deed document for release');
      const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

      await vaultDal.commitUpload(
        ownerId,
        uploadIntent.assetId,
        uploadIntent.versionNumber,
        fileContent,
        fileHash,
        'application/pdf'
      );

      // 2. Register beneficiary and publish legacy plan allocating this asset
      const beneficiary1 = await relationshipDal.createBeneficiary(
        ownerId,
        {
          name: 'Jane Beneficiary',
          email: 'jane@example.com',
          relationshipType: 'SPOUSE',
        },
        ownerId
      );

      await legacyPlanDal.upsertInstruction(ownerId, {
        beneficiaryId: beneficiary1.id,
        assignedAssetIds: [uploadIntent.assetId],
        customInstructions: 'Please hold this title deed in trust for the family.',
      });
      await legacyPlanDal.publishPlan(ownerId, { acceptanceDisclaimerConfirmed: true });

      // 3. Initiate and authorize death case
      const deathCase = await deathCaseDal.initiateCase(
        ownerId,
        CaseInitiationType.TRUSTEE_REPORT,
        trustee1Id
      );
      await deathCaseDal.submitEvidence(deathCase.id, trustee1Id, {
        caseId: deathCase.id,
        uploadId: crypto.randomUUID(),
        evidenceType: 'DEATH_CERTIFICATE',
        issuingAuthority: 'Department of Civil Registration',
        issuingCountry: 'KE',
        issueDate: '2026-03-15',
        submitterDeclarationAccepted: true,
      });
      await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee1Id, {
        caseId: deathCase.id,
        attestationConfirmed: true,
        rationale: 'Confirmed.',
      });
      await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee2Id, {
        caseId: deathCase.id,
        attestationConfirmed: true,
        rationale: 'Confirmed.',
      });
      await deathCaseDal.assignReviewer(deathCase.id, securityAdminId, reviewerAdminId);
      const readyCase = await deathCaseDal.submitReviewRecommendation(deathCase.id, reviewerAdminId, {
        expectedStateVersion: 3,
        decision: 'RECOMMEND_APPROVAL',
        checklistVerified: true,
        rationale: 'All clear.',
      });
      const authorizedCase = await deathCaseDal.grantFinalApproval(readyCase.id, approverAdminId, {
        expectedStateVersion: readyCase.stateVersion,
        decision: 'APPROVE_RELEASE',
        reasonCode: 'EVIDENCE_VERIFIED',
        rationale: 'Approved.',
      });

      // 4. Generate release grants
      const grants = await releaseService.generateGrantsForAuthorizedCase(authorizedCase.id);
      expect(grants.length).toBe(1);
      const grant = grants[0]!;
      expect(grant.beneficiaryId).toBe(beneficiary1.id);
      expect(grant.allocatedAssetIds).toContain(uploadIntent.assetId);

      // Case state should now be RELEASED
      const releasedCase = await deathCaseDal.getCaseById(authorizedCase.id);
      expect(releasedCase.state).toBe(DeathCaseState.RELEASED);

      // 5. Beneficiary downloads allocated asset
      const downloaded = await releaseService.downloadReleasedAsset(
        grant.id,
        beneficiary1.id,
        uploadIntent.assetId
      );
      expect(downloaded.title).toBe('Title_Deed_Land_Parcel_442.pdf');
      expect(downloaded.plaintext.toString()).toBe(fileContent.toString());
      expect(downloaded.sha256).toBe(fileHash);

      // 6. Invariant POL-01: Downloading an unallocated asset fails with 403
      const fakeAssetId = makeAssetId(crypto.randomUUID());
      await expect(
        releaseService.downloadReleasedAsset(grant.id, beneficiary1.id, fakeAssetId)
      ).rejects.toThrow(/not allocated to this release grant/i);
    });
  });
});
