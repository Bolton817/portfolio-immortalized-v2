import { z } from 'zod';

export const RegisterUserSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
  displayName: z.string().trim().min(2, 'Display name too short').max(100),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms of service' }),
  }),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the privacy policy' }),
  }),
});

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;

export const VerifyEmailSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().trim().min(6).max(128),
});

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

export const SignInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type SignInInput = z.infer<typeof SignInSchema>;

export const StepUpChallengeSchema = z.object({
  action: z.enum([
    'CHANGE_BENEFICIARIES',
    'CHANGE_TRUSTEES',
    'CHANGE_SECURITY_CREDENTIALS',
    'FINAL_RELEASE_APPROVAL',
    'EMERGENCY_HOLD_MODIFICATION',
  ]),
});

export type StepUpChallengeInput = z.infer<typeof StepUpChallengeSchema>;

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  legalName: z.string().trim().min(2).max(200).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD').optional(),
  nationality: z.string().length(2, 'ISO-3166-1 alpha-2 country code').optional(),
  residenceCountry: z.string().length(2, 'ISO-3166-1 alpha-2 country code').optional(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be E.164 format').optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
