import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import {
  VaultDal,
  LocalStorageProvider,
  UserId,
  makeUserId,
  AssetType,
  AssetSensitivity,
  AssetStatus,
  DalAuthorizationError,
} from '../src/index.js';

describe('VaultDal — Cryptographic Storage & Lifecycle', () => {
  let vaultDal: VaultDal;
  let storageProvider: LocalStorageProvider;
  const ownerId: UserId = makeUserId('usr_owner_vault_01');
  const intruderId: UserId = makeUserId('usr_intruder_02');

  beforeEach(() => {
    storageProvider = new LocalStorageProvider();
    vaultDal = new VaultDal({ storageProvider });
  });

  describe('createUploadIntent', () => {
    it('creates an upload intent and returns a presigned upload URL', async () => {
      const intent = await vaultDal.createUploadIntent(ownerId, {
        fileName: 'Last_Will_and_Testament_2026.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 2_500_000,
        assetType: AssetType.WILL,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      });

      expect(intent.assetId).toBeDefined();
      expect(intent.versionNumber).toBe(1);
      expect(intent.uploadUrl).toContain('upload?bucket=private-vault');
      expect(intent.objectKey).toBe(`vault/${ownerId}/${intent.assetId}/v1`);
    });

    it('rejects unsupported MIME types with 400', async () => {
      await expect(
        vaultDal.createUploadIntent(ownerId, {
          fileName: 'malware.exe',
          declaredMimeType: 'application/x-msdownload' as any,
          declaredSizeBytes: 1024,
          assetType: AssetType.DOCUMENT,
          sensitivity: AssetSensitivity.CONFIDENTIAL,
        })
      ).rejects.toThrow('File type "application/x-msdownload" is not permitted in the secure vault.');
    });

    it('rejects files larger than 500 MB with 400', async () => {
      await expect(
        vaultDal.createUploadIntent(ownerId, {
          fileName: 'huge_archive.zip',
          declaredMimeType: 'video/mp4',
          declaredSizeBytes: 600_000_000, // 600 MB
          assetType: AssetType.VIDEO,
          sensitivity: AssetSensitivity.GENERAL_PRIVATE,
        })
      ).rejects.toThrow('exceeds the maximum limit of 500 MB');
    });
  });

  describe('commitUpload & Cryptographic Envelope', () => {
    it('encrypts payload with AES-256-GCM, stores ciphertext, and records key envelope', async () => {
      const intent = await vaultDal.createUploadIntent(ownerId, {
        fileName: 'estate_deed.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 100,
        assetType: AssetType.DOCUMENT,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      });

      const samplePdfContent = Buffer.from('%PDF-1.7 Sample Estate Deed with Confidential Land Registry Details');
      const sha256 = crypto.createHash('sha256').update(samplePdfContent).digest('hex');

      const committed = await vaultDal.commitUpload(
        ownerId,
        intent.assetId,
        intent.versionNumber,
        samplePdfContent,
        sha256,
        'application/pdf'
      );

      expect(committed.status).toBe(AssetStatus.AVAILABLE);
      expect(committed.currentVersionId).toBeDefined();
      expect(committed.versions).toHaveLength(1);
      expect(committed.versions[0].sha256).toBe(sha256);

      // Verify that stored bytes in storage provider are ciphertext (not plaintext)
      const stored = await storageProvider.getObject({
        bucket: 'private-vault',
        key: `vault/${ownerId}/${intent.assetId}/v1`,
      });
      expect(stored.body.equals(samplePdfContent)).toBe(false);
    });

    it('rejects commit with CHECKSUM_MISMATCH when declared SHA-256 does not match payload', async () => {
      const intent = await vaultDal.createUploadIntent(ownerId, {
        fileName: 'corrupt_doc.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 50,
        assetType: AssetType.DOCUMENT,
        sensitivity: AssetSensitivity.CONFIDENTIAL,
      });

      const actualContent = Buffer.from('Legitimate payload bytes');
      const forgedHash = 'a'.repeat(64);

      await expect(
        vaultDal.commitUpload(
          ownerId,
          intent.assetId,
          intent.versionNumber,
          actualContent,
          forgedHash,
          'application/pdf'
        )
      ).rejects.toThrow('does not match declared checksum');
    });
  });

  describe('getAssetDownloadDescriptor & Security Invariants', () => {
    it('decrypts stored ciphertext and authenticates AEAD tag for the owner', async () => {
      const intent = await vaultDal.createUploadIntent(ownerId, {
        fileName: 'birth_certificate.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 120,
        assetType: AssetType.IDENTITY,
        sensitivity: AssetSensitivity.CONFIDENTIAL,
      });

      const secretText = 'CONFIDENTIAL_CIVIL_REGISTRATION_NUMBER_987654321';
      const payload = Buffer.from(secretText);
      const sha256 = crypto.createHash('sha256').update(payload).digest('hex');

      await vaultDal.commitUpload(
        ownerId,
        intent.assetId,
        intent.versionNumber,
        payload,
        sha256,
        'application/pdf'
      );

      const download = await vaultDal.getAssetDownloadDescriptor(ownerId, intent.assetId);
      expect(download.plaintext.toString('utf-8')).toBe(secretText);
      expect(download.sha256).toBe(sha256);
      expect(download.mimeType).toBe('application/pdf');
    });

    it('rejects download attempt from unauthorized user with 403', async () => {
      const intent = await vaultDal.createUploadIntent(ownerId, {
        fileName: 'private_note.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 10,
        assetType: AssetType.MESSAGE,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      });

      const payload = Buffer.from('Top secret thoughts');
      const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
      await vaultDal.commitUpload(ownerId, intent.assetId, 1, payload, sha256, 'application/pdf');

      await expect(
        vaultDal.getAssetDownloadDescriptor(intruderId, intent.assetId)
      ).rejects.toThrow(DalAuthorizationError);
    });

    it('strictly enforces REL-04: rejects trustee session with TRUSTEE_VAULT_ACCESS_FORBIDDEN', async () => {
      const intent = await vaultDal.createUploadIntent(ownerId, {
        fileName: 'trust_deed.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 10,
        assetType: AssetType.WILL,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      });

      const payload = Buffer.from('Trust details');
      const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
      await vaultDal.commitUpload(ownerId, intent.assetId, 1, payload, sha256, 'application/pdf');

      await expect(
        vaultDal.getAssetDownloadDescriptor(ownerId, intent.assetId, undefined, {
          requesterRole: 'TRUSTEE',
        })
      ).rejects.toThrow('Trustees are verification contacts only and have zero access to private vault contents (REL-04).');
    });
  });

  describe('Multi-versioning (v1 -> v2)', () => {
    it('creates version 2 with independent ciphertext and preserves version 1', async () => {
      // Version 1
      const intent1 = await vaultDal.createUploadIntent(ownerId, {
        fileName: 'Will_Draft.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 50,
        assetType: AssetType.WILL,
        sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
      });
      const v1Text = 'Original Will Version 1 - Signed 2024';
      const v1Buf = Buffer.from(v1Text);
      const v1Sha = crypto.createHash('sha256').update(v1Buf).digest('hex');
      await vaultDal.commitUpload(ownerId, intent1.assetId, 1, v1Buf, v1Sha, 'application/pdf');

      // Version 2 Intent
      const intent2 = await vaultDal.createNewVersionIntent(
        ownerId,
        intent1.assetId,
        'application/pdf',
        60
      );
      expect(intent2.versionNumber).toBe(2);

      // Version 2 Commit
      const v2Text = 'Amended Will Version 2 - Codicil Added 2026';
      const v2Buf = Buffer.from(v2Text);
      const v2Sha = crypto.createHash('sha256').update(v2Buf).digest('hex');
      const updatedAsset = await vaultDal.commitUpload(
        ownerId,
        intent1.assetId,
        2,
        v2Buf,
        v2Sha,
        'application/pdf'
      );

      expect(updatedAsset.versions).toHaveLength(2);
      expect(updatedAsset.currentVersion?.versionNumber).toBe(2);

      // Verify downloading v1 returns v1 text
      const dl1 = await vaultDal.getAssetDownloadDescriptor(ownerId, intent1.assetId, 1);
      expect(dl1.plaintext.toString('utf-8')).toBe(v1Text);

      // Verify downloading default (latest) returns v2 text
      const dlLatest = await vaultDal.getAssetDownloadDescriptor(ownerId, intent1.assetId);
      expect(dlLatest.plaintext.toString('utf-8')).toBe(v2Text);
    });
  });

  describe('softDeleteAsset', () => {
    it('soft deletes asset and excludes it from subsequent listings', async () => {
      const intent = await vaultDal.createUploadIntent(ownerId, {
        fileName: 'temporary_note.pdf',
        declaredMimeType: 'application/pdf',
        declaredSizeBytes: 20,
        assetType: AssetType.OTHER,
        sensitivity: AssetSensitivity.GENERAL_PRIVATE,
      });
      const buf = Buffer.from('temp note');
      await vaultDal.commitUpload(
        ownerId,
        intent.assetId,
        1,
        buf,
        crypto.createHash('sha256').update(buf).digest('hex'),
        'application/pdf'
      );

      const listBefore = await vaultDal.listAssets(ownerId);
      expect(listBefore).toHaveLength(1);

      await vaultDal.softDeleteAsset(ownerId, intent.assetId);

      const listAfter = await vaultDal.listAssets(ownerId);
      expect(listAfter).toHaveLength(0);

      await expect(vaultDal.getAsset(ownerId, intent.assetId)).rejects.toThrow('was not found');
    });
  });
});
