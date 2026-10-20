import { z } from 'zod';

export const UpsertInstructionSchema = z.object({
  beneficiaryId: z.string().uuid('Invalid beneficiary ID'),
  assignedAssetIds: z.array(z.string().uuid('Invalid asset ID')).min(1, 'At least one asset must be assigned to this beneficiary'),
  customInstructions: z.string().trim().max(5000, 'Custom instructions cannot exceed 5000 characters').optional().nullable(),
  deliveryDelayDays: z.number().int().nonnegative().max(365, 'Delivery delay cannot exceed 365 days').default(0),
});

export type UpsertInstructionInput = z.infer<typeof UpsertInstructionSchema>;

export const PublishLegacyPlanSchema = z.object({
  acceptanceDisclaimerConfirmed: z.literal(true, {
    errorMap: () => ({
      message: 'You must confirm that you understand and accept the statutory succession and digital legacy terms.',
    }),
  }),
  policyVersion: z.string().min(1).default('ke-v1.0'),
});

export type PublishLegacyPlanInput = z.infer<typeof PublishLegacyPlanSchema>;

export const RecipientPreviewQuerySchema = z.object({
  beneficiaryId: z.string().uuid().optional(),
});

export type RecipientPreviewQueryInput = z.infer<typeof RecipientPreviewQuerySchema>;
