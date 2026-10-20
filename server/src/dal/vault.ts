import * as crypto from 'crypto';
import {
  UserId,
  AssetId,
  AssetVersionId,
  StorageObjectId,
  KeyEnvelopeId,
  AssetType,
  AssetSensitivity,
  AssetStatus,
  VersionScanStatus,
  makeAssetId,
  makeAssetVersionId,
} from '@portfolio-immortalized/domain';
import {
  CreateUploadIntentInput,
  UpdateAssetMetadataInput,
} from '@portfolio-immortalized/validation';
import { StorageProvider, LocalStorageProvider } from '../storage/provider.js';
import {
  EnvelopeEncryptionService,
  LocalMockKmsService,
  KeyManagementService,
} from '../crypto/envelope.js';
import { assertOwnerAccess, assertTrusteeCannotAccessVault, DalAuthorizationError } from './tenancy.js';
import { AuditService } from '../audit/logger.js';

export const MAX_UPLOAD_SIZE_BYTES = 524_288_000; // 500 MB

export const ALLOWED_MIME_TYPES = new Set([
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
]);

export interface KeyEnvelopeRecord {
  id: KeyEnvelopeId;
  kmsKeyReference: string;
  wrappedDek: string;
  algorithmVersion: string;
  nonceBase64: string;
  authTagBase64: string;
  createdAt: Date;
}

export interface StorageObjectRefRecord {
  id: StorageObjectId;
  provider: string;
  bucket: string;
  objectKey: string;
  region: string;
  sizeBytes: number;
  mimeType: string;
  lifecycleState: string;
  createdAt: Date;
}

export interface AssetVersionRecord {
  id: AssetVersionId;
  assetId: AssetId;
  versionNumber: number;
  sha256: string;
  storageObjectId: StorageObjectId;
  storageObject?: StorageObjectRefRecord;
  encryptionAlgorithm: string;
  keyEnvelopeId: KeyEnvelopeId;
  keyEnvelope?: KeyEnvelopeRecord;
  scanStatus: VersionScanStatus;
  committedAt: Date | null;
  createdAt: Date;
}

export interface AssetRecord {
  id: AssetId;
  ownerId: UserId;
  assetType: AssetType;
  title: string;
  description?: string;
  sensitivity: AssetSensitivity;
  status: AssetStatus;
  currentVersionId: AssetVersionId | null;
  currentVersion?: AssetVersionRecord;
  versions: AssetVersionRecord[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface UploadIntentResponse {
  assetId: AssetId;
  versionNumber: number;
  uploadUrl: string;
  bucket: string;
  objectKey: string;
  expiresInSeconds: number;
}

export interface AssetDownloadDescriptor {
  assetId: AssetId;
  title: string;
  versionNumber: number;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  plaintext: Buffer;
}

export interface ListAssetsFilter {
  category?: AssetType;
  search?: string;
  limit?: number;
  offset?: number;
}

export class VaultDal {
  private assets: Map<string, AssetRecord> = new Map();
  private versions: Map<string, AssetVersionRecord> = new Map();
  private storageRefs: Map<string, StorageObjectRefRecord> = new Map();
  private envelopes: Map<string, KeyEnvelopeRecord> = new Map();

  private storageProvider: StorageProvider;
  private envelopeService: EnvelopeEncryptionService;
  private auditService: AuditService;
  private vaultBucket: string;

  constructor(options?: {
    storageProvider?: StorageProvider;
    kms?: KeyManagementService;
    auditService?: AuditService;
    vaultBucket?: string;
  }) {
    this.storageProvider = options?.storageProvider ?? new LocalStorageProvider();
    const kms = options?.kms ?? new LocalMockKmsService();
    this.envelopeService = new EnvelopeEncryptionService(kms, 'vault-kek-master-v1');
    this.auditService = options?.auditService ?? new AuditService();
    this.vaultBucket = options?.vaultBucket ?? 'private-vault';
  }

  // ============================================================================
  // Upload Intent (Phase 1 of 2-Phase Upload)
  // ============================================================================

  async createUploadIntent(
    ownerId: UserId,
    input: CreateUploadIntentInput
  ): Promise<UploadIntentResponse> {
    // 1. Validate MIME Whitelist
    if (!ALLOWED_MIME_TYPES.has(input.declaredMimeType)) {
      throw new DalAuthorizationError(
        'UNSUPPORTED_MIME_TYPE',
        `File type "${input.declaredMimeType}" is not permitted in the secure vault.`,
        400
      );
    }

    // 2. Validate Size Limit
    if (input.declaredSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
      throw new DalAuthorizationError(
        'FILE_TOO_LARGE',
        `Declared file size (${input.declaredSizeBytes} bytes) exceeds the maximum limit of 500 MB.`,
        400
      );
    }

    const assetId = makeAssetId(crypto.randomUUID());
    const versionNumber = 1;
    const objectKey = `vault/${ownerId}/${assetId}/v${versionNumber}`;

    // 3. Create placeholder Asset record in PENDING status
    const now = new Date();
    const asset: AssetRecord = {
      id: assetId,
      ownerId,
      assetType: input.assetType,
      title: input.fileName ?? (input as any).title ?? 'Untitled Document',
      sensitivity: input.sensitivity,
      status: AssetStatus.PENDING,
      currentVersionId: null,
      versions: [],
      createdAt: now,
      updatedAt: now,
    };
    this.assets.set(assetId, asset);

    // 4. Generate signed upload URL
    const expiresInSeconds = 900; // 15 minutes
    const uploadUrl = await this.storageProvider.createSignedUploadUrl({
      bucket: this.vaultBucket,
      key: objectKey,
      expiresInSeconds,
    });

    return {
      assetId,
      versionNumber,
      uploadUrl,
      bucket: this.vaultBucket,
      objectKey,
      expiresInSeconds,
    };
  }

  // ============================================================================
  // Commit Upload (Phase 2 of 2-Phase Upload: Hash & Cryptographic Envelope)
  // ============================================================================

  async commitUpload(
    ownerId: UserId,
    assetId: AssetId,
    versionNumber: number,
    plaintextPayload: Buffer,
    declaredSha256: string,
    mimeType: string
  ): Promise<AssetRecord> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new DalAuthorizationError('ASSET_NOT_FOUND', `Asset "${assetId}" was not found.`, 404);
    }
    assertOwnerAccess(ownerId, asset.ownerId);

    // 1. Integrity Check: Verify SHA-256 matches actual plaintext payload
    const actualSha256 = crypto.createHash('sha256').update(plaintextPayload).digest('hex');
    if (actualSha256.toLowerCase() !== declaredSha256.toLowerCase()) {
      throw new DalAuthorizationError(
        'CHECKSUM_MISMATCH',
        `Payload SHA-256 checksum (${actualSha256}) does not match declared checksum (${declaredSha256}). Upload rejected.`,
        422
      );
    }

    // 2. Cryptographic Envelope: Encrypt payload with fresh DEK and AAD binding
    const encrypted = await this.envelopeService.encrypt(plaintextPayload, {
      assetId,
      versionNumber,
      ownerId,
    });

    // 3. Store ciphertext in object storage
    const objectKey = `vault/${ownerId}/${assetId}/v${versionNumber}`;
    await this.storageProvider.putObject({
      bucket: this.vaultBucket,
      key: objectKey,
      body: encrypted.ciphertext,
      mimeType: 'application/octet-stream',
    });

    const now = new Date();

    // 4. Record KeyEnvelope
    const keyEnvelopeId = crypto.randomUUID() as KeyEnvelopeId;
    const envelopeRecord: KeyEnvelopeRecord = {
      id: keyEnvelopeId,
      kmsKeyReference: 'vault-kek-master-v1',
      wrappedDek: encrypted.wrappedDekBase64,
      algorithmVersion: 'v1',
      nonceBase64: encrypted.nonceBase64,
      authTagBase64: encrypted.authTagBase64,
      createdAt: now,
    };
    this.envelopes.set(keyEnvelopeId, envelopeRecord);

    // 5. Record StorageObjectRef
    const storageObjectId = crypto.randomUUID() as StorageObjectId;
    const storageRef: StorageObjectRefRecord = {
      id: storageObjectId,
      provider: 'STORAGE_PROVIDER',
      bucket: this.vaultBucket,
      objectKey,
      region: 'local',
      sizeBytes: plaintextPayload.length,
      mimeType,
      lifecycleState: 'ACTIVE',
      createdAt: now,
    };
    this.storageRefs.set(storageObjectId, storageRef);

    // 6. Record AssetVersion
    const versionId = makeAssetVersionId(crypto.randomUUID());
    const versionRecord: AssetVersionRecord = {
      id: versionId,
      assetId,
      versionNumber,
      sha256: actualSha256,
      storageObjectId,
      storageObject: storageRef,
      encryptionAlgorithm: 'AES-256-GCM',
      keyEnvelopeId,
      keyEnvelope: envelopeRecord,
      scanStatus: VersionScanStatus.CLEAN,
      committedAt: now,
      createdAt: now,
    };
    this.versions.set(versionId, versionRecord);

    // 7. Update Asset record to AVAILABLE
    asset.status = AssetStatus.AVAILABLE;
    asset.currentVersionId = versionId;
    asset.currentVersion = versionRecord;
    asset.versions.push(versionRecord);
    asset.updatedAt = now;
    this.assets.set(assetId, asset);

    // 8. Audit event
    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'vault.asset_committed',
      targetType: 'Asset',
      targetId: assetId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        versionNumber,
        sha256: actualSha256,
        sizeBytes: plaintextPayload.length,
        mimeType,
      },
    });

    return asset;
  }

  // ============================================================================
  // Versioning: Create New Asset Version (e.g. Updated Will v2)
  // ============================================================================

  async createNewVersionIntent(
    ownerId: UserId,
    assetId: AssetId,
    mimeType: string,
    declaredSizeBytes: number
  ): Promise<UploadIntentResponse> {
    const asset = this.assets.get(assetId);
    if (!asset || asset.status === AssetStatus.PURGED) {
      throw new DalAuthorizationError('ASSET_NOT_FOUND', `Asset "${assetId}" was not found.`, 404);
    }
    assertOwnerAccess(ownerId, asset.ownerId);

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new DalAuthorizationError(
        'UNSUPPORTED_MIME_TYPE',
        `File type "${mimeType}" is not permitted.`,
        400
      );
    }

    if (declaredSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
      throw new DalAuthorizationError(
        'FILE_TOO_LARGE',
        `Declared file size (${declaredSizeBytes} bytes) exceeds the maximum limit of 500 MB.`,
        400
      );
    }

    const nextVersionNumber = (asset.currentVersion?.versionNumber ?? asset.versions.length) + 1;
    const objectKey = `vault/${ownerId}/${assetId}/v${nextVersionNumber}`;

    const expiresInSeconds = 900;
    const uploadUrl = await this.storageProvider.createSignedUploadUrl({
      bucket: this.vaultBucket,
      key: objectKey,
      expiresInSeconds,
    });

    return {
      assetId,
      versionNumber: nextVersionNumber,
      uploadUrl,
      bucket: this.vaultBucket,
      objectKey,
      expiresInSeconds,
    };
  }

  // ============================================================================
  // Retrieval & Download Descriptor
  // ============================================================================

  async getAsset(ownerId: UserId, assetId: AssetId): Promise<AssetRecord> {
    const asset = this.assets.get(assetId);
    if (!asset || asset.status === AssetStatus.PURGED) {
      throw new DalAuthorizationError('ASSET_NOT_FOUND', `Asset "${assetId}" was not found.`, 404);
    }
    assertOwnerAccess(ownerId, asset.ownerId);
    return asset;
  }

  async listAssets(ownerId: UserId, filter?: ListAssetsFilter): Promise<AssetRecord[]> {
    let list = Array.from(this.assets.values()).filter(
      (a) => a.ownerId === ownerId && a.status !== AssetStatus.PURGED
    );

    if (filter?.category) {
      list = list.filter((a) => a.assetType === filter.category);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q))
      );
    }

    // Sort newest updated first
    list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 50;
    return list.slice(offset, offset + limit);
  }

  async getAssetDownloadDescriptor(
    requesterId: UserId,
    assetId: AssetId,
    versionNumber?: number,
    options?: { requesterRole?: string }
  ): Promise<AssetDownloadDescriptor> {
    // Invariant REL-04: Trustees have zero access to vault contents
    if (options?.requesterRole) {
      assertTrusteeCannotAccessVault(options.requesterRole);
    }

    const asset = this.assets.get(assetId);
    if (!asset || asset.status === AssetStatus.PURGED) {
      throw new DalAuthorizationError('ASSET_NOT_FOUND', `Asset "${assetId}" was not found.`, 404);
    }
    assertOwnerAccess(requesterId, asset.ownerId);

    // Resolve target version
    const targetVersionNumber = versionNumber ?? asset.currentVersion?.versionNumber;
    const version = asset.versions.find((v) => v.versionNumber === targetVersionNumber);
    if (!version || !version.storageObject || !version.keyEnvelope) {
      throw new DalAuthorizationError(
        'VERSION_NOT_FOUND',
        `Version ${targetVersionNumber} of asset "${assetId}" is not committed.`,
        404
      );
    }

    // 1. Fetch encrypted ciphertext from storage
    const storageObj = await this.storageProvider.getObject({
      bucket: version.storageObject.bucket,
      key: version.storageObject.objectKey,
    });

    // 2. Decrypt with AEAD verification and KMS unwrapping
    const plaintext = await this.envelopeService.decrypt(
      {
        ciphertext: storageObj.body,
        nonceBase64: version.keyEnvelope.nonceBase64,
        authTagBase64: version.keyEnvelope.authTagBase64,
        wrappedDekBase64: version.keyEnvelope.wrappedDek,
      },
      {
        assetId,
        versionNumber: version.versionNumber,
        ownerId: asset.ownerId,
      }
    );

    // 3. Audit access
    await this.auditService.record({
      actorType: 'USER',
      actorId: requesterId,
      action: 'vault.asset_downloaded',
      targetType: 'Asset',
      targetId: assetId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        versionNumber: version.versionNumber,
        sizeBytes: plaintext.length,
      },
    });

    return {
      assetId,
      title: asset.title,
      versionNumber: version.versionNumber,
      mimeType: version.storageObject.mimeType,
      sizeBytes: plaintext.length,
      sha256: version.sha256,
      plaintext,
    };
  }

  async getAssetWithoutOwnerCheck(assetId: AssetId): Promise<AssetRecord> {
    const asset = this.assets.get(assetId);
    if (!asset || asset.status === AssetStatus.PURGED) {
      throw new DalAuthorizationError('ASSET_NOT_FOUND', `Asset "${assetId}" was not found.`, 404);
    }
    return asset;
  }

  async decryptAssetPayload(
    asset: AssetRecord,
    versionNumber?: number
  ): Promise<{
    plaintext: Buffer;
    mimeType: string;
    title: string;
    sha256: string;
    versionNumber: number;
  }> {
    const targetVersionNumber = versionNumber ?? asset.currentVersion?.versionNumber;
    const version = asset.versions.find((v) => v.versionNumber === targetVersionNumber);
    if (!version || !version.storageObject || !version.keyEnvelope) {
      throw new DalAuthorizationError(
        'VERSION_NOT_FOUND',
        `Version ${targetVersionNumber} of asset "${asset.id}" is not committed.`,
        404
      );
    }

    const storageObj = await this.storageProvider.getObject({
      bucket: version.storageObject.bucket,
      key: version.storageObject.objectKey,
    });

    const plaintext = await this.envelopeService.decrypt(
      {
        ciphertext: storageObj.body,
        nonceBase64: version.keyEnvelope.nonceBase64,
        authTagBase64: version.keyEnvelope.authTagBase64,
        wrappedDekBase64: version.keyEnvelope.wrappedDek,
      },
      {
        assetId: asset.id,
        versionNumber: version.versionNumber,
        ownerId: asset.ownerId,
      }
    );

    return {
      plaintext,
      mimeType: version.storageObject.mimeType,
      title: asset.title,
      sha256: version.sha256,
      versionNumber: version.versionNumber,
    };
  }

  // ============================================================================
  // Metadata Updates & Soft Deletion
  // ============================================================================

  async updateAssetMetadata(
    ownerId: UserId,
    assetId: AssetId,
    input: UpdateAssetMetadataInput
  ): Promise<AssetRecord> {
    const asset = this.assets.get(assetId);
    if (!asset || asset.status === AssetStatus.PURGED) {
      throw new DalAuthorizationError('ASSET_NOT_FOUND', `Asset "${assetId}" was not found.`, 404);
    }
    assertOwnerAccess(ownerId, asset.ownerId);

    if (input.title) asset.title = input.title;
    if (input.description !== undefined) asset.description = input.description;
    if (input.category) asset.assetType = input.category;
    if (input.sensitivity) asset.sensitivity = input.sensitivity;
    asset.updatedAt = new Date();

    this.assets.set(assetId, asset);

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'vault.asset_metadata_updated',
      targetType: 'Asset',
      targetId: assetId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: { ...input },
    });

    return asset;
  }

  async softDeleteAsset(ownerId: UserId, assetId: AssetId): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset || asset.status === AssetStatus.PURGED) {
      throw new DalAuthorizationError('ASSET_NOT_FOUND', `Asset "${assetId}" was not found.`, 404);
    }
    assertOwnerAccess(ownerId, asset.ownerId);

    const now = new Date();
    asset.status = AssetStatus.PURGED;
    asset.deletedAt = now;
    asset.updatedAt = now;
    this.assets.set(assetId, asset);

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'vault.asset_deleted',
      targetType: 'Asset',
      targetId: assetId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: { deletedAt: now.toISOString() },
    });
  }
}
