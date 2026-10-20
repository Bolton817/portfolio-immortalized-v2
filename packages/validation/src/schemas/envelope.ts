import { z } from 'zod';

export const ErrorDetailSchema = z.object({
  field: z.string().optional(),
  issue: z.string(),
});

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
  }),
});

export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export const StandardSuccessEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    requestId: z.string(),
  });
