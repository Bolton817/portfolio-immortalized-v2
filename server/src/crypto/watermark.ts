/**
 * Forensic Derivative Watermarking Service (OD-19)
 * In accordance with Open Decision OD-19 and Hong Kong Evidence Ordinance (Cap. 160):
 * Injects recipient-bound forensic metadata stamps on the fly when authorized beneficiaries
 * access released assets.
 * 
 * CRITICAL SAFETY INVARIANT:
 * Original ciphertext stored in the private vault remains immutable and untouched at rest.
 */

import * as crypto from 'crypto';
import { WatermarkDescriptor } from '@portfolio-immortalized/domain';

export class WatermarkService {
  private masterWatermarkSecret: string;

  constructor(secret: string = process.env.WATERMARK_SECRET || 'immortalized-watermark-salt-key-2026') {
    this.masterWatermarkSecret = secret;
  }

  /**
   * Generates a tamper-evident HMAC forensic hash binding recipient, grant, and release time
   */
  generateForensicHash(recipientEmail: string, grantId: string, releasedAt: Date): string {
    const raw = `${recipientEmail.toLowerCase().trim()}:${grantId}:${releasedAt.toISOString()}`;
    return crypto
      .createHmac('sha256', this.masterWatermarkSecret)
      .update(raw)
      .digest('hex');
  }

  /**
   * Creates a standardized textual forensic stamp
   */
  generateForensicStamp(descriptor: WatermarkDescriptor): { headerStamp: string; forensicHash: string } {
    const forensicHash = descriptor.forensicHash || this.generateForensicHash(
      descriptor.recipientEmail,
      descriptor.grantId,
      descriptor.releasedAt
    );

    const dateStr = descriptor.releasedAt.toISOString();
    const jurisdiction = descriptor.jurisdiction || 'Hong Kong SAR (Cap. 160 Evidence Ordinance)';

    const headerStamp = [
      '================================================================================',
      'CONFIDENTIAL & RESTRICTED — PORTFOLIO IMMORTALIZED ESTATE RELEASE',
      `Authorized Recipient : ${descriptor.recipientName} <${descriptor.recipientEmail}>`,
      `Release Grant ID     : ${descriptor.grantId}`,
      `Release Timestamp    : ${dateStr}`,
      `Legal Jurisdiction   : ${jurisdiction}`,
      `Forensic Trace Hash  : ${forensicHash}`,
      descriptor.customNotice ? `Notice               : ${descriptor.customNotice}` : '',
      '================================================================================',
    ]
      .filter(Boolean)
      .join('\n');

    return { headerStamp, forensicHash };
  }

  /**
   * Statically stamps UTF-8 text documents with forensic derivative headers & trailers
   */
  applyWatermarkToText(text: string, descriptor: WatermarkDescriptor): string {
    const { headerStamp, forensicHash } = this.generateForensicStamp(descriptor);

    const trailer = [
      '',
      '--- [END OF RELEASED MATERIAL] ---',
      `Forensic Verification Hash: ${forensicHash}`,
      `Unauthorized reproduction, tampering or distribution is traceable and prohibited under Cap. 160.`,
    ].join('\n');

    return `${headerStamp}\n\n${text}\n${trailer}\n`;
  }

  /**
   * Injects forensic watermarking into asset byte buffers without altering original vault records
   */
  applyWatermarkToBuffer(
    originalBuffer: Buffer,
    mimeType: string,
    descriptor: WatermarkDescriptor
  ): Buffer {
    const isTextual =
      mimeType.startsWith('text/') ||
      mimeType.includes('json') ||
      mimeType.includes('csv') ||
      mimeType.includes('xml') ||
      mimeType.includes('markdown');

    if (isTextual) {
      const text = originalBuffer.toString('utf8');
      const watermarked = this.applyWatermarkToText(text, descriptor);
      return Buffer.from(watermarked, 'utf8');
    }

    // For binary streams (PDF, images, binary blobs), append a forensic metadata trailer chunk
    const { headerStamp, forensicHash } = this.generateForensicStamp(descriptor);
    const forensicMetadataChunk = Buffer.from(
      `\n\n%%PORTFOLIO_IMMORTALIZED_FORENSIC_METADATA%%\n${headerStamp}\n%%FORENSIC_HASH:${forensicHash}%%\n`,
      'utf8'
    );

    return Buffer.concat([originalBuffer, forensicMetadataChunk]);
  }

  /**
   * Verifies that a forensic trace hash matches the recipient and grant
   */
  verifyForensicHash(
    recipientEmail: string,
    grantId: string,
    releasedAt: Date,
    providedHash: string
  ): boolean {
    const expected = this.generateForensicHash(recipientEmail, grantId, releasedAt);
    return expected === providedHash.trim().toLowerCase();
  }
}
