import { z } from 'zod';
import { CaseHoldReasonCode } from '@portfolio-immortalized/domain';

export const SubmitDeathReportSchema = z.object({
  ownerId: z.string().uuid(),
  informantStatement: z.string().trim().min(10).max(2000),
  relationshipType: z.string().trim().min(2).max(100),
});

export type SubmitDeathReportInput = z.infer<typeof SubmitDeathReportSchema>;

export const SubmitCaseEvidenceSchema = z.object({
  caseId: z.string().uuid(),
  uploadId: z.string().uuid(),
  evidenceType: z.enum([
    'DEATH_CERTIFICATE',
    'BURIAL_PERMIT',
    'OBITUARY',
    'COURT_ORDER',
    'MEDICAL_EXAMINER_REPORT',
    'OTHER_OFFICIAL',
  ]),
  issuingAuthority: z.string().trim().min(2).max(200),
  issuingCountry: z.string().length(2, 'Must be ISO-3166-1 alpha-2 code'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  submitterDeclarationAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must certify that this evidence is genuine and unmodified' }),
  }),
  notes: z.string().trim().max(2000).optional(),
});

export type SubmitCaseEvidenceInput = z.infer<typeof SubmitCaseEvidenceSchema>;

export const PlaceEmergencyHoldSchema = z.object({
  reasonCode: z.nativeEnum(CaseHoldReasonCode),
  rationale: z.string().trim().min(5).max(2000),
  scope: z.enum(['ALL_PENDING_RELEASES', 'SPECIFIC_BENEFICIARY', 'SPECIFIC_ASSET']),
});

export type PlaceEmergencyHoldInput = z.infer<typeof PlaceEmergencyHoldSchema>;

export const ResolveEmergencyHoldSchema = z.object({
  holdId: z.string().uuid(),
  rationale: z.string().trim().min(10).max(2000),
});

export type ResolveEmergencyHoldInput = z.infer<typeof ResolveEmergencyHoldSchema>;

export const SubmitReviewRecommendationSchema = z.object({
  expectedStateVersion: z.number().int().nonnegative(),
  decision: z.enum(['RECOMMEND_APPROVAL', 'RECOMMEND_REJECTION']),
  checklistVerified: z.literal(true, {
    errorMap: () => ({ message: 'Case review checklist must be verified before recommendation' }),
  }),
  rationale: z.string().trim().min(10).max(2000),
});

export type SubmitReviewRecommendationInput = z.infer<typeof SubmitReviewRecommendationSchema>;

export const IndependentFinalApprovalSchema = z.object({
  expectedStateVersion: z.number().int().nonnegative(),
  decision: z.literal('APPROVE_RELEASE'),
  reasonCode: z.literal('EVIDENCE_VERIFIED'),
  rationale: z.string().trim().min(10).max(2000),
});

export type IndependentFinalApprovalInput = z.infer<typeof IndependentFinalApprovalSchema>;

export const TrusteeCoSignSchema = z.object({
  caseId: z.string().uuid(),
  attestationConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm and attest to the authenticity of the reported event' }),
  }),
  rationale: z.string().trim().min(10).max(2000),
});

export type TrusteeCoSignInput = z.infer<typeof TrusteeCoSignSchema>;

export const InactivitySweepQuerySchema = z.object({
  forceEvaluation: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type InactivitySweepQueryInput = z.infer<typeof InactivitySweepQuerySchema>;

export const ReleaseGrantQuerySchema = z.object({
  beneficiaryId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']).optional(),
});

export type ReleaseGrantQueryInput = z.infer<typeof ReleaseGrantQuerySchema>;

export const RedeemGrantSchema = z.object({
  grantId: z.string().uuid(),
  beneficiaryEmail: z.string().email(),
});

export type RedeemGrantInput = z.infer<typeof RedeemGrantSchema>;
