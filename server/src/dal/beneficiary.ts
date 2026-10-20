/**
 * Beneficiary Delivery & Forensic Access DAL
 * References: TDD Chapter 12; Blueprint POL-01, REL-001, OD-19
 */

import * as crypto from 'crypto';
import {
  ReleaseGrantStatus,
  WatermarkDescriptor,
} from '@portfolio-immortalized/domain';
import { ReleaseService, ReleaseGrantRecord } from '../services/release.js';
import { VaultDal } from './vault.js';
import { WatermarkService } from '../crypto/watermark.js';
import { AuditService } from '../audit/logger.js';
import { DalAuthorizationError } from './tenancy.js';

export interface BeneficiarySessionPayload {
  grantId: string;
  beneficiaryId: string;
  email: string;
  name: string;
  expiresAt: number;
}

export interface BeneficiaryGrantSummary {
  id: string;
  caseId: string;
  status: string;
  expiresAt: string;
  ownerName: string;
  assets: Array<{
    id: string;
    assetId: string;
    title: string;
    assetType: string;
    fileSizeBytes: number;
    mimeType: string;
  }>;
}

export class BeneficiaryDal {
  private releaseService: ReleaseService;
  private vaultDal: VaultDal;
  private watermarkService: WatermarkService;
  private auditService: AuditService;
  private sessionSecret: string;

  constructor(
    releaseService: ReleaseService,
    vaultDal: VaultDal,
    watermarkService: WatermarkService = new WatermarkService(),
    auditService: AuditService = new AuditService(),
    sessionSecret: string = process.env.BENEFICIARY_SECRET || 'immortalized-beneficiary-auth-salt'
  ) {
    this.releaseService = releaseService;
    this.vaultDal = vaultDal;
    this.watermarkService = watermarkService;
    this.auditService = auditService;
    this.sessionSecret = sessionSecret;
  }

  /**
   * Verifies an inbound recipient action token against active release grants (WEB-BEN-01)
   */
  async verifyRecipientToken(
    token: string,
    email: string,
    nationalIdLast4?: string
  ): Promise<{
    verified: boolean;
    sessionGrantToken: string;
    beneficiary: { id: string; name: string; email: string };
  }> {
    const trimmedToken = token.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Query active grants matching token or email
    const allGrants = await this.releaseService.listGrantsForBeneficiary({ email: normalizedEmail });
    const matchingGrant = allGrants.find(
      (g) => g.accessToken === trimmedToken || (g.beneficiaryEmail && g.beneficiaryEmail.toLowerCase() === normalizedEmail)
    );

    if (!matchingGrant) {
      // Also search all grants directly by access token if email wasn't recorded at issuance
      let fallbackGrant: ReleaseGrantRecord | undefined;
      // Accessing internal grants for token validation
      const internalGrants = (this.releaseService as unknown as { grants: Map<string, ReleaseGrantRecord> }).grants;
      if (internalGrants) {
        for (const g of internalGrants.values()) {
          if (g.accessToken === trimmedToken && g.status === ReleaseGrantStatus.ACTIVE) {
            fallbackGrant = g;
            break;
          }
        }
      }

      if (!fallbackGrant) {
        throw new DalAuthorizationError(
          'INVALID_BENEFICIARY_TOKEN',
          'The provided verification token is invalid or has expired.',
          401
        );
      }

      // Bind email to the grant
      fallbackGrant.beneficiaryEmail = normalizedEmail;
      return this.createSessionResponse(fallbackGrant, normalizedEmail, nationalIdLast4);
    }

    return this.createSessionResponse(matchingGrant, normalizedEmail, nationalIdLast4);
  }

  private createSessionResponse(
    grant: ReleaseGrantRecord,
    email: string,
    _nationalIdLast4?: string
  ): {
    verified: boolean;
    sessionGrantToken: string;
    beneficiary: { id: string; name: string; email: string };
  } {
    const emailPrefix = email.split('@')[0] ?? 'beneficiary';
    const recipientName = grant.beneficiaryName || emailPrefix.replace(/[._]/g, ' ') || 'Authorized Beneficiary';
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24-hour delivery session

    const payload: BeneficiarySessionPayload = {
      grantId: grant.id,
      beneficiaryId: grant.beneficiaryId,
      email,
      name: recipientName,
      expiresAt,
    };

    const sessionGrantToken = this.signSessionPayload(payload);

    return {
      verified: true,
      sessionGrantToken,
      beneficiary: {
        id: grant.beneficiaryId,
        name: recipientName,
        email,
      },
    };
  }

  /**
   * Signs a short-lived beneficiary session payload with HMAC-SHA256
   */
  signSessionPayload(payload: BeneficiarySessionPayload): string {
    const raw = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(raw)
      .digest('base64url');
    return `bensess_${raw}.${signature}`;
  }

  /**
   * Verifies and decodes a beneficiary session grant token
   */
  verifySessionToken(token: string): BeneficiarySessionPayload {
    if (!token.startsWith('bensess_')) {
      throw new DalAuthorizationError('INVALID_SESSION_TOKEN', 'Malformed beneficiary session token', 401);
    }

    const [raw, signature] = token.substring('bensess_'.length).split('.');
    if (!raw || !signature) {
      throw new DalAuthorizationError('INVALID_SESSION_TOKEN', 'Malformed beneficiary session token parts', 401);
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(raw)
      .digest('base64url');

    if (expectedSignature !== signature) {
      throw new DalAuthorizationError('INVALID_SESSION_SIGNATURE', 'Session token signature mismatch', 401);
    }

    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as BeneficiarySessionPayload;
    if (Date.now() > payload.expiresAt) {
      throw new DalAuthorizationError('SESSION_EXPIRED', 'Beneficiary session has expired. Please verify again.', 401);
    }

    return payload;
  }

  /**
   * Lists only explicitly authorized grants and assets for a verified beneficiary (POL-01)
   */
  async listAuthorizedGrants(session: BeneficiarySessionPayload): Promise<BeneficiaryGrantSummary[]> {
    const activeGrants = await this.releaseService.listGrantsForBeneficiary({
      beneficiaryId: session.beneficiaryId as any,
      email: session.email,
    });

    const summaries: BeneficiaryGrantSummary[] = [];

    for (const grant of activeGrants) {
      const assetSummaries: BeneficiaryGrantSummary['assets'] = [];

      for (const assetId of grant.allocatedAssetIds) {
        try {
          const asset = await this.vaultDal.getAsset(grant.ownerId, assetId as any);
          const latestVersion = asset.versions[asset.versions.length - 1];

          assetSummaries.push({
            id: latestVersion?.id || assetId,
            assetId: asset.id,
            title: asset.title,
            assetType: asset.assetType,
            fileSizeBytes: latestVersion?.storageObject?.sizeBytes || 0,
            mimeType: latestVersion?.storageObject?.mimeType || 'application/octet-stream',
          });
        } catch {
          // If asset is retired or not found, skip gracefully
        }
      }

      summaries.push({
        id: grant.id,
        caseId: grant.caseId,
        status: grant.status,
        expiresAt: grant.expiresAt.toISOString(),
        ownerName: 'Estate of Protected Custody Owner',
        assets: assetSummaries,
      });
    }

    return summaries;
  }

  /**
   * Generates a recipient-watermarked derivative stream of an authorized asset (OD-19)
   */
  async getWatermarkedAsset(
    session: BeneficiarySessionPayload,
    grantId: string,
    assetId: string
  ): Promise<{
    buffer: Buffer;
    mimeType: string;
    filename: string;
    forensicHash: string;
  }> {
    const grant = await this.releaseService.getGrantById(grantId as any);

    // Validate that beneficiary owns this grant
    if (
      grant.beneficiaryId !== session.beneficiaryId &&
      grant.beneficiaryEmail.toLowerCase() !== session.email.toLowerCase()
    ) {
      throw new DalAuthorizationError(
        'ACCESS_DENIED',
        'You are not the designated recipient for this release grant.',
        403
      );
    }

    // Validate asset is allocated to this grant (POL-01)
    if (!grant.allocatedAssetIds.includes(assetId as any)) {
      throw new DalAuthorizationError(
        'ASSET_NOT_ALLOCATED',
        'This asset is not included in your legacy allocation.',
        403
      );
    }

    // Decrypt original plaintext from vault (original vault ciphertext untouched)
    const downloaded = await this.releaseService.downloadReleasedAsset(
      grant.id,
      session.email,
      assetId as any
    );

    const now = new Date();
    const descriptor: WatermarkDescriptor = {
      recipientName: session.name,
      recipientEmail: session.email,
      grantId: grant.id,
      releasedAt: now,
      jurisdiction: 'Hong Kong SAR (Cap. 160 Evidence Ordinance)',
      forensicHash: '',
      customNotice: grant.customInstructions || undefined,
    };

    descriptor.forensicHash = this.watermarkService.generateForensicHash(
      session.email,
      grant.id,
      now
    );

    // Dynamically apply derivative watermark
    const watermarkedBuffer = this.watermarkService.applyWatermarkToBuffer(
      downloaded.plaintext,
      downloaded.mimeType,
      descriptor
    );

    // Record forensic audit trace
    await this.auditService.record({
      actorType: 'BENEFICIARY',
      actorId: session.email,
      action: 'beneficiary.asset_downloaded',
      targetType: 'ReleaseGrantAsset',
      targetId: `${grantId}:${assetId}`,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        grantId,
        assetId,
        title: downloaded.title,
        forensicHash: descriptor.forensicHash,
        watermarkedSizeBytes: watermarkedBuffer.length,
      },
    });

    const safeTitle = (downloaded.title || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = `${safeTitle}_watermarked`;

    return {
      buffer: watermarkedBuffer,
      mimeType: downloaded.mimeType,
      filename: safeFilename,
      forensicHash: descriptor.forensicHash,
    };
  }
}
