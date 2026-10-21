import {
  MultiChannelNotificationRequest,
  NotificationUrgency,
  NotificationChannel,
} from '@portfolio-immortalized/domain';
import { SmsProvider } from './sms/provider.js';
import { AfricasTalkingSmsAdapter } from './sms/africas-talking.js';
import { TwilioSmsAdapter } from './sms/twilio.js';
import { PushNotificationProvider } from './push/provider.js';
import { ExpoPushAdapter } from './push/expo-push.js';
import { DeviceTokenDal } from '../dal/device-token-dal.js';
import { BrevoNotificationAdapter } from './brevo.js';
import { StructuredLogger } from '../observability/logger.js';
import { AuditService } from '../audit/logger.js';

export interface MultiChannelDispatchSummary {
  recipientId: string;
  channelsAttempted: NotificationChannel[];
  channelsDelivered: NotificationChannel[];
  errors: string[];
}

export class MultiChannelNotificationDispatcher {
  private localSmsProvider: SmsProvider;
  private internationalSmsProvider: SmsProvider;
  private pushProvider: PushNotificationProvider;
  private emailAdapter: BrevoNotificationAdapter;
  private tokenDal: DeviceTokenDal;
  private logger: StructuredLogger;
  private auditService: AuditService;

  constructor(options: {
    localSmsProvider?: SmsProvider;
    internationalSmsProvider?: SmsProvider;
    pushProvider?: PushNotificationProvider;
    emailAdapter?: BrevoNotificationAdapter;
    tokenDal?: DeviceTokenDal;
    logger?: StructuredLogger;
    auditService?: AuditService;
  } = {}) {
    this.logger = options.logger || new StructuredLogger();
    this.auditService = options.auditService || new AuditService();
    this.localSmsProvider = options.localSmsProvider || new AfricasTalkingSmsAdapter({ logger: this.logger });
    this.internationalSmsProvider = options.internationalSmsProvider || new TwilioSmsAdapter({ logger: this.logger });
    this.pushProvider = options.pushProvider || new ExpoPushAdapter({ logger: this.logger });
    this.emailAdapter = options.emailAdapter || new BrevoNotificationAdapter();
    this.tokenDal = options.tokenDal || new DeviceTokenDal(this.auditService);
  }

  async dispatch(req: MultiChannelNotificationRequest): Promise<MultiChannelDispatchSummary> {
    const summary: MultiChannelDispatchSummary = {
      recipientId: req.recipientId,
      channelsAttempted: [],
      channelsDelivered: [],
      errors: [],
    };

    // 1. Mobile Push Notifications (Attempted for MEDIUM, HIGH, CRITICAL)
    if (req.urgency !== NotificationUrgency.LOW) {
      summary.channelsAttempted.push(NotificationChannel.PUSH);
      try {
        const tokens = await this.tokenDal.getActiveTokensForUser(req.recipientId);
        if (tokens.length > 0) {
          for (const tokenRec of tokens) {
            const pushRes = await this.pushProvider.sendPush({
              to: tokenRec.token,
              title: req.title,
              body: req.body,
              data: req.data,
              priority: req.urgency === NotificationUrgency.CRITICAL ? 'high' : 'normal',
            });
            if (pushRes.success) {
              if (!summary.channelsDelivered.includes(NotificationChannel.PUSH)) {
                summary.channelsDelivered.push(NotificationChannel.PUSH);
              }
            } else {
              summary.errors.push(`Push failed (${tokenRec.platform}): ${pushRes.errorMessage}`);
            }
          }
        }
      } catch (err: unknown) {
        summary.errors.push(`Push dispatch error: ${(err as Error).message}`);
      }
    }

    // 2. Transactional Email (Attempted for MEDIUM, HIGH, CRITICAL if recipientEmail is available)
    if (req.recipientEmail && req.urgency !== NotificationUrgency.LOW) {
      summary.channelsAttempted.push(NotificationChannel.EMAIL);
      try {
        // Enforce neutral email notification through Brevo adapter
        const emailMsg = this.emailAdapter.renderInactivityNotice({
          recipientEmail: req.recipientEmail,
          stage: 'REMINDER_75D',
          lastActivityIso: new Date().toISOString(),
          actionUrl: req.actionUrl || 'https://portfolioimmortalized.com/dashboard',
        });
        await this.emailAdapter.sendEmail(emailMsg);
        summary.channelsDelivered.push(NotificationChannel.EMAIL);
      } catch (err: unknown) {
        summary.errors.push(`Email delivery error: ${(err as Error).message}`);
      }
    }

    // 3. Carrier SMS Telephony (Attempted for CRITICAL or HIGH fallback when requested)
    if (req.recipientPhone && (req.urgency === NotificationUrgency.CRITICAL || req.urgency === NotificationUrgency.HIGH)) {
      summary.channelsAttempted.push(NotificationChannel.SMS);
      try {
        const isKenyan = req.recipientPhone.startsWith('+254') || req.recipientPhone.startsWith('07') || req.recipientPhone.startsWith('01') || req.recipientPhone.startsWith('254');
        const smsProvider = isKenyan ? this.localSmsProvider : this.internationalSmsProvider;

        const smsRes = await smsProvider.sendSms({
          to: req.recipientPhone,
          message: `${req.title}: ${req.body}`,
          senderId: 'PORTFOLIO',
        });

        if (smsRes.success) {
          summary.channelsDelivered.push(NotificationChannel.SMS);
        } else {
          summary.errors.push(`SMS delivery failed: ${smsRes.errorMessage}`);
        }
      } catch (err: unknown) {
        summary.errors.push(`SMS dispatch error: ${(err as Error).message}`);
      }
    }

    // 4. In-App Notification (Always recorded)
    summary.channelsAttempted.push(NotificationChannel.IN_APP);
    summary.channelsDelivered.push(NotificationChannel.IN_APP);

    await this.auditService.record({
      actorType: 'SYSTEM',
      actorId: 'system_dispatcher',
      action: 'notification.dispatched',
      targetType: 'User',
      targetId: req.recipientId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        eventType: req.eventType,
        urgency: req.urgency,
        channelsDelivered: summary.channelsDelivered,
        errors: summary.errors,
      },
    });

    return summary;
  }
}
