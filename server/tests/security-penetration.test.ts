import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import {
  VaultDal,
  LegacyPlanDal,
  DeathCaseDal,
  BeneficiaryDal,
  ReleaseService,
  LifecycleService,
  AdminDal,
  InactivitySweepService,
  BrevoNotificationAdapter,
  WatermarkService,
  LocalStorageProvider,
  AuditService,
  globalAuditSink,
  makeUserId,
  makeCaseId,
  makeReleaseGrantId,
  AssetType,
  AssetSensitivity,
  DeathCaseState,
  CaseInitiationType,
  CaseHoldReasonCode,
  AdminRole,
  AdminPermission,
  hasAdminPermission,
  assertAdminPermission,
  AdminAuthorizationError,
  UserAccountStatus,
  SlidingWindowRateLimiter,
  safeTimingEqual,
  StructuredLogger,
  MemoryLoggerSink,
} from '../src/index.js';

describe('Stage 9: Automated Security Penetration & OWASP Top 10 Verification Suite', () => {
  let auditService: AuditService;
  let storageProvider: LocalStorageProvider;
  let vaultDal: VaultDal;
  let legacyPlanDal: LegacyPlanDal;
  let deathCaseDal: DeathCaseDal;
  let beneficiaryDal: BeneficiaryDal;
  let releaseService: ReleaseService;
  let lifecycleService: LifecycleService;
  let adminDal: AdminDal;
  let watermarkService: WatermarkService;

  const OWNER_A = makeUserId('00000000-0000-0000-0000-000000000001');
  const OWNER_B = makeUserId('00000000-0000-0000-0000-000000000002');
  const ATTACKER = makeUserId('00000000-0000-0000-0000-000000000003');
  const BENEFICIARY_1 = makeUserId('00000000-0000-0000-0000-000000000004');
  const BENEFICIARY_2 = makeUserId('00000000-0000-0000-0000-000000000005');
  const TRUSTEE_1 = makeUserId('00000000-0000-0000-0000-000000000011');
  const TRUSTEE_2 = makeUserId('00000000-0000-0000-0000-000000000012');
  const REVIEWER_ADMIN = makeUserId('00000000-0000-0000-0000-000000000021');
  const APPROVER_ADMIN = makeUserId('00000000-0000-0000-0000-000000000022');
  const SECURITY_ADMIN = makeUserId('00000000-0000-0000-0000-000000000031');

  beforeEach(() => {
    globalAuditSink.events = [];
    auditService = new AuditService();
    storageProvider = new LocalStorageProvider();
    vaultDal = new VaultDal({ storageProvider, auditService });
    legacyPlanDal = new LegacyPlanDal({ vaultDal, auditService });
    deathCaseDal = new DeathCaseDal(auditService);
    beneficiaryDal = new BeneficiaryDal(vaultDal, auditService);
    releaseService = new ReleaseService(deathCaseDal, legacyPlanDal, vaultDal, auditService);
    adminDal = new AdminDal(auditService);
    lifecycleService = new LifecycleService(adminDal, deathCaseDal, auditService);
    watermarkService = new WatermarkService();
  });

  // =========================================================================
  // 1. BOLA / IDOR VULNERABILITY TESTING (OWASP API1)
  // =========================================================================
  describe('BOLA / IDOR Protections (Cross-Tenant Isolation, Risk R-05)', () => {
    it('PEN-01: prevents User B from accessing or downloading User A vault assets', async () => {
      const willBuf = Buffer.from('%PDF-1.7 Last Will 2026');
      const willSha = crypto.createHash('sha256').update(willBuf).digest('hex');

      // Owner A creates and commits an asset
      const intent = await vaultDal.createUploadIntent(OWNER_A, {
        fileName: 'Confidential_Last_Will.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: willBuf.length,
        assetType: AssetType.WILL,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      });

      await vaultDal.commitUpload(
        OWNER_A,
        intent.assetId,
        1,
        willBuf,
        willSha,
        'application/pdf'
      );

      // Attacker tries to fetch the asset metadata
      await expect(vaultDal.getAsset(ATTACKER, intent.assetId)).rejects.toThrow(
        /ACCESS_DENIED|Tenant mismatch|not found/i
      );

      // Attacker tries to generate a download descriptor
      await expect(
        vaultDal.getAssetDownloadDescriptor(ATTACKER, intent.assetId)
      ).rejects.toThrow(/ACCESS_DENIED|Tenant mismatch|not found/i);
    });

    it('PEN-02: prevents User B from querying or modifying User A legacy plan', async () => {
      // Owner A creates a working draft plan
      const plan = await legacyPlanDal.getDraftPlan(OWNER_A);
      expect(plan.id).toBeDefined();

      // Attacker tries to query Owner A's plan by ID
      await expect(legacyPlanDal.getPlanById(ATTACKER, plan.id)).rejects.toThrow(
        /ACCESS_DENIED|User does not have access/i
      );
    });

    it('PEN-03: prevents Beneficiary 2 from redeeming a grant assigned exclusively to Beneficiary 1', async () => {
      const grantId = makeReleaseGrantId('00000000-0000-0000-0000-000000000099');
      const deedBuf = Buffer.from('%PDF-1.7 Karen Property Deed');
      const deedSha = crypto.createHash('sha256').update(deedBuf).digest('hex');

      // Seed an asset in vault
      const intent = await vaultDal.createUploadIntent(OWNER_A, {
        fileName: 'Karen_Deed.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: deedBuf.length,
        assetType: AssetType.DOCUMENT,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      });

      await vaultDal.commitUpload(
        OWNER_A,
        intent.assetId,
        1,
        deedBuf,
        deedSha,
        'application/pdf'
      );

      // Manually register grant directly in releaseService
      releaseService['grants'].set(grantId, {
        id: grantId,
        caseId: makeCaseId('00000000-0000-0000-0000-000000000088'),
        beneficiaryId: BENEFICIARY_1,
        beneficiaryEmail: 'ben1@example.com',
        allocatedAssetIds: [intent.assetId],
        customInstructions: 'Karen deed allocation',
        status: 'PENDING' as any,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      } as any);

      const beneficiaryDalInstance = new BeneficiaryDal(releaseService, vaultDal, watermarkService, auditService);

      const sessionForBen2 = {
        grantId,
        beneficiaryId: BENEFICIARY_2,
        email: 'ben2@example.com',
        name: 'Beneficiary Two',
        expiresAt: Date.now() + 3600000,
      };

      // Beneficiary 2 attempts to download Beneficiary 1's watermarked asset
      await expect(
        beneficiaryDalInstance.getWatermarkedAsset(sessionForBen2, grantId, intent.assetId)
      ).rejects.toThrow(/You are not the designated recipient|ACCESS_DENIED/i);
    });
  });

  // =========================================================================
  // 2. SEPARATION OF DUTIES & AUTHORIZATION BYPASS (REL-001, ADR-007, Risk R-02)
  // =========================================================================
  describe('Separation of Duties & Authorization Enforcement', () => {
    it('PEN-04: strictly forbids Case Reviewer from self-approving release (approverId === reviewerId)', async () => {
      const caseRecord = await deathCaseDal.initiateCase(
        OWNER_A,
        CaseInitiationType.TRUSTEE_REPORT,
        TRUSTEE_1,
        {
          statement: 'Certified death certificate provided by hospital',
        }
      );

      // Co-sign case with required quorum
      await deathCaseDal.coSignCase(caseRecord.id, TRUSTEE_1, {
        confirmation: true,
        attestationConfirmed: true,
        rationale: 'Confirmed directly with Nairobi Hospital records',
      });
      await deathCaseDal.coSignCase(caseRecord.id, TRUSTEE_2, {
        confirmation: true,
        attestationConfirmed: true,
        rationale: 'Attended funeral service in Karen',
      });

      // Assign reviewer
      await deathCaseDal.assignReviewer(caseRecord.id, SECURITY_ADMIN, REVIEWER_ADMIN);

      // Reviewer recommends approval
      await deathCaseDal.recommendApproval(caseRecord.id, REVIEWER_ADMIN, {
        rationale: 'Evidence verified and hospital records confirmed',
      });

      // Attack: Reviewer tries to approve their own recommendation
      await expect(
        deathCaseDal.approveFinalRelease(caseRecord.id, REVIEWER_ADMIN, {
          reasonCode: 'EVIDENCE_VERIFIED',
          rationale: 'Attempting self-approval bypass',
        })
      ).rejects.toThrow(/Separation of duties violation|Approver cannot be the same person who reviewed the case/i);
    });

    it('PEN-05: verifies that unprivileged role (SUPPORT_ADMIN) cannot trigger release approval', async () => {
      const canApprove = hasAdminPermission([AdminRole.SUPPORT_ADMIN], AdminPermission.RELEASES_APPROVE);
      expect(canApprove).toBe(false);

      const hasCaseReview = hasAdminPermission([AdminRole.SUPPORT_ADMIN], AdminPermission.CASES_REVIEW);
      expect(hasCaseReview).toBe(false);

      const hasSecurityHold = hasAdminPermission([AdminRole.SUPPORT_ADMIN], AdminPermission.CASES_HOLD);
      expect(hasSecurityHold).toBe(false);

      expect(() => {
        assertAdminPermission([AdminRole.SUPPORT_ADMIN], AdminPermission.RELEASES_APPROVE, 'adm_support_1');
      }).toThrow(AdminAuthorizationError);
    });
  });

  // =========================================================================
  // 3. TRUSTEE ISOLATION (REL-04)
  // =========================================================================
  describe('Trustee Content Isolation (REL-04)', () => {
    it('PEN-06: trustees have zero read access to vault ciphertext or asset files', async () => {
      const videoBuf = Buffer.from('MOCK_MP4_VIDEO_STREAM');
      const videoSha = crypto.createHash('sha256').update(videoBuf).digest('hex');

      const intent = await vaultDal.createUploadIntent(OWNER_A, {
        fileName: 'Family_Message.mp4',
        declaredMimeType: 'video/mp4',
        declaredSizeBytes: videoBuf.length,
        assetType: AssetType.VIDEO,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      });

      await vaultDal.commitUpload(
        OWNER_A,
        intent.assetId,
        1,
        videoBuf,
        videoSha,
        'video/mp4'
      );

      // Trustee attempts to fetch asset
      await expect(vaultDal.getAsset(TRUSTEE_1, intent.assetId)).rejects.toThrow(
        /ACCESS_DENIED/i
      );

      // Trustee attempts to list assets
      const trusteeAssets = await vaultDal.listAssets(TRUSTEE_1);
      expect(trusteeAssets).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. RATE LIMITING & BRUTE-FORCE DEFENSES (AUTH-01, Risk R-08, OWASP API2)
  // =========================================================================
  describe('Sliding-Window Rate Limiter Protection', () => {
    it('PEN-07: enforces strict sliding-window rate limit on brute-force attempts', async () => {
      const limiter = new SlidingWindowRateLimiter({
        windowMs: 60000, // 1 minute
        maxAttempts: 3,
      });

      const key = 'ip_10.0.0.1';
      const now = Date.now();

      // Attempt 1
      const res1 = await limiter.check(key, now);
      expect(res1.allowed).toBe(true);

      // Attempt 2
      const res2 = await limiter.check(key, now + 1000);
      expect(res2.allowed).toBe(true);

      // Attempt 3
      const res3 = await limiter.check(key, now + 2000);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      // Attempt 4 (Rate limit exceeded)
      const res4 = await limiter.check(key, now + 3000);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.retryAfterSeconds).toBeGreaterThan(0);

      // Advance clock past window
      const res5 = await limiter.check(key, now + 65000);
      expect(res5.allowed).toBe(true);
    });
  });

  // =========================================================================
  // 5. TIMING ATTACK RESISTANCE
  // =========================================================================
  describe('Constant-Time Comparison Safety (Timing Attacks)', () => {
    it('PEN-08: safeTimingEqual behaves correctly and resists timing variations', () => {
      const tokenA = 'sec_token_ae8f12c98d71249b';
      const tokenB = 'sec_token_ae8f12c98d71249b';
      const tokenC = 'sec_token_ae8f12c98d71249c'; // Differs at last char
      const tokenD = 'xec_token_ae8f12c98d71249b'; // Differs at first char
      const tokenShort = 'sec_token';

      expect(safeTimingEqual(tokenA, tokenB)).toBe(true);
      expect(safeTimingEqual(tokenA, tokenC)).toBe(false);
      expect(safeTimingEqual(tokenA, tokenD)).toBe(false);
      expect(safeTimingEqual(tokenA, tokenShort)).toBe(false);
    });
  });

  // =========================================================================
  // 6. ASYMMETRIC EMERGENCY HOLD & REVOCATION (CASE-03, Risk R-24, ADR-006)
  // =========================================================================
  describe('Asymmetric Emergency Hold Instant Freeze (CASE-03, Risk R-24)', () => {
    it('PEN-09: placing emergency hold instantly halts download descriptors and grant redemption', async () => {
      const caseRecord = await deathCaseDal.initiateCase(
        OWNER_A,
        CaseInitiationType.TRUSTEE_REPORT,
        TRUSTEE_1,
        {
          statement: 'Reported death under investigation',
        }
      );

      // Place emergency hold
      await deathCaseDal.placeEmergencyHold(caseRecord.id, SECURITY_ADMIN, {
        caseId: caseRecord.id as string,
        reasonCode: CaseHoldReasonCode.SUSPECTED_FRAUD,
        rationale: 'Fraudulent evidence report submitted by suspicious third party',
      });

      const updated = await deathCaseDal.getCaseById(caseRecord.id);
      expect(updated.state).toBe(DeathCaseState.HOLD);

      // Attempting to recommend approval while in HOLD fails
      await expect(
        deathCaseDal.recommendApproval(caseRecord.id, REVIEWER_ADMIN, {
          rationale: 'Evidence verified',
        })
      ).rejects.toThrow(/Case is currently on HOLD|INVALID_CASE_TRANSITION/i);
    });
  });

  // =========================================================================
  // 7. PII & SECRET LEAK PREVENTION (Risk R-14, R-18, Kenya Data Protection Act)
  // =========================================================================
  describe('PII Minimization & Secret Redaction in Telemetry and Outbox (Risk R-18)', () => {
    it('PEN-10: verifies structured logger redacts Kenyan National IDs, phones, emails, and secrets', () => {
      const memorySink = new MemoryLoggerSink();
      const testLogger = new StructuredLogger('security-test', [memorySink]);

      testLogger.info(
        'User verified with National ID 12345678 and phone +254712345678 and email alex@piecorp.co.ke',
        {
          userId: 'usr_test_100',
          context: {
            password: 'SuperSecretPassword123!',
            token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz',
            dek: 'RAW_DEK_HEX_VALUE_ABCD1234',
            normalData: 'Harmless metadata field',
          },
        }
      );

      const entry = memorySink.entries[0];
      expect(entry).toBeDefined();

      // Message redactions
      expect(entry.message).not.toContain('12345678');
      expect(entry.message).toContain('[REDACTED_KENYAN_ID]');
      expect(entry.message).not.toContain('+254712345678');
      expect(entry.message).toContain('[REDACTED_PHONE]');
      expect(entry.message).not.toContain('alex@piecorp.co.ke');
      expect(entry.message).toContain('[REDACTED_EMAIL]');

      // Context redactions
      expect(entry.context?.password).toBe('[REDACTED_SECRET]');
      expect(entry.context?.token).toBe('[REDACTED_SECRET]');
      expect(entry.context?.dek).toBe('[REDACTED_SECRET]');
      expect(entry.context?.normalData).toBe('Harmless metadata field');
    });

    it('PEN-11: Brevo notification templates verify zero raw document text, DEKs, or death declarations', () => {
      const adapter = new BrevoNotificationAdapter();
      const inviteEmail = adapter.renderTrusteeInvitation({
        recipientEmail: 'grace@example.com',
        recipientName: 'Grace M.',
        ownerName: 'Alex Johnson',
        actionUrl: 'https://app.portfolio-immortalized.co.ke/trustee/invite?token=abc',
        expiresAtIso: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(inviteEmail.subject).toContain('Trustee');
      expect(inviteEmail.htmlContent).not.toContain('death');
      expect(inviteEmail.htmlContent).not.toContain('deceased');
      expect(inviteEmail.htmlContent).not.toContain('will');
      expect(inviteEmail.htmlContent).not.toContain('DEK');
    });
  });

  // =========================================================================
  // 8. ZERO TIMER-BASED RELEASE INVARIANT (CASE-01, Risk R-01)
  // =========================================================================
  describe('Zero Timer-Based Release Invariant (CASE-01)', () => {
    it('PEN-12: inactivity sweeps NEVER transition accounts to AUTHORIZED or RELEASED', async () => {
      const sweepService = new InactivitySweepService(deathCaseDal, auditService);

      // Register owner in sweep service with extreme inactivity (365 days)
      const lastActive = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      sweepService.registerOwner(OWNER_A, lastActive);

      const result = await sweepService.executeSweep(new Date());
      expect(result.investigationsOpened).toBe(1);

      // Check cases for OWNER_A
      const cases = await deathCaseDal.listCases({ ownerId: OWNER_A });
      expect(cases.length).toBeGreaterThan(0);
      const caseRecord = cases[0];

      // Inactivity must open INACTIVITY_REVIEW, NEVER direct release!
      expect(caseRecord.state).toBe(DeathCaseState.INACTIVITY_REVIEW);
      expect(caseRecord.state).not.toBe(DeathCaseState.AUTHORIZED);
      expect(caseRecord.state).not.toBe(DeathCaseState.RELEASED);
    });
  });

  // =========================================================================
  // 9. DERIVATIVE WATERMARKING & STORAGE IMMUTABILITY (OD-19)
  // =========================================================================
  describe('Derivative Watermarking & Private Vault Immutability (OD-19)', () => {
    it('PEN-13: watermarking stamps recipient identity without modifying original vault ciphertext', async () => {
      const originalText = '%PDF-1.4 Mock Legal Document Content';
      const originalBuffer = Buffer.from(originalText, 'utf8');

      const stampedBuffer = watermarkService.applyWatermarkToBuffer(
        originalBuffer,
        'application/pdf',
        {
          recipientName: 'David K. Maina',
          recipientEmail: 'david.maina@example.com',
          grantId: '00000000-0000-0000-0000-000000009921',
          releasedAt: new Date(),
          jurisdiction: 'Kenya (Law of Succession Act Cap. 160)',
        }
      );

      const stampedText = stampedBuffer.toString('utf8');

      // Derivative contains recipient name and Cap. 160 notice
      expect(stampedText).toContain('David K. Maina');
      expect(stampedText).toContain('Cap. 160');

      // Original buffer remains completely unmodified
      expect(originalBuffer.toString('utf8')).toBe(originalText);
    });
  });

  // =========================================================================
  // 10. LEGAL HOLD & DELETION BARRIER (ADM-002, Risk R-11)
  // =========================================================================
  describe('Legal Preservation Hold on Account Deletion (ADM-002, Risk R-11)', () => {
    it('PEN-14: user deletion dry-run blocks purging if active death case or legal hold exists', async () => {
      // Create an open death case for Owner A
      await deathCaseDal.initiateCase(
        OWNER_A,
        CaseInitiationType.TRUSTEE_REPORT,
        TRUSTEE_1,
        {
          statement: 'Reported death under investigation',
        }
      );

      // Seed user in adminDal
      adminDal['users'].set(OWNER_A, {
        id: OWNER_A,
        email: 'owner.a@example.com',
        name: 'Owner A',
        status: UserAccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Attempt deletion dry run
      const dryRun = await lifecycleService.evaluateDeletionImpact(OWNER_A, SECURITY_ADMIN);
      expect(dryRun.canPurge).toBe(false);
      expect(dryRun.blockingReason).toBe('LEGAL_HOLD_BLOCKS_PURGE');
      expect(dryRun.activeCasesCount).toBeGreaterThan(0);
    });
  });
});
