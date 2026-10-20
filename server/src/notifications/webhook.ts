/**
 * Brevo Inbound Webhook Verification
 * Implements HMAC-SHA256 verification of incoming delivery and bounce status events.
 * Reference: TDD Chapter 10.4, Chapter 24
 */

import * as crypto from 'crypto';

export interface WebhookVerificationOptions {
  rawBody: string | Buffer;
  signatureHeader?: string | null;
  secret?: string;
}

/**
 * Verifies that an incoming webhook payload originated from Brevo using HMAC-SHA256.
 */
export function verifyBrevoWebhookSignature(options: WebhookVerificationOptions): boolean {
  const secret = options.secret || process.env.BREVO_WEBHOOK_SECRET;

  // In test or local development environments without an active secret, pass if mock
  if (!secret) {
    if (process.env.NODE_ENV === 'test' || !process.env.BREVO_API_KEY) {
      return true;
    }
    return false;
  }

  if (!options.signatureHeader) {
    return false;
  }

  try {
    const rawBuffer = Buffer.isBuffer(options.rawBody)
      ? options.rawBody
      : Buffer.from(options.rawBody, 'utf8');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBuffer)
      .digest('hex');

    const receivedSignature = options.signatureHeader.trim().toLowerCase();
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(receivedSignature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}
