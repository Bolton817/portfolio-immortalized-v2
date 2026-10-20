import { z } from 'zod';
import { UserAccountStatus } from '@portfolio-immortalized/domain';

/**
 * Query schema for administrative user directory listing
 */
export const ListAdminUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(UserAccountStatus).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type ListAdminUsersQueryInput = z.infer<typeof ListAdminUsersQuerySchema>;

/**
 * Payload schema for updating user account status (Suspend / Restore)
 */
export const UpdateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'] as const),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
  notifyUser: z.boolean().optional().default(true),
});

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>;

/**
 * Payload schema for revoking active sessions remotely
 */
export const RevokeUserSessionsSchema = z.object({
  reason: z.string().min(5, 'Revocation reason must be at least 5 characters').max(500),
});

export type RevokeUserSessionsInput = z.infer<typeof RevokeUserSessionsSchema>;

/**
 * Payload schema for account deletion dry-run impact evaluation
 */
export const AccountDeletionDryRunSchema = z.object({
  userId: z.string().min(1, 'Target user ID is required'),
  reasonCode: z.string().min(3, 'Reason code is required'),
});

export type AccountDeletionDryRunInput = z.infer<typeof AccountDeletionDryRunSchema>;

/**
 * Query schema for filterable audit event search
 */
export const ListAuditEventsQuerySchema = z.object({
  actorId: z.string().optional(),
  actorType: z.string().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  outcome: z.enum(['SUCCESS', 'DENIED', 'FAILED', 'PENDING'] as const).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type ListAuditEventsQueryInput = z.infer<typeof ListAuditEventsQuerySchema>;

/**
 * Payload schema for toggling platform-wide emergency hold
 */
export const ToggleSystemHoldSchema = z.object({
  active: z.boolean(),
  reasonCode: z.string().min(3, 'Reason code is required'),
  rationale: z.string().min(10, 'Rationale must be at least 10 characters').max(1000),
});

export type ToggleSystemHoldInput = z.infer<typeof ToggleSystemHoldSchema>;
