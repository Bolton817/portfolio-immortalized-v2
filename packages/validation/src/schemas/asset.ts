import { z } from 'zod';
import { AssetType, AssetSensitivity } from '@portfolio-immortalized/domain';

export const CreateUploadIntentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  declaredMimeType: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
  ]),
  declaredSizeBytes: z.number().int().positive().max(524288000), // Max 500 MB
  assetType: z.nativeEnum(AssetType),
  sensitivity: z.nativeEnum(AssetSensitivity),
});

export type CreateUploadIntentInput = z.infer<typeof CreateUploadIntentSchema>;

export const CompleteUploadSchema = z.object({
  uploadId: z.string().uuid(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-character SHA-256 hex string'),
  actualSizeBytes: z.number().int().positive(),
  keyEnvelopeReference: z.string().min(1).max(512),
  algorithmProfile: z.literal('AES-256-GCM'),
});

export type CompleteUploadInput = z.infer<typeof CompleteUploadSchema>;

export const UpdateAssetMetadataSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z.nativeEnum(AssetType).optional(),
  sensitivity: z.nativeEnum(AssetSensitivity).optional(),
  assignedBeneficiaryIds: z.array(z.string().uuid()).optional(),
});

export type UpdateAssetMetadataInput = z.infer<typeof UpdateAssetMetadataSchema>;

export const RequestPreviewAuthorizationSchema = z.object({
  assetId: z.string().uuid(),
  versionNumber: z.number().int().positive().optional(),
});

export type RequestPreviewAuthorizationInput = z.infer<typeof RequestPreviewAuthorizationSchema>;

export const CommitUploadPayloadSchema = z.object({
  assetId: z.string().uuid(),
  versionNumber: z.number().int().positive().default(1),
  declaredSha256: z.string().regex(/^[a-f0-9]{64}$/i, 'Must be valid 64-character SHA-256 hex string'),
  mimeType: z.string(),
  payloadBase64: z.string(),
});

export type CommitUploadPayloadInput = z.infer<typeof CommitUploadPayloadSchema>;

export const CreateVersionSchema = z.object({
  mimeType: z.string(),
  declaredSizeBytes: z.number().int().positive().max(524288000),
});

export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;

export const AssetQuerySchema = z.object({
  category: z.nativeEnum(AssetType).optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type AssetQueryInput = z.infer<typeof AssetQuerySchema>;
