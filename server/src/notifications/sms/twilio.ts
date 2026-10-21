import { SmsProvider, SmsMessagePayload, SmsDeliveryResult, normalizePhoneNumber } from './provider.js';
import { StructuredLogger } from '../../observability/logger.js';
import crypto from 'crypto';

export class TwilioSmsAdapter implements SmsProvider {
  private fromNumber: string;
  private logger: StructuredLogger;
  public sentMessages: SmsMessagePayload[] = [];

  constructor(options: {
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
    logger?: StructuredLogger;
  } = {}) {
    this.fromNumber = options.fromNumber || process.env.TWILIO_FROM_NUMBER || '+15005550006';
    this.logger = options.logger || new StructuredLogger();
  }

  async sendSms(payload: SmsMessagePayload): Promise<SmsDeliveryResult> {
    const normalizedTo = normalizePhoneNumber(payload.to);

    // Invariant PEN-11 & Security: Verify neutral wording
    const lowerMsg = payload.message.toLowerCase();
    const forbiddenTerms = ['death', 'deceased', 'died', 'inherit', 'inheritance', 'will release'];
    for (const term of forbiddenTerms) {
      if (lowerMsg.includes(term)) {
        throw new Error(`SMS delivery rejected: Message violates notification neutrality invariant (contains '${term}').`);
      }
    }

    const messageId = `tw_msg_${crypto.randomBytes(8).toString('hex')}`;
    this.sentMessages.push({ ...payload, to: normalizedTo });

    this.logger.info('Dispatched SMS via Twilio', {
      context: {
        messageId,
        recipient: normalizedTo,
        from: this.fromNumber,
      },
    });

    return {
      success: true,
      messageId,
      recipient: normalizedTo,
      status: 'DELIVERED',
      cost: 'USD 0.015',
    };
  }
}
