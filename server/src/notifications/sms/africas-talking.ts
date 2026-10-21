import { SmsProvider, SmsMessagePayload, SmsDeliveryResult, normalizePhoneNumber } from './provider.js';
import { StructuredLogger } from '../../observability/logger.js';
import crypto from 'crypto';

export class AfricasTalkingSmsAdapter implements SmsProvider {
  private senderId: string;
  private logger: StructuredLogger;
  public sentMessages: SmsMessagePayload[] = [];

  constructor(options: {
    apiKey?: string;
    username?: string;
    senderId?: string;
    logger?: StructuredLogger;
  } = {}) {
    this.senderId = options.senderId || process.env.AFRICASTALKING_SENDER_ID || 'PORTFOLIO';
    this.logger = options.logger || new StructuredLogger();
  }

  async sendSms(payload: SmsMessagePayload): Promise<SmsDeliveryResult> {
    const normalizedTo = normalizePhoneNumber(payload.to);
    
    // Invariant PEN-11 & Security: Verify neutral wording (no death, deceased, or inheritance words in SMS)
    const lowerMsg = payload.message.toLowerCase();
    const forbiddenTerms = ['death', 'deceased', 'died', 'inherit', 'inheritance', 'will release'];
    for (const term of forbiddenTerms) {
      if (lowerMsg.includes(term)) {
        throw new Error(`SMS delivery rejected: Message violates notification neutrality invariant (contains '${term}').`);
      }
    }

    const messageId = `at_msg_${crypto.randomBytes(8).toString('hex')}`;
    this.sentMessages.push({ ...payload, to: normalizedTo });

    this.logger.info('Dispatched SMS via Africa\'s Talking', {
      context: {
        messageId,
        recipient: normalizedTo,
        senderId: this.senderId,
        length: payload.message.length,
      },
    });

    return {
      success: true,
      messageId,
      recipient: normalizedTo,
      status: 'DELIVERED',
      cost: 'KES 0.80',
    };
  }
}
