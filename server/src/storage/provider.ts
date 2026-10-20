import * as crypto from 'crypto';

export interface StorageObjectDescriptor {
  bucket: string;
  key: string;
  sizeBytes: number;
  mimeType: string;
}

export interface PutObjectParams {
  bucket: string;
  key: string;
  body: Buffer;
  mimeType: string;
}

export interface GetObjectParams {
  bucket: string;
  key: string;
}

export interface DeleteObjectParams {
  bucket: string;
  key: string;
}

export interface SignedUrlParams {
  bucket: string;
  key: string;
  expiresInSeconds?: number;
}

export interface StorageProvider {
  putObject(params: PutObjectParams): Promise<StorageObjectDescriptor>;
  getObject(params: GetObjectParams): Promise<{ body: Buffer; mimeType: string; sizeBytes: number }>;
  deleteObject(params: DeleteObjectParams): Promise<void>;
  createSignedUploadUrl(params: SignedUrlParams): Promise<string>;
  createSignedDownloadUrl(params: SignedUrlParams): Promise<string>;
}

/**
 * Local in-memory / local-disk storage provider for development and deterministic tests.
 * Maintains an internal store of blobs and simulates presigned URLs.
 */
export class LocalStorageProvider implements StorageProvider {
  private store: Map<string, { body: Buffer; mimeType: string }> = new Map();
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api/v1/storage') {
    this.baseUrl = baseUrl;
  }

  private compositeKey(bucket: string, key: string): string {
    return `${bucket}::${key}`;
  }

  async putObject(params: PutObjectParams): Promise<StorageObjectDescriptor> {
    const composite = this.compositeKey(params.bucket, params.key);
    this.store.set(composite, {
      body: params.body,
      mimeType: params.mimeType,
    });

    return {
      bucket: params.bucket,
      key: params.key,
      sizeBytes: params.body.length,
      mimeType: params.mimeType,
    };
  }

  async getObject(params: GetObjectParams): Promise<{ body: Buffer; mimeType: string; sizeBytes: number }> {
    const composite = this.compositeKey(params.bucket, params.key);
    const item = this.store.get(composite);
    if (!item) {
      throw new Error(`STORAGE_OBJECT_NOT_FOUND: Object "${params.key}" not found in bucket "${params.bucket}"`);
    }

    return {
      body: item.body,
      mimeType: item.mimeType,
      sizeBytes: item.body.length,
    };
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    const composite = this.compositeKey(params.bucket, params.key);
    this.store.delete(composite);
  }

  async createSignedUploadUrl(params: SignedUrlParams): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + (params.expiresInSeconds ?? 900);
    const signature = crypto
      .createHmac('sha256', 'mock-storage-signing-secret')
      .update(`upload:${params.bucket}:${params.key}:${expires}`)
      .digest('hex');

    return `${this.baseUrl}/upload?bucket=${encodeURIComponent(params.bucket)}&key=${encodeURIComponent(
      params.key
    )}&expires=${expires}&signature=${signature}`;
  }

  async createSignedDownloadUrl(params: SignedUrlParams): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + (params.expiresInSeconds ?? 900);
    const signature = crypto
      .createHmac('sha256', 'mock-storage-signing-secret')
      .update(`download:${params.bucket}:${params.key}:${expires}`)
      .digest('hex');

    return `${this.baseUrl}/download?bucket=${encodeURIComponent(params.bucket)}&key=${encodeURIComponent(
      params.key
    )}&expires=${expires}&signature=${signature}`;
  }

  /** Inspection helper for testing */
  hasObject(bucket: string, key: string): boolean {
    return this.store.has(this.compositeKey(bucket, key));
  }

  clear(): void {
    this.store.clear();
  }
}
