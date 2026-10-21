import { z } from 'zod';

export const RegisterDeviceTokenSchema = z.object({
  token: z.string().min(10, 'Push token must be at least 10 characters'),
  platform: z.enum(['ios', 'android', 'web']),
  deviceModel: z.string().optional(),
  appVersion: z.string().optional(),
});
