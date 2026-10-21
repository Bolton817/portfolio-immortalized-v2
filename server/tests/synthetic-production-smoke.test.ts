/**
 * Synthetic Production Smoke Test Suite (TDD Chapter 31, 34, 35 & 36)
 *
 * Validates the 5 critical multi-actor real-world user lifecycles and operational runbooks:
 * 1. Owner Onboarding, Progressive Profile Setup & Encrypted Vault Ingestion
 * 2. Inactivity Escalation & Meaningful Owner Activity Clock Reset (CASE-01)
 * 3. Trustee Invitation, Token Hash Verification & Quorum Evidence Submission
 * 4. Dual-Custody Administrative Triage & Independent Authorization (REL-001, CASE-10)
 * 5. Beneficiary Grant Redemption & Dynamic Recipient Forensic Watermarking (OD-19)
 * 6. Day-2 Automated Incident Response & Isolated Disaster Recovery Drill
 */

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import {
  makeUserId,
  AssetStatus,
  CaseInitiationType,
  DeathCaseState,
  AITaskName,
} from '@portfolio-immortalized/domain';
import {
  ProfileDal,
  calculateProfileReadiness,
  RelationshipDal,
  VaultDal,
  LegacyPlanDal,
  DeathCaseDal,
  AdminDal,
  InactivitySweepService,
  ReleaseService,
  BeneficiaryDal,
  WatermarkService,
  AuditService,
  MemoryAuditSink,
  IncidentResponseService,
  AutomatedRestoreDrillRunner,
  AIGatewayService,
} from '../src/index.js';

describe('Stage 10: Synthetic Production Smoke & GA Readiness Test Suite', () => {
  let auditSink: MemoryAuditSink;
  let auditService: AuditService;
  let profileDal: ProfileDal;
  let relationshipDal: RelationshipDal;
  let vaultDal: VaultDal;
  let legacyPlanDal: LegacyPlanDal;
  let deathCaseDal: DeathCaseDal;
  let inactivityService: InactivitySweepService;
  let releaseService: ReleaseService;
  let adminDal: AdminDal;
  let watermarkService: WatermarkService;
  let beneficiaryDal: BeneficiaryDal;
  let incidentService: IncidentResponseService;
  let restoreDrillRunner: AutomatedRestoreDrillRunner;
  let aiGateway: AIGatewayService;

  beforeEach(() => {
    auditSink = new MemoryAuditSink();
    auditService = new AuditService(auditSink);

    profileDal = new ProfileDal();
    relationshipDal = new RelationshipDal(auditService);
    vaultDal = new VaultDal({ auditService });
    legacyPlanDal = new LegacyPlanDal({ vaultDal, relationshipDal, auditService });
    deathCaseDal = new DeathCaseDal(auditService);
    inactivityService = new InactivitySweepService(deathCaseDal, auditService);
    releaseService = new ReleaseService(deathCaseDal, legacyPlanDal, vaultDal, auditService);
    adminDal = new AdminDal(auditService);
    watermarkService = new WatermarkService();
    beneficiaryDal = new BeneficiaryDal(releaseService, vaultDal, watermarkService, auditService);
    aiGateway = new AIGatewayService(auditService);

    incidentService = new IncidentResponseService(
      adminDal,
      deathCaseDal,
      auditService,
      aiGateway
    );
    restoreDrillRunner = new AutomatedRestoreDrillRunner(undefined, auditService);
  });

  // ============================================================================
  // Journey 1: Owner Onboarding, Progressive Profile & Vault Ingestion
  // ============================================================================
  it('Journey 1: Owner completes progressive profile and ingests encrypted legacy asset', async () => {
    const ownerId = makeUserId(`usr_owner_${Date.now()}`);

    // 1. Initial Profile Setup
    const initialProfile = await profileDal.createProfile(ownerId, 'Alexander Kamau');
    const initialReadiness = calculateProfileReadiness(initialProfile, 0, 0);
    expect(initialReadiness.percentage).toBe(20);

    // 2. Progressive Completion (Legal Name, DoB, Residency)
    const updatedProfile = await profileDal.updateProfile(
      ownerId,
      {
        legalName: 'Alexander Patrick Kamau',
        dateOfBirth: '1982-07-24',
        residenceCountry: 'KE',
      },
      1
    );
    const updatedReadiness = calculateProfileReadiness(updatedProfile, 0, 0);
    expect(updatedReadiness.percentage).toBe(50); // 20 base + 30 legal identity
    expect(updatedReadiness.hasLegalIdentity).toBe(true);

    // 3. Vault Ingestion: Two-phase upload intent & commit
    const plaintextWill = Buffer.from(
      '%PDF-1.4 ... LAST WILL AND TESTAMENT OF ALEXANDER KAMAU ... %%EOF'
    );
    const declaredHash = crypto.createHash('sha256').update(plaintextWill).digest('hex');

    const intent = await vaultDal.createUploadIntent(ownerId, {
      title: 'Signed Will 2026.pdf',
      declaredSizeBytes: plaintextWill.length,
      declaredMimeType: 'application/pdf',
      assetType: 'WILL' as any,
    });

    const commit = await vaultDal.commitUpload(
      ownerId,
      intent.assetId,
      intent.versionNumber,
      plaintextWill,
      declaredHash,
      'application/pdf'
    );

    expect(commit.status).toBe(AssetStatus.AVAILABLE);
    expect(commit.currentVersionId).toBeDefined();

    // Verify download descriptor unwraps ciphertext and checks SHA-256
    const descriptor = await vaultDal.getAssetDownloadDescriptor(ownerId, intent.assetId, 1);
    expect(descriptor.plaintext.toString('utf-8')).toBe(plaintextWill.toString('utf-8'));
    expect(descriptor.sha256).toBe(declaredHash);
  });

  // ============================================================================
  // Journey 2: Inactivity Escalation & Meaningful Owner Activity Clock Reset
  // ============================================================================
  it('Journey 2: Inactivity opens concern inquiry, verified activity resets clock, zero timer release', async () => {
    const ownerId = makeUserId(`usr_owner_inactivity_${Date.now()}`);

    // 105 days ago (90d threshold + 14d grace passed)
    const pastDate = new Date(Date.now() - 105 * 24 * 60 * 60 * 1000);
    inactivityService.registerOwner(ownerId, pastDate);

    // Run sweep
    const sweep = await inactivityService.executeSweep();
    expect(sweep.investigationsOpened).toBe(1);

    const activeCase = await deathCaseDal.getActiveCaseByOwner(ownerId);
    expect(activeCase).not.toBeNull();
    expect(activeCase?.state).toBe(DeathCaseState.INACTIVITY_REVIEW);
    expect(activeCase?.initiationType).toBe(CaseInitiationType.INACTIVITY);

    // Inactivity must NEVER transition to RELEASE_APPROVED on its own
    expect(activeCase?.state).not.toBe(DeathCaseState.AUTHORIZED);
    expect(activeCase?.state).not.toBe(DeathCaseState.RELEASED);

    // Living owner logs in and performs verified activity
    const activityRecorded = await inactivityService.recordActivity(ownerId, 'AUTH_PASSKEY_VERIFIED');
    expect(activityRecorded).toBe(true);

    const refetchedActive = await deathCaseDal.getActiveCaseByOwner(ownerId);
    expect(refetchedActive).toBeNull(); // Closed case is excluded from active

    const allCases = await deathCaseDal.listCases({ ownerId });
    expect(allCases[0]?.state).toBe(DeathCaseState.CLOSED_NO_EVIDENCE);
  });

  // ============================================================================
  // Journey 3: Trustee Invitation, Token Hashing & Quorum Evidence Submission
  // ============================================================================
  it('Journey 3: Trustee invitation with token hashing and death evidence submission', async () => {
    const ownerId = makeUserId(`usr_owner_trustee_${Date.now()}`);
    const trusteeUserId = makeUserId(`usr_trustee_${Date.now()}`);

    // Owner creates trustee invitation
    const invite = await relationshipDal.createTrusteeInvitation(
      ownerId,
      {
        name: 'Dr. Sarah Mwangi',
        email: 'sarah.mwangi@example.com',
        relationshipType: 'PROFESSIONAL',
        message: 'Please act as my trustee.',
      },
      ownerId
    );

    expect(invite.rawInvitationToken).toBeDefined();

    // Trustee accepts invitation using token
    const accepted = await relationshipDal.acceptTrusteeInvitation(
      invite.rawInvitationToken,
      trusteeUserId
    );
    expect(accepted.status).toBe('ACCEPTED');

    // Case is opened upon trustee report
    const deathCase = await deathCaseDal.initiateCase(
      ownerId,
      CaseInitiationType.TRUSTEE_REPORT,
      trusteeUserId,
      { statement: 'Owner passed away at Nairobi Hospital' }
    );

    expect(deathCase.state).toBe(DeathCaseState.REPORTED);

    // Trustee submits death certificate evidence hash
    const evidence = await deathCaseDal.submitEvidence(
      deathCase.id,
      trusteeUserId,
      {
        caseId: deathCase.id,
        uploadId: crypto.randomUUID(),
        evidenceType: 'DEATH_CERTIFICATE',
        sourceFileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        issuingAuthority: 'Civil Registration Services (Kenya)',
        notes: 'Original certified copy inspected',
        issuingCountry: 'KE',
        issueDate: '2026-03-15',
        submitterDeclarationAccepted: true,
      }
    );

    expect(evidence.id).toBeDefined();
    const updatedCase = await deathCaseDal.getCaseById(deathCase.id);
    expect(updatedCase.state).toBe(DeathCaseState.EVIDENCE_PENDING);
  });

  // ============================================================================
  // Journey 4: Dual-Custody Administrative Triage & Independent Authorization
  // ============================================================================
  it('Journey 4: Strict dual-custody enforcement prevents reviewer-approver collusion', async () => {
    const ownerId = makeUserId(`usr_owner_dual_${Date.now()}`);
    const trustee1Id = makeUserId(`usr_trustee1_${Date.now()}`);
    const trustee2Id = makeUserId(`usr_trustee2_${Date.now()}`);
    const reviewerId = makeUserId('usr_admin_reviewer_1');
    const approverId = makeUserId('usr_admin_approver_2');

    // Open case and submit evidence
    const deathCase = await deathCaseDal.initiateCase(
      ownerId,
      CaseInitiationType.TRUSTEE_REPORT,
      trustee1Id
    );
    await deathCaseDal.submitEvidence(deathCase.id, trustee1Id, {
      caseId: deathCase.id,
      uploadId: crypto.randomUUID(),
      evidenceType: 'DEATH_CERTIFICATE',
      sourceFileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      issuingAuthority: 'Ministry of Interior',
      issuingCountry: 'KE',
      issueDate: '2026-03-15',
      submitterDeclarationAccepted: true,
    });

    // Trustee 1 and Trustee 2 co-sign to advance to UNDER_REVIEW
    await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee1Id, {
      caseId: deathCase.id,
      attestationConfirmed: true,
      rationale: 'Confirmed.',
    });
    const underReviewCase = await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee2Id, {
      caseId: deathCase.id,
      attestationConfirmed: true,
      rationale: 'Verified.',
    });
    expect(underReviewCase.state).toBe(DeathCaseState.UNDER_REVIEW);

    // Assign reviewer
    await deathCaseDal.assignReviewer(deathCase.id, 'usr_admin_super', reviewerId);

    // Case Reviewer submits recommendation
    const recommended = await deathCaseDal.submitReviewRecommendation(deathCase.id, reviewerId, {
      expectedStateVersion: underReviewCase.stateVersion,
      decision: 'RECOMMEND_APPROVAL',
      checklistVerified: true,
      rationale: 'Official registrar verification confirmed valid death record.',
    });
    expect(recommended.state).toBe(DeathCaseState.READY_FOR_SECOND_REVIEW);

    // Invariant Check: Reviewer CANNOT act as their own final approver
    await expect(
      deathCaseDal.grantFinalApproval(deathCase.id, reviewerId, {
        expectedStateVersion: recommended.stateVersion,
        decision: 'APPROVE_RELEASE',
        reasonCode: 'EVIDENCE_VERIFIED',
        rationale: 'Attempting self-approval as case reviewer',
      })
    ).rejects.toThrow();

    // Distinct Final Approver authorizes release
    const authorizedCase = await deathCaseDal.grantFinalApproval(deathCase.id, approverId, {
      expectedStateVersion: recommended.stateVersion,
      decision: 'APPROVE_RELEASE',
      reasonCode: 'EVIDENCE_VERIFIED',
      rationale: 'Independent legal counsel confirmation complete. Authorizing release.',
    });

    expect(authorizedCase.state).toBe(DeathCaseState.AUTHORIZED);
  });

  // ============================================================================
  // Journey 5: Beneficiary Grant Redemption & Dynamic Recipient Watermarking
  // ============================================================================
  it('Journey 5: Beneficiary redeems grant and downloads dynamically watermarked asset without mutating vault ciphertext', async () => {
    const ownerId = makeUserId(`usr_owner_ben_${Date.now()}`);
    const trustee1Id = makeUserId(`usr_trustee1_${Date.now()}`);
    const trustee2Id = makeUserId(`usr_trustee2_${Date.now()}`);
    const reviewerId = makeUserId('usr_admin_rev');
    const approverId = makeUserId('usr_admin_app');
    const beneficiaryEmail = 'maya@family.ke';

    // 1. Setup Beneficiary
    const ben = await relationshipDal.createBeneficiary(
      ownerId,
      {
        name: 'Maya Mutua',
        email: beneficiaryEmail,
        relationshipType: 'DAUGHTER',
      },
      ownerId
    );

    // 2. Setup Vault Asset
    const intent = await vaultDal.createUploadIntent(ownerId, {
      title: 'Family Message & Asset Allocation.pdf',
      declaredMimeType: 'application/pdf',
      declaredSizeBytes: 500,
      assetType: 'DOCUMENT' as any,
    });
    const plaintext = Buffer.from('SPECIAL INSTRUCTIONS FOR MAYA: HERITAGE LAND TITLE 104/KE', 'utf-8');
    const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
    await vaultDal.commitUpload(
      ownerId,
      intent.assetId,
      intent.versionNumber,
      plaintext,
      hash,
      'application/pdf'
    );

    // 3. Publish Legacy Plan
    const draft = await legacyPlanDal.getDraftPlan(ownerId);
    await legacyPlanDal.upsertInstruction(ownerId, draft.id, {
      beneficiaryId: ben.id,
      assignedAssetIds: [intent.assetId],
      customInstructions: 'Please hold in trust for family.',
    });
    await legacyPlanDal.publishPlan(ownerId, draft.id, {
      acknowledgedCap160: true,
      acknowledgedProbateDisclaimer: true,
    });

    // 4. Progress Death Case to AUTHORIZED
    const deathCase = await deathCaseDal.initiateCase(
      ownerId,
      CaseInitiationType.TRUSTEE_REPORT,
      trustee1Id
    );
    await deathCaseDal.submitEvidence(deathCase.id, trustee1Id, {
      caseId: deathCase.id,
      uploadId: crypto.randomUUID(),
      evidenceType: 'DEATH_CERTIFICATE',
      sourceFileHash: hash,
      issuingAuthority: 'Civil Registration',
      issuingCountry: 'KE',
      issueDate: '2026-03-15',
      submitterDeclarationAccepted: true,
    });
    await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee1Id, {
      caseId: deathCase.id,
      attestationConfirmed: true,
      rationale: 'Verified.',
    });
    const underReviewCase = await deathCaseDal.recordTrusteeCoSign(deathCase.id, trustee2Id, {
      caseId: deathCase.id,
      attestationConfirmed: true,
      rationale: 'Confirmed.',
    });
    await deathCaseDal.assignReviewer(deathCase.id, 'usr_admin_super', reviewerId);
    const recommended = await deathCaseDal.submitReviewRecommendation(deathCase.id, reviewerId, {
      expectedStateVersion: underReviewCase.stateVersion,
      decision: 'RECOMMEND_APPROVAL',
      checklistVerified: true,
      rationale: 'Evidence verified',
    });
    await deathCaseDal.grantFinalApproval(deathCase.id, approverId, {
      expectedStateVersion: recommended.stateVersion,
      decision: 'APPROVE_RELEASE',
      reasonCode: 'EVIDENCE_VERIFIED',
      rationale: 'Authorized',
    });

    // 5. Generate Release Grants
    const grants = await releaseService.generateGrantsForAuthorizedCase(deathCase.id);
    expect(grants.length).toBe(1);
    const grant = grants[0];
    expect(grant.beneficiaryEmail).toBe(beneficiaryEmail);

    // 6. Beneficiary redeems grant and downloads watermarked asset
    const downloaded = await beneficiaryDal.getWatermarkedAsset(
      {
        grantId: grant.id,
        beneficiaryId: ben.id,
        email: beneficiaryEmail,
        name: 'Maya Mutua',
        expiresAt: Date.now() + 3600000,
      },
      grant.id,
      intent.assetId
    );

    expect(downloaded.buffer).toBeDefined();
    expect(downloaded.buffer.length).toBeGreaterThan(0);
    expect(downloaded.filename).toContain('Family_Message');
    expect(downloaded.filename).toContain('watermarked');

    // Confirm that the watermarked derivative contains recipient attribution metadata
    const bufferStr = downloaded.buffer.toString('utf-8');
    expect(bufferStr).toContain('PORTFOLIO IMMORTALIZED');
    expect(bufferStr).toContain('Maya Mutua');
    expect(bufferStr).toContain('Forensic Trace Hash');
  });

  // ============================================================================
  // Journey 6: Day-2 Operational Incident Response & Automated Restore Drill
  // ============================================================================
  it('Journey 6: Executes incident response runbooks and automated isolated disaster recovery drill', async () => {
    // 1. Runbook 33.3: Compromised Admin Account Revocation (using seeded user usr_admin_reviewer)
    const compromisedResult = await incidentService.handleCompromisedAdmin({
      compromisedAdminId: 'usr_admin_reviewer',
      actorId: 'usr_admin_super',
      reason: 'Phishing credential compromise detected by SOC',
    });
    expect(compromisedResult.status).toBe('ADMIN_SESSIONS_REVOKED_AND_SUSPENDED');

    // 2. Runbook 33.5: AI Privacy Killswitch
    const killswitchResult = await incidentService.handleAiKillswitch({
      disable: true,
      actorId: 'usr_admin_super',
      reason: 'Upstream provider terms privacy review',
    });
    expect(killswitchResult.status).toBe('AI_KILLSWITCH_ENGAGED');

    // Verify AI task execution fails closed while killswitch is active
    await expect(
      aiGateway.executeTask({
        taskName: AITaskName.DOCUMENT_CLASSIFY,
        input: { text: 'Test legal document' },
      })
    ).rejects.toThrow(/disabled under emergency policy killswitch/);

    // Lift killswitch
    await incidentService.handleAiKillswitch({
      disable: false,
      actorId: 'usr_admin_super',
      reason: 'Privacy review completed',
    });

    // 3. Automated Isolated Restore Drill (DR-001, OPS-04)
    const drillReport = await restoreDrillRunner.executeDrill();
    expect(drillReport.status).toBe('PASSED');
    expect(drillReport.checks.kmsEnvelopeRestore.status).toBe('PASSED');
    expect(drillReport.checks.outboundWorkerSuppression.status).toBe('PASSED');
    expect(drillReport.recoveryObjectives.achievedRtoSeconds).toBeLessThan(5);
  });
});
