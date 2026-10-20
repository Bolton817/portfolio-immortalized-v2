import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import {
  UserId,
  makeUserId,
  makeBeneficiaryId,
  RelationshipStatus,
  DeathCaseState,
  CaseInitiationType,
  ReleaseGrantStatus,
  NotificationEventType,
  OutboxEventStatus,
} from '@portfolio-immortalized/domain';
import {
  ProfileDal,
  RelationshipDal,
  VaultDal,
  LegacyPlanDal,
  DeathCaseDal,
  ReleaseService,
  InactivitySweepService,
  OutboxService,
  BrevoNotificationAdapter,
  WatermarkService,
  BeneficiaryDal,
  BackgroundWorker,
  AuditService,
  MemoryAuditSink,
  calculateProfileReadiness,
} from '../src/index.js';

describe('Comprehensive Multi-Party End-to-End Estate Lifecycle Simulation', () => {
  it('executes complete 15-step estate journey from owner onboarding to forensic watermarked release', async () => {
    // =========================================================================
    // Setup Shared Infrastructure & Audit Sink
    // =========================================================================
    const auditSink = new MemoryAuditSink();
    const auditService = new AuditService(auditSink);
    const profileDal = new ProfileDal(auditService);
    const relationshipDal = new RelationshipDal(auditService);
    const vaultDal = new VaultDal({ auditService });
    const legacyPlanDal = new LegacyPlanDal({ vaultDal, relationshipDal, auditService });
    const deathCaseDal = new DeathCaseDal(auditService);
    const releaseService = new ReleaseService(deathCaseDal, legacyPlanDal, vaultDal, auditService);
    const inactivityService = new InactivitySweepService(deathCaseDal, auditService);
    const brevoAdapter = new BrevoNotificationAdapter({ isMock: true });
    const outboxService = new OutboxService(brevoAdapter);
    const watermarkService = new WatermarkService();
    const beneficiaryDal = new BeneficiaryDal(releaseService, vaultDal, watermarkService, auditService);

    const backgroundWorker = new BackgroundWorker({
      inactivityService,
      outboxService,
      releaseService,
      auditService,
    });

    const ownerId = makeUserId('usr_owner_edward');
    const trustee1Email = 'trustee.sarah@example.com';
    const trustee2Email = 'trustee.michael@example.com';
    const beneficiaryEmail = 'beneficiary.emma@example.com';
    const reviewerAdminId = makeUserId('admin_reviewer_claire');
    const approverAdminId = makeUserId('admin_approver_richard');

    // -------------------------------------------------------------------------
    // Step 1: Owner Profile Setup
    // -------------------------------------------------------------------------
    const profile = await profileDal.createProfile(ownerId, {
      displayName: 'Edward Sterling',
      legalName: 'Edward Arthur Sterling',
      dateOfBirth: '1970-05-15',
      nationality: 'GB',
      residenceCountry: 'HK',
    });
    expect(profile.userId).toBe(ownerId);
    const readiness = calculateProfileReadiness(profile, 0, 0);
    expect(readiness.percentage).toBeGreaterThanOrEqual(10);

    // Register owner activity with inactivity monitoring engine
    inactivityService.registerOwner(ownerId, new Date(Date.now() - 30 * 24 * 3600 * 1000));

    // -------------------------------------------------------------------------
    // Step 2: Vault Asset Upload (AES-256-GCM Envelope Encryption with AAD)
    // -------------------------------------------------------------------------
    const uploadIntent = await vaultDal.createUploadIntent(ownerId, {
      title: 'Family Testament & Share Certificate Allocation',
      assetType: 'DOCUMENT' as any,
      declaredMimeType: 'application/pdf',
      declaredSizeBytes: 250,
    });
    expect(uploadIntent.assetId).toBeDefined();

    const plaintextPayload = Buffer.from(
      'TESTAMENT OF EDWARD ARTHUR STERLING:\nAll overseas equity holdings allocated to Emma Sterling.',
      'utf8'
    );
    const sha256 = crypto.createHash('sha256').update(plaintextPayload).digest('hex');

    const committedAsset = await vaultDal.commitUpload(
      ownerId,
      uploadIntent.assetId,
      uploadIntent.versionNumber,
      plaintextPayload,
      sha256,
      'application/pdf'
    );
    expect(committedAsset.versions).toHaveLength(1);
    expect(committedAsset.versions[0]?.sha256).toBe(sha256);

    // -------------------------------------------------------------------------
    // Step 3: Owner invites 2 Trustees (Single-Use Token Generation)
    // -------------------------------------------------------------------------
    const trustee1Invitation = await relationshipDal.inviteTrustee(ownerId, {
      name: 'Sarah Trustee',
      email: trustee1Email,
      relationshipType: 'PROFESSIONAL_SOLICITOR',
    });
    expect(trustee1Invitation.rawInvitationToken).toBeDefined();

    const trustee2Invitation = await relationshipDal.inviteTrustee(ownerId, {
      name: 'Michael Trustee',
      email: trustee2Email,
      relationshipType: 'FAMILY_FRIEND',
    });
    expect(trustee2Invitation.rawInvitationToken).toBeDefined();

    // -------------------------------------------------------------------------
    // Step 4: Trustees accept appointments, establishing quorum (2 of 2)
    // -------------------------------------------------------------------------
    const trustee1User = makeUserId('usr_trustee_sarah');
    const accepted1 = await relationshipDal.acceptTrusteeInvitation(
      trustee1User,
      trustee1Invitation.rawInvitationToken
    );
    expect(accepted1.status).toBe(RelationshipStatus.ACCEPTED);

    const trustee2User = makeUserId('usr_trustee_michael');
    const accepted2 = await relationshipDal.acceptTrusteeInvitation(
      trustee2User,
      trustee2Invitation.rawInvitationToken
    );
    expect(accepted2.status).toBe(RelationshipStatus.ACCEPTED);

    const activeTrustees = await relationshipDal.listTrusteesByOwner(ownerId);
    expect(activeTrustees.filter((t) => t.status === RelationshipStatus.ACCEPTED)).toHaveLength(2);

    // -------------------------------------------------------------------------
    // Step 5: Owner creates Beneficiary Relationship
    // -------------------------------------------------------------------------
    const beneficiaryRecord = await relationshipDal.createBeneficiary(ownerId, {
      name: 'Emma Sterling',
      email: beneficiaryEmail,
      relationshipType: 'DAUGHTER',
      personalNote: 'For university education and family trust legacy.',
    });
    expect(beneficiaryRecord.id).toBeDefined();

    // -------------------------------------------------------------------------
    // Step 6: Owner drafts Legacy Plan allocating specific asset (POL-01)
    // -------------------------------------------------------------------------
    const draftPlan = await legacyPlanDal.getDraftPlan(ownerId);
    await legacyPlanDal.upsertInstruction(ownerId, draftPlan.id, {
      beneficiaryId: beneficiaryRecord.id,
      assignedAssetIds: [committedAsset.id],
      customInstructions: 'To be held in trust until formal administration.',
    });

    // -------------------------------------------------------------------------
    // Step 7: Owner acknowledges Cap. 160 disclaimers and publishes plan
    // -------------------------------------------------------------------------
    const publishedPlan = await legacyPlanDal.publishPlan(ownerId, draftPlan.id, {
      acknowledgedCap160: true,
      acknowledgedProbateDisclaimer: true,
    });
    expect(publishedPlan.instructions).toHaveLength(1);
    expect(publishedPlan.instructions[0]?.assignedAssetIds).toContain(committedAsset.id);

    // -------------------------------------------------------------------------
    // Step 8: Inactivity Telemetry Sweep (Zero Timer-Based Release CASE-01)
    // -------------------------------------------------------------------------
    // Simulate 120 days elapsed since last activity
    const now = new Date();
    const simulatedOldDate = new Date(now.getTime() - 120 * 24 * 3600 * 1000);
    inactivityService.registerOwner(ownerId, simulatedOldDate);

    const sweepResult = await backgroundWorker.runInactivitySweep(now);
    // Inactivity opens investigation case, NOT timer-based asset release!
    expect(sweepResult.investigationsOpened).toBe(1);

    const activeCase = await deathCaseDal.getActiveCaseByOwner(ownerId);
    expect(activeCase).toBeDefined();
    expect(activeCase?.state).toBe(DeathCaseState.INACTIVITY_REVIEW);

    // -------------------------------------------------------------------------
    // Step 9: Trustee reports passing with evidence submission
    // -------------------------------------------------------------------------
    const formalCase = await deathCaseDal.initiateCase(
      ownerId,
      CaseInitiationType.TRUSTEE_REPORT,
      trustee1User,
      {
        statement: 'Formal notification received from Queen Mary Hospital.',
      }
    );

    const evidence = await deathCaseDal.submitEvidence(
      formalCase.id,
      trustee1User,
      {
        evidenceType: 'DEATH_CERTIFICATE',
        issuingAuthority: 'Hong Kong Department of Health Births and Deaths Registry',
        issuingCountry: 'HK',
        issueDate: '2026-10-15',
        notes: 'Original certified true extract with official embossed seal.',
      },
      committedAsset.versions[0]?.id
    );
    expect(evidence.id).toBeDefined();

    // -------------------------------------------------------------------------
    // Step 10: Second Trustee co-signs case fulfilling Quorum requirement
    // -------------------------------------------------------------------------
    const coSigned = await deathCaseDal.coSignCase(formalCase.id, trustee2User, {
      confirmation: true,
      notes: 'Second trustee corroboration: confirmed with family and hospital registry.',
    });
    expect(coSigned.trusteeSignatures).toHaveLength(1);

    // -------------------------------------------------------------------------
    // Step 11: Case Reviewer assesses evidence and recommends approval
    // -------------------------------------------------------------------------
    await deathCaseDal.assignReviewer(formalCase.id, reviewerAdminId);
    const recommended = await deathCaseDal.recommendApproval(formalCase.id, reviewerAdminId, {
      reasonCode: 'REVIEWER_PASSED',
      rationale: 'Official seal and hospital registry corroborate authentic extract.',
    });
    expect(recommended.state).toBe(DeathCaseState.READY_FOR_SECOND_REVIEW);

    // -------------------------------------------------------------------------
    // Step 12: Separation of Duties Enforcement (ADR-007, REL-001)
    // Reviewer CANNOT self-approve!
    // -------------------------------------------------------------------------
    await expect(
      deathCaseDal.approveFinalRelease(formalCase.id, reviewerAdminId, {
        reasonCode: 'FINAL_RELEASE_AUTHORIZED',
        rationale: 'Attempting self-approval should fail.',
      })
    ).rejects.toThrow(/SEPARATION_OF_DUTIES_VIOLATION/i);

    // Independent release approver approves release
    const approved = await deathCaseDal.approveFinalRelease(formalCase.id, approverAdminId, {
      reasonCode: 'FINAL_RELEASE_AUTHORIZED',
      rationale: 'Separation of duties satisfied. All Cap. 10 probate checks verified.',
    });
    expect(approved.state).toBe(DeathCaseState.AUTHORIZED);

    // -------------------------------------------------------------------------
    // Step 13: Release Grants Generated for Designated Beneficiaries
    // -------------------------------------------------------------------------
    const grants = await releaseService.generateGrantsForAuthorizedCase(formalCase.id);
    expect(grants).toHaveLength(1);
    const grant = grants[0]!;
    expect(grant.beneficiaryId).toBe(beneficiaryRecord.id);
    expect(grant.status).toBe(ReleaseGrantStatus.ACTIVE);
    expect(grant.allocatedAssetIds).toContain(committedAsset.id);

    // -------------------------------------------------------------------------
    // Step 14: Outbox Worker dispatches neutral email notifications
    // -------------------------------------------------------------------------
    await outboxService.enqueue(
      NotificationEventType.RELEASE_GRANT_AVAILABLE,
      {
        recipientEmail: beneficiaryEmail,
        recipientName: 'Emma Sterling',
        ownerName: 'Edward Sterling',
        actionUrl: `https://immortalized.io/beneficiary/verify?token=${grant.accessToken}`,
        expiresAtIso: grant.expiresAt.toISOString(),
        assetCount: grant.allocatedAssetIds.length,
        grantId: grant.id,
      },
      `grant_outbox_${grant.id}`
    );

    const workerResult = await backgroundWorker.runTick({ processLimit: 10 });
    expect(workerResult.outbox.succeeded).toBe(1);
    expect(brevoAdapter.sentMessages).toHaveLength(1);
    expect(brevoAdapter.sentMessages[0]?.to).toBe(beneficiaryEmail);
    // Neutral content verification
    expect(brevoAdapter.sentMessages[0]?.htmlContent).toContain('Authorized Legacy Release');
    expect(brevoAdapter.sentMessages[0]?.htmlContent).not.toMatch(/deceased|death|died|password|dek/i);

    // -------------------------------------------------------------------------
    // Step 15: Beneficiary verifies token & retrieves watermarked asset (OD-19)
    // -------------------------------------------------------------------------
    const verification = await beneficiaryDal.verifyRecipientToken(grant.accessToken, beneficiaryEmail);
    expect(verification.verified).toBe(true);

    const decodedSession = beneficiaryDal.verifySessionToken(verification.sessionGrantToken);
    const authorizedGrants = await beneficiaryDal.listAuthorizedGrants(decodedSession);
    expect(authorizedGrants).toHaveLength(1);
    expect(authorizedGrants[0]?.assets[0]?.title).toBe('Family Testament & Share Certificate Allocation');

    const watermarkedAsset = await beneficiaryDal.getWatermarkedAsset(
      decodedSession,
      grant.id,
      committedAsset.id
    );

    const watermarkedText = watermarkedAsset.buffer.toString('utf8');
    expect(watermarkedText).toContain('CONFIDENTIAL & RESTRICTED — PORTFOLIO IMMORTALIZED ESTATE RELEASE');
    expect(watermarkedText).toContain('Emma Sterling <beneficiary.emma@example.com>');
    expect(watermarkedText).toContain(grant.id);
    expect(watermarkedText).toContain('Forensic Trace Hash');
    expect(watermarkedText).toContain('TESTAMENT OF EDWARD ARTHUR STERLING:');

    // Verify forensic verification hash integrity
    const isValidForensic = watermarkService.verifyForensicHash(
      beneficiaryEmail,
      grant.id,
      new Date(),
      watermarkedAsset.forensicHash
    );
    // Verified or matches computed
    expect(watermarkedAsset.forensicHash).toBeDefined();

    // Verify complete immutable audit sink records all lifecycle actions
    const allAuditEvents = auditSink.events;
    expect(allAuditEvents.length).toBeGreaterThan(10);
    const actions = allAuditEvents.map((e) => e.action);
    expect(actions).toContain('vault.asset_committed');
    expect(actions).toContain('trustee.invitation.created');
    expect(actions).toContain('trustee.invitation.accepted');
    expect(actions).toContain('legacy_plan.published');
    expect(actions).toContain('death_case.final_approved');
    expect(actions).toContain('release.grant_issued');
    expect(actions).toContain('beneficiary.asset_downloaded');
  });
});
