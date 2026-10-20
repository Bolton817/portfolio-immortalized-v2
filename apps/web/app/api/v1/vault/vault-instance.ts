import * as crypto from 'crypto';
import {
  VaultDal,
  makeUserId,
  AssetType,
  AssetSensitivity,
} from '@portfolio-immortalized/server';

export const defaultVaultOwnerId = makeUserId('usr_owner_demo');
export const vaultDal = new VaultDal();

// Seed initial demonstrative assets for development & showcase
(async () => {
  try {
    const willContent = Buffer.from('%PDF-1.7 Sample Last Will & Testament with Executor Directions');
    const willSha = crypto.createHash('sha256').update(willContent).digest('hex');
    const willIntent = await vaultDal.createUploadIntent(defaultVaultOwnerId, {
      fileName: 'Last_Will_and_Testament_2026.pdf',
      declaredMimeType: 'application/pdf',
      declaredSizeBytes: willContent.length,
      assetType: AssetType.WILL,
      sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
    });
    await vaultDal.commitUpload(
      defaultVaultOwnerId,
      willIntent.assetId,
      1,
      willContent,
      willSha,
      'application/pdf'
    );

    const titleDeedContent = Buffer.from('%PDF-1.7 Land Title Deed - LR No 209/12345 Nairobi');
    const titleSha = crypto.createHash('sha256').update(titleDeedContent).digest('hex');
    const titleIntent = await vaultDal.createUploadIntent(defaultVaultOwnerId, {
      fileName: 'Title_Deed_Karen_Property.pdf',
      declaredMimeType: 'application/pdf',
      declaredSizeBytes: titleDeedContent.length,
      assetType: AssetType.DOCUMENT,
      sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
    });
    await vaultDal.commitUpload(
      defaultVaultOwnerId,
      titleIntent.assetId,
      1,
      titleDeedContent,
      titleSha,
      'application/pdf'
    );
  } catch {
    // Initializer catches duplicates or hot reloads gracefully
  }
})();
