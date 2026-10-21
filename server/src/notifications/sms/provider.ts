/**
 * SMS Provider Interface & Normalization Utilities
 * Reference: TDD Chapter 25, Appendix A (OD-08)
 */

export interface SmsMessagePayload {
  to: string; // E.164 normalized phone number e.g. +254712345678
  message: string;
  senderId?: string; // e.g. PORTFOLIO
  referenceId?: string;
}

export interface SmsDeliveryResult {
  success: boolean;
  messageId: string;
  recipient: string;
  status: 'DELIVERED' | 'QUEUED' | 'FAILED';
  cost?: string;
  errorMessage?: string;
}

export interface SmsProvider {
  sendSms(payload: SmsMessagePayload): Promise<SmsDeliveryResult>;
}

/**
 * Normalizes Kenyan and international phone numbers to strict E.164 format.
 * Examples:
 *   "0712345678" -> "+254712345678"
 *   "254712345678" -> "+254712345678"
 *   "+254712345678" -> "+254712345678"
 */
export function normalizePhoneNumber(raw: string): string {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+254${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
}
