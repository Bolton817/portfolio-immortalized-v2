import { describe, it, expect } from 'vitest';
import {
  RegisterUserSchema,
  CreateUploadIntentSchema,
  InviteTrusteeSchema,
  SubmitCaseEvidenceSchema,
  IndependentFinalApprovalSchema,
} from '../src/index.js';
import { AssetType, AssetSensitivity } from '@portfolio-immortalized/domain';

describe('Validation Schemas (TDD Chapter 4 & 18)', () => {
  describe('RegisterUserSchema (AUTH-001)', () => {
    it('accepts valid minimal signup details', () => {
      const valid = {
        email: 'owner@example.com',
        password: 'securePassword123!',
        displayName: 'John Doe',
        termsAccepted: true,
        privacyAccepted: true,
      };
      const result = RegisterUserSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects signup without terms consent', () => {
      const invalid = {
        email: 'owner@example.com',
        password: 'securePassword123!',
        displayName: 'John Doe',
        termsAccepted: false,
        privacyAccepted: true,
      };
      const result = RegisterUserSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects short passwords', () => {
      const invalid = {
        email: 'owner@example.com',
        password: 'short',
        displayName: 'John Doe',
        termsAccepted: true,
        privacyAccepted: true,
      };
      const result = RegisterUserSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateUploadIntentSchema (VAULT-001)', () => {
    it('accepts valid PDF will upload intent', () => {
      const valid = {
        fileName: 'signed-will-2026.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 2840192,
        assetType: AssetType.WILL,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      };
      const result = CreateUploadIntentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects executable or unsupported file types', () => {
      const invalid = {
        fileName: 'malicious.exe',
        declaredMimeType: 'application/x-msdownload',
        declaredSizeBytes: 1024,
        assetType: AssetType.OTHER,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      };
      const result = CreateUploadIntentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('SubmitCaseEvidenceSchema (CASE-002)', () => {
    it('validates genuine evidence with declaration', () => {
      const valid = {
        caseId: '123e4567-e89b-12d3-a456-426614174000',
        uploadId: '123e4567-e89b-12d3-a456-426614174001',
        evidenceType: 'DEATH_CERTIFICATE',
        issuingAuthority: 'Civil Registration Services Nairobi',
        issuingCountry: 'KE',
        issueDate: '2026-10-01',
        submitterDeclarationAccepted: true,
        notes: 'Official certificate issued in Nairobi',
      };
      const result = SubmitCaseEvidenceSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects evidence without submitter declaration of authenticity', () => {
      const invalid = {
        caseId: '123e4567-e89b-12d3-a456-426614174000',
        uploadId: '123e4567-e89b-12d3-a456-426614174001',
        evidenceType: 'DEATH_CERTIFICATE',
        issuingAuthority: 'Civil Registration Services Nairobi',
        issuingCountry: 'KE',
        issueDate: '2026-10-01',
        submitterDeclarationAccepted: false,
      };
      const result = SubmitCaseEvidenceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
