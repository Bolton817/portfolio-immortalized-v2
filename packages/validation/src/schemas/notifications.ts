import { z } from 'zod';

/**
 * Beneficiary token & identity verification schema (WEB-BEN-01)
 */
export const BeneficiaryVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
  email: z.string().email('Valid beneficiary email is required'),
  nationalIdLast4: z
    .string()
    .regex(/^[A-Za-z0-9]{4}$/, 'Last 4 digits/characters must be alphanumeric')
    .optional(),
});

export type BeneficiaryVerificationInput = z.infer<typeof BeneficiaryVerificationSchema>;

/**
 * Trustee conflict and fraud alert submission schema (WEB-TRS-05, OD-18)
 */
export const TrusteeConflictReportSchema = z.object({
  caseId: z.string().uuid('Valid case ID is required'),
  conflictType: z.enum([
    'FRAUD_SUSPECTED',
    'DISPUTED_ESTATE',
    'INCORRECT_OWNER_INFO',
    'DECLINED_TRUSTEE',
  ]),
  narrative: z
    .string()
    .min(20, 'Detailed narrative must be at least 20 characters')
    .max(3000, 'Narrative cannot exceed 3,000 characters'),
});

export type TrusteeConflictReportInput = z.infer<typeof TrusteeConflictReportSchema>;

/**
 * Inbound webhook event payload schema from Brevo transactional email provider
 */
export const BrevoWebhookPayloadSchema = z.object({
  event: z.string().min(1),
  email: z.string().email(),
  messageId: z.string().min(1),
  ts_event: z.number().int(),
  tag: z.string().optional(),
});

export type BrevoWebhookPayload = z.infer<typeof BrevoWebhookPayloadSchema>;

/**
 * Schema for triggering worker tick execution
 */
export const WorkerTickSchema = z.object({
  secret: z.string().optional(),
  forceSweep: z.boolean().optional().default(false),
  processOutboxLimit: z.number().int().min(1).max(500).optional().default(50),
});

export type WorkerTickInput = z.infer<typeof WorkerTickSchema>;
