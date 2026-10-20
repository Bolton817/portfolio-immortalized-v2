import { z } from 'zod';

export const InviteTrusteeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be E.164 format').optional(),
  relationshipType: z.enum(['FAMILY', 'PROFESSIONAL', 'FRIEND', 'LEGAL_REPRESENTATIVE', 'OTHER']),
  message: z.string().trim().max(1000).optional(),
});

export type InviteTrusteeInput = z.infer<typeof InviteTrusteeSchema>;

export const AcceptInvitationSchema = z.object({
  token: z.string().trim().min(32).max(256),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the trustee responsibility agreement' }),
  }),
});

export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

export const CreateBeneficiarySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be E.164 format').optional(),
  relationshipType: z.enum(['CHILD', 'SPOUSE', 'SIBLING', 'PARENT', 'PARTNER', 'FRIEND', 'OTHER']),
  personalNote: z.string().trim().max(2000).optional(),
});

export type CreateBeneficiaryInput = z.infer<typeof CreateBeneficiarySchema>;

export const UpdateLegacyInstructionSchema = z.object({
  beneficiaryId: z.string().uuid(),
  assignedAssetIds: z.array(z.string().uuid()),
  customInstructions: z.string().trim().max(5000).optional(),
});

export type UpdateLegacyInstructionInput = z.infer<typeof UpdateLegacyInstructionSchema>;
