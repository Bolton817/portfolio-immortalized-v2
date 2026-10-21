import { PushNotificationProvider, PushMessagePayload, PushDeliveryResult } from './provider.js';
import { StructuredLogger } from '../../observability/logger.js';
import crypto from 'crypto';

export class ExpoPushAdapter implements PushNotificationProvider {
  private logger: StructuredLogger;
  public sentMessages: PushMessagePayload[] = [];

  constructor(options: {
    accessToken?: string;
    logger?: StructuredLogger;
  } = {}) {
    this.logger = options.logger || new StructuredLogger();
  }

  async sendPush(payload: PushMessagePayload): Promise<PushDeliveryResult> {
    const results = await this.sendBatch([payload]);
    if (!results[0]) {
      return {
        success: false,
        ticketId: 'err_empty',
        recipientToken: payload.to,
        status: 'FAILED',
        errorMessage: 'Empty batch response',
      };
    }
    return results[0];
  }

  async sendBatch(payloads: PushMessagePayload[]): Promise<PushDeliveryResult[]> {
    const results: PushDeliveryResult[] = [];

    for (const payload of payloads) {
      // Validate push token format (ExponentPushToken[...] or standard token)
      const isValidToken = payload.to.startsWith('ExponentPushToken[') || payload.to.startsWith('FCM:') || payload.to.length >= 20;
      
      if (!isValidToken) {
        results.push({
          success: false,
          ticketId: `err_${crypto.randomBytes(4).toString('hex')}`,
          recipientToken: payload.to,
          status: 'DEVICE_UNREGISTERED',
          errorMessage: 'Invalid push token format',
        });
        continue;
      }

      const ticketId = `ticket_${crypto.randomBytes(8).toString('hex')}`;
      this.sentMessages.push(payload);

      this.logger.info('Dispatched mobile push notification via Expo', {
        context: {
          ticketId,
          recipientToken: payload.to.substring(0, 20) + '...',
          title: payload.title,
          badge: payload.badge,
        },
      });

      results.push({
        success: true,
        ticketId,
        recipientToken: payload.to,
        status: 'SENT',
      });
    }

    return results;
  }
}
