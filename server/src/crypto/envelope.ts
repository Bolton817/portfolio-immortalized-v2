import * as crypto from 'crypto';

export interface KeyManagementService {
  wrapKey(plaintextKey: Buffer, keyReference: string): Promise<string>;
  unwrapKey(wrappedKeyBase64: string, keyReference: string): Promise<Buffer>;
}

/**
 * Local/Test implementation of KMS for development and unit testing.
 * In production, this adapter interfaces with AWS KMS, GCP Cloud KMS, or an HSM.
 */
export class LocalMockKmsService implements KeyManagementService {
  private masterKek: Buffer;

  constructor(masterSecret: string = 'default-dev-master-kek-32-chars!') {
    this.masterKek = crypto.createHash('sha256').update(masterSecret).digest();
  }

  async wrapKey(plaintextKey: Buffer, _keyReference: string): Promise<string> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKek, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintextKey), cipher.final()]);
    const tag = cipher.getAuthTag();

    const envelope = Buffer.concat([iv, tag, ciphertext]);
    return envelope.toString('base64');
  }

  async unwrapKey(wrappedKeyBase64: string, _keyReference: string): Promise<Buffer> {
    const raw = Buffer.from(wrappedKeyBase64, 'base64');
    if (raw.length < 28) {
      throw new Error('CORRUPTED_KEY_ENVELOPE: Invalid envelope length');
    }

    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKek, iv);
    decipher.setAuthTag(tag);

    try {
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext;
    } catch (err) {
      throw new Error(`KMS_UNWRAP_FAILED: Authentication tag verification failed. ${(err as Error).message}`);
    }
  }
}

export interface EncryptedAssetPayload {
  ciphertext: Buffer;
  nonceBase64: string;
  authTagBase64: string;
  wrappedDekBase64: string;
  sha256Hex: string;
}

export interface EncryptionBindingMetadata {
  assetId: string;
  versionNumber: number;
  ownerId: string;
}

export class EnvelopeEncryptionService {
  private kms: KeyManagementService;
  private keyReference: string;

  constructor(kms: KeyManagementService, keyReference: string = 'local-mock-kek-v1') {
    this.kms = kms;
    this.keyReference = keyReference;
  }

  /**
   * Encrypts plaintext bytes using a fresh 256-bit DEK under AES-256-GCM.
   * Binds metadata into Additional Authenticated Data (AAD) to prevent ciphertext swapping.
   */
  async encrypt(
    plaintext: Buffer,
    metadata: EncryptionBindingMetadata
  ): Promise<EncryptedAssetPayload> {
    // 1. Generate unique 256-bit DEK
    const dek = crypto.randomBytes(32);

    // 2. Generate unique 96-bit Nonce
    const nonce = crypto.randomBytes(12);

    // 3. Compute plaintext SHA-256 hash
    const sha256Hex = crypto.createHash('sha256').update(plaintext).digest('hex');

    // 4. Construct AAD binding
    const aad = Buffer.from(
      JSON.stringify({
        assetId: metadata.assetId,
        versionNumber: metadata.versionNumber,
        ownerId: metadata.ownerId,
      })
    );

    // 5. Encrypt with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, nonce);
    cipher.setAAD(aad);

    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 6. Wrap the DEK via KMS
    const wrappedDekBase64 = await this.kms.wrapKey(dek, this.keyReference);

    // Wipe DEK memory
    dek.fill(0);

    return {
      ciphertext,
      nonceBase64: nonce.toString('base64'),
      authTagBase64: authTag.toString('base64'),
      wrappedDekBase64,
      sha256Hex,
    };
  }

  /**
   * Decrypts ciphertext bytes after KMS unwraps the DEK and AEAD verifies the authentication tag.
   */
  async decrypt(
    payload: {
      ciphertext: Buffer;
      nonceBase64: string;
      authTagBase64: string;
      wrappedDekBase64: string;
    },
    metadata: EncryptionBindingMetadata
  ): Promise<Buffer> {
    // 1. Unwrap the DEK from KMS
    const dek = await this.kms.unwrapKey(payload.wrappedDekBase64, this.keyReference);

    const nonce = Buffer.from(payload.nonceBase64, 'base64');
    const authTag = Buffer.from(payload.authTagBase64, 'base64');

    // 2. Construct AAD binding
    const aad = Buffer.from(
      JSON.stringify({
        assetId: metadata.assetId,
        versionNumber: metadata.versionNumber,
        ownerId: metadata.ownerId,
      })
    );

    // 3. Decrypt with AES-256-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, nonce);
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    try {
      const plaintext = Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
      dek.fill(0); // Wipe DEK memory
      return plaintext;
    } catch (err) {
      dek.fill(0);
      throw new Error(`ASSET_INTEGRITY_FAILED: Ciphertext corrupted or AAD metadata mismatch. ${(err as Error).message}`);
    }
  }
}
