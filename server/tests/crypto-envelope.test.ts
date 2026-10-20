import { describe, it, expect } from 'vitest';
import {
  EnvelopeEncryptionService,
  LocalMockKmsService,
  EncryptionBindingMetadata,
} from '../src/index.js';

describe('EnvelopeEncryptionService (TDD Chapter 23)', () => {
  const kms = new LocalMockKmsService('test-master-kek-32-bytes-long!');
  const cryptoService = new EnvelopeEncryptionService(kms, 'test-kek-v1');

  const metadata: EncryptionBindingMetadata = {
    assetId: 'asset-1234',
    versionNumber: 1,
    ownerId: 'owner-5678',
  };

  it('performs full encrypt and decrypt roundtrip successfully', () => {
    const originalText = 'CONFIDENTIAL LAST WILL AND TESTAMENT: I leave all assets to my children.';
    const plaintext = Buffer.from(originalText, 'utf-8');

    return cryptoService.encrypt(plaintext, metadata).then((encrypted) => {
      expect(encrypted.ciphertext).not.toEqual(plaintext);
      expect(encrypted.wrappedDekBase64).toBeTruthy();
      expect(encrypted.nonceBase64).toBeTruthy();
      expect(encrypted.authTagBase64).toBeTruthy();
      expect(encrypted.sha256Hex).toBeTruthy();

      return cryptoService.decrypt(encrypted, metadata).then((decrypted) => {
        expect(decrypted.toString('utf-8')).toEqual(originalText);
      });
    });
  });

  it('fails closed when ciphertext is tampered with', async () => {
    const originalText = 'Sensitive family video transcript';
    const plaintext = Buffer.from(originalText, 'utf-8');

    const encrypted = await cryptoService.encrypt(plaintext, metadata);

    // Tamper with one byte of ciphertext
    encrypted.ciphertext[0] = (encrypted.ciphertext[0]! ^ 0xff);

    await expect(cryptoService.decrypt(encrypted, metadata)).rejects.toThrow(
      'ASSET_INTEGRITY_FAILED'
    );
  });

  it('fails closed when AAD binding metadata is swapped (e.g. cross-account attack)', async () => {
    const originalText = 'Owner 1 will document';
    const plaintext = Buffer.from(originalText, 'utf-8');

    const encrypted = await cryptoService.encrypt(plaintext, metadata);

    // Attacker tries to unwrap this ciphertext under a different ownerId
    const tamperedMetadata: EncryptionBindingMetadata = {
      ...metadata,
      ownerId: 'attacker-owner-id',
    };

    await expect(cryptoService.decrypt(encrypted, tamperedMetadata)).rejects.toThrow(
      'ASSET_INTEGRITY_FAILED'
    );
  });

  it('fails closed if KMS envelope is corrupted', async () => {
    const originalText = 'Legal deed';
    const plaintext = Buffer.from(originalText, 'utf-8');

    const encrypted = await cryptoService.encrypt(plaintext, metadata);
    encrypted.wrappedDekBase64 = 'corrupted-wrapped-dek';

    await expect(cryptoService.decrypt(encrypted, metadata)).rejects.toThrow();
  });
});
