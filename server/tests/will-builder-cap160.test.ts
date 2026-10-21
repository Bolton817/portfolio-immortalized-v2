import { describe, it, expect, beforeEach } from 'vitest';
import {
  WillStatus,
  PhysicalCustodyRecord,
} from '@portfolio-immortalized/domain';
import { Cap160WillValidator } from '../src/will/cap160-validator.js';
import { StatutoryWillBuilder } from '../src/will/builder.js';
import { WillDal } from '../src/dal/will-dal.js';
import { IdentityVerificationService } from '../src/services/identity-verification.js';
import { MetricsExporter } from '../src/observability/metrics-exporter.js';
import { AuditService } from '../src/audit/logger.js';

describe('Interactive Statutory Will Builder (Cap. 160) & Identity Verification (Stage 11)', () => {
  let auditService: AuditService;
  let willDal: WillDal;
  let idVerification: IdentityVerificationService;

  beforeEach(() => {
    auditService = new AuditService();
    willDal = new WillDal(auditService);
    idVerification = new IdentityVerificationService({ auditService });
  });

  const validDraftInput = {
    testatorFullName: 'Jared Mwangi Kariuki',
    testatorNationalId: '12345678',
    testatorDomicile: 'Nairobi, Kenya',
    maritalStatus: 'MARRIED',
    revocationOfPriorWills: true,
    executors: [
      {
        fullName: 'Grace Wanjiku Kariuki',
        nationalIdNumber: '23456789',
        relationship: 'Spouse',
        address: 'P.O. Box 40000, Nairobi',
        isAlternate: false,
      },
      {
        fullName: 'David Omondi',
        nationalIdNumber: '34567890',
        relationship: 'Brother-in-law',
        address: 'P.O. Box 1000, Kisumu',
        isAlternate: true,
      },
    ],
    guardians: [
      {
        fullName: 'Mary Njeri Kariuki',
        nationalIdNumber: '45678901',
        relationship: 'Sister',
        minorChildrenNames: ['Brian Kariuki', 'Faith Kariuki'],
      },
    ],
    specificBequests: [
      {
        assetDescription: 'Residential property at LR No. 209/1458, Karen, Nairobi',
        identifierOrTitleNumber: 'LR 209/1458',
        beneficiaryName: 'Grace Wanjiku Kariuki',
        beneficiaryNationalId: '23456789',
        relationship: 'Spouse',
        category: 'REAL_ESTATE',
      },
    ],
    residuaryShares: [
      {
        beneficiaryName: 'Grace Wanjiku Kariuki',
        beneficiaryNationalId: '23456789',
        relationship: 'Spouse',
        sharePercentage: 60,
      },
      {
        beneficiaryName: 'Faith Kariuki',
        relationship: 'Daughter',
        sharePercentage: 40,
      },
    ],
    digitalVaultInstructions: 'All cryptographic asset seeds in PI Vault to be released to primary executor.',
    witnesses: [
      {
        fullName: 'Dr. Peter Kamau Mutua',
        nationalIdNumber: '56789012',
        address: 'Nairobi Hospital Doctors Plaza',
        occupation: 'Medical Doctor',
      },
      {
        fullName: 'Advocate Linda Achieng',
        nationalIdNumber: '67890123',
        address: 'Kimathi Street, Nairobi',
        occupation: 'Advocate of the High Court of Kenya',
      },
    ],
  };

  describe('Cap160WillValidator (Statutory Compliance Engine)', () => {
    it('validates a legally compliant will under Cap. 160', () => {
      const res = Cap160WillValidator.validate(validDraftInput);

      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.statutoryChecklist.section11WitnessQuorumMet).toBe(true);
      expect(res.statutoryChecklist.section13NoBeneficiaryWitnessConflict).toBe(true);
      expect(res.statutoryChecklist.section21ExecutorsNominated).toBe(true);
      expect(res.statutoryChecklist.residuaryEstate100Percent).toBe(true);
    });

    it('rejects will draft lacking a primary executor per Section 21', () => {
      const draft = {
        ...validDraftInput,
        executors: [
          {
            fullName: 'David Omondi',
            nationalIdNumber: '34567890',
            relationship: 'Brother-in-law',
            address: 'P.O. Box 1000, Kisumu',
            isAlternate: true, // Only alternate, no primary
          },
        ],
      };

      const res = Cap160WillValidator.validate(draft);
      expect(res.isValid).toBe(false);
      expect(res.statutoryChecklist.section21ExecutorsNominated).toBe(false);
      expect(res.errors.some((e) => e.includes('Section 21 Cap. 160'))).toBe(true);
    });

    it('rejects will draft where residuary estate does not equal 100%', () => {
      const draft = {
        ...validDraftInput,
        residuaryShares: [
          {
            beneficiaryName: 'Grace Wanjiku Kariuki',
            relationship: 'Spouse',
            sharePercentage: 50,
          },
          {
            beneficiaryName: 'Faith Kariuki',
            relationship: 'Daughter',
            sharePercentage: 40, // 50 + 40 = 90%
          },
        ],
      };

      const res = Cap160WillValidator.validate(draft);
      expect(res.isValid).toBe(false);
      expect(res.statutoryChecklist.residuaryEstate100Percent).toBe(false);
      expect(res.errors.some((e) => e.includes('must total exactly 100%'))).toBe(true);
    });

    it('flags Section 11 witness quorum deficit when fewer than 2 witnesses are provided', () => {
      const draft = {
        ...validDraftInput,
        witnesses: [
          {
            fullName: 'Advocate Linda Achieng',
            nationalIdNumber: '67890123',
            address: 'Kimathi Street, Nairobi',
            occupation: 'Advocate',
          },
        ],
      };

      const res = Cap160WillValidator.validate(draft);
      expect(res.isValid).toBe(false);
      expect(res.statutoryChecklist.section11WitnessQuorumMet).toBe(false);
      expect(res.errors.some((e) => e.includes('Section 11 Cap. 160'))).toBe(true);
    });

    it('warns when draft currently has zero designated witnesses', () => {
      const draft = {
        ...validDraftInput,
        witnesses: [],
      };

      const res = Cap160WillValidator.validate(draft);
      expect(res.isValid).toBe(true); // Draft stage is valid, but has warnings
      expect(res.warnings).toHaveLength(1);
      expect(res.warnings[0]).toContain('Draft currently has zero designated witnesses');
    });

    it('enforces Cap. 160 Section 13 Witness Forfeiture conflict check', () => {
      // Invariant: Witness cannot be a beneficiary under the Will
      const conflictingDraft = {
        ...validDraftInput,
        witnesses: [
          {
            fullName: 'Grace Wanjiku Kariuki', // SAME AS BENEFICIARY!
            nationalIdNumber: '23456789',
            address: 'P.O. Box 40000, Nairobi',
            occupation: 'Businesswoman',
          },
          {
            fullName: 'Dr. Peter Kamau Mutua',
            nationalIdNumber: '56789012',
            address: 'Nairobi',
            occupation: 'Doctor',
          },
        ],
      };

      const res = Cap160WillValidator.validate(conflictingDraft);
      expect(res.isValid).toBe(false);
      expect(res.statutoryChecklist.section13NoBeneficiaryWitnessConflict).toBe(false);
      expect(res.errors.some((e) => e.includes('Section 13 Cap. 160 Statutory Conflict'))).toBe(true);
    });
  });

  describe('StatutoryWillBuilder & Legal Text Compilation', () => {
    it('generates statutory attestation clause citing Section 11 and Section 13 of Cap. 160', () => {
      const clause = StatutoryWillBuilder.generateAttestationClause('Jared Mwangi Kariuki');

      expect(clause.jurisdiction).toBe('Republic of Kenya');
      expect(clause.statutoryReference).toContain('Section 11, Kenya Law of Succession Act (Cap. 160)');
      expect(clause.testatorSignatureBlock).toContain('JARED MWANGI KARIUKI');
      expect(clause.statutoryDisqualificationsNotice).toContain('Section 13 of the Law of Succession Act');
    });

    it('compiles full printable legal will document with all required sections', () => {
      const willDoc = {
        ...validDraftInput,
        id: 'will_test_123',
        userId: 'usr_test_owner',
        version: 1,
        status: WillStatus.READY_FOR_EXECUTION,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const legalText = StatutoryWillBuilder.compileLegalText(willDoc);

      expect(legalText).toContain('LAST WILL AND TESTAMENT OF');
      expect(legalText).toContain('JARED MWANGI KARIUKI');
      expect(legalText).toContain('1. DECLARATION OF TESTATOR & REVOCATION OF PRIOR WILLS');
      expect(legalText).toContain('2. APPOINTMENT OF EXECUTORS & TRUSTEES');
      expect(legalText).toContain('3. GUARDIANSHIP OF MINOR CHILDREN');
      expect(legalText).toContain('4. SPECIFIC BEQUESTS & LEGACIES');
      expect(legalText).toContain('LR No. 209/1458, Karen, Nairobi');
      expect(legalText).toContain('5. DIGITAL LEGACY & PORTFOLIO IMMORTALIZED VAULT ASSETS');
      expect(legalText).toContain('6. RESIDUARY ESTATE ALLOCATION');
      expect(legalText).toContain('7. ATTESTATION & EXECUTION (SECTION 11, CAP. 160)');
      expect(legalText).toContain('WITNESS 1:');
      expect(legalText).toContain('WITNESS 2:');
    });
  });

  describe('WillDal Storage & Physical Custody Lifecycle', () => {
    const session = { userId: 'usr_will_owner_01' };

    it('creates draft, computes validation, and increments version upon update', async () => {
      const res1 = await willDal.createOrUpdateDraft(session, validDraftInput);

      expect(res1.will.version).toBe(1);
      expect(res1.will.status).toBe(WillStatus.READY_FOR_EXECUTION);
      expect(res1.validation.isValid).toBe(true);

      // Fetch saved will
      const fetched = await willDal.getWill(session, session.userId);
      expect(fetched?.testatorFullName).toBe('Jared Mwangi Kariuki');

      // Update draft
      const res2 = await willDal.createOrUpdateDraft(session, {
        ...validDraftInput,
        testatorDomicile: 'Mombasa, Kenya',
      });

      expect(res2.will.version).toBe(2);
      expect(res2.will.testatorDomicile).toBe('Mombasa, Kenya');
    });

    it('records physical custody deposit and transitions status to EXECUTED_DEPOSITED', async () => {
      await willDal.createOrUpdateDraft(session, validDraftInput);

      const custodyRecord: PhysicalCustodyRecord = {
        custodyType: 'BANK_SAFE_DEPOSIT',
        institutionName: 'KCB Bank Kenya Limited - Kipande House Branch',
        depositBoxNumber: 'SDB-9042',
        advocateFirmName: 'Hamilton Harrison & Mathews Advocates',
        advocateContactPhone: '+254202720000',
        custodyNotes: 'Original signed will placed in sealed tamper-evident envelope with bank seal.',
        depositedAt: new Date(),
      };

      const updatedWill = await willDal.recordPhysicalCustody(session, custodyRecord);

      expect(updatedWill.status).toBe(WillStatus.EXECUTED_DEPOSITED);
      expect(updatedWill.physicalCustody?.institutionName).toContain('KCB Bank');
      expect(updatedWill.physicalCustody?.depositBoxNumber).toBe('SDB-9042');
    });

    it('compiles and serves printable legal text via getLegalText', async () => {
      await willDal.createOrUpdateDraft(session, validDraftInput);
      const text = await willDal.getLegalText(session, session.userId);

      expect(text).toContain('JARED MWANGI KARIUKI');
      expect(text).toContain('REPUBLIC OF KENYA');
    });
  });

  describe('IdentityVerificationService (Biometric Liveness & ID Forensic Attestation)', () => {
    it('verifies valid Kenyan National ID and binds forensic attestation hash', async () => {
      const result = await idVerification.verifyBeneficiaryLiveness({
        beneficiaryId: 'ben_faith_kariuki',
        claimedFullName: 'Faith Kariuki',
        nationalIdNumber: '34567890',
        videoSelfieBytes: 'data:video/mp4;base64,AAAA...',
      });

      expect(result.verified).toBe(true);
      expect(result.livenessConfidenceScore).toBeGreaterThanOrEqual(0.95);
      expect(result.matchScore).toBeGreaterThanOrEqual(0.95);
      expect(result.forensicAttestationHash).toHaveLength(64); // SHA-256 hex string
      expect(result.verificationMethod).toBe('GOVERNMENT_ID_AND_LIVENESS_SELFIE');
    });

    it('rejects invalid Kenyan National ID format', async () => {
      const result = await idVerification.verifyBeneficiaryLiveness({
        beneficiaryId: 'ben_invalid_id',
        claimedFullName: 'Faith Kariuki',
        nationalIdNumber: '123', // Too short for Kenyan ID
      });

      expect(result.verified).toBe(false);
      expect(result.rejectionReason).toContain('Invalid National ID format');
      expect(result.forensicAttestationHash).toBe('');
    });

    it('rejects identity claim when legal name is missing or too short', async () => {
      const result = await idVerification.verifyBeneficiaryLiveness({
        beneficiaryId: 'ben_short_name',
        claimedFullName: 'A',
        nationalIdNumber: '34567890',
      });

      expect(result.verified).toBe(false);
      expect(result.rejectionReason).toContain('Claimed legal name is missing or too short');
    });
  });

  describe('MetricsExporter & Cross-Region Health Telemetry (OPS-006)', () => {
    it('exports Prometheus standard text telemetry with correct metrics', () => {
      MetricsExporter.incrementMetric('portfolio_http_requests_total', 5);
      const promText = MetricsExporter.exportPrometheusText();

      expect(promText).toContain('# HELP portfolio_http_requests_total');
      expect(promText).toContain('portfolio_http_requests_total');
      expect(promText).toContain('portfolio_kms_encryption_latency_seconds');
      expect(promText).toContain('portfolio_mpesa_transactions_total');
    });

    it('provides multi-subsystem status summary for /api/v1/status', () => {
      const summary = MetricsExporter.getSystemStatusSummary();

      expect(summary.status).toBe('OPERATIONAL');
      expect(summary.subsystems.apiGateway.status).toBe('OPERATIONAL');
      expect(summary.subsystems.databasePrimary.region).toBe('af-south-1');
      expect(summary.subsystems.databaseReplica.region).toBe('eu-central-1');
      expect(summary.subsystems.kmsEnvelope.provider).toContain('Cloud KMS');
      expect(summary.subsystems.billingMpesa.gateway).toContain('Safaricom Daraja 2.0');
    });
  });
});
