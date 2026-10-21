import { describe, it, expect, beforeEach } from 'vitest';
import {
  NotificationUrgency,
  NotificationChannel,
  MultiChannelNotificationRequest,
} from '@portfolio-immortalized/domain';
import { normalizePhoneNumber } from '../src/notifications/sms/provider.js';
import { AfricasTalkingSmsAdapter } from '../src/notifications/sms/africas-talking.js';
import { TwilioSmsAdapter } from '../src/notifications/sms/twilio.js';
import { ExpoPushAdapter } from '../src/notifications/push/expo-push.js';
import { DeviceTokenDal } from '../src/dal/device-token-dal.js';
import { MultiChannelNotificationDispatcher } from '../src/notifications/dispatcher.js';
import { AuditService } from '../src/audit/logger.js';

describe('Multi-Channel Notification Gateway & Telephony (Stage 11)', () => {
  let auditService: AuditService;
  let tokenDal: DeviceTokenDal;
  let atAdapter: AfricasTalkingSmsAdapter;
  let twilioAdapter: TwilioSmsAdapter;
  let pushAdapter: ExpoPushAdapter;
  let dispatcher: MultiChannelNotificationDispatcher;

  beforeEach(() => {
    auditService = new AuditService();
    tokenDal = new DeviceTokenDal(auditService);
    atAdapter = new AfricasTalkingSmsAdapter();
    twilioAdapter = new TwilioSmsAdapter();
    pushAdapter = new ExpoPushAdapter();
    dispatcher = new MultiChannelNotificationDispatcher({
      localSmsProvider: atAdapter,
      internationalSmsProvider: twilioAdapter,
      pushProvider: pushAdapter,
      tokenDal,
      auditService,
    });
  });

  describe('Phone Number Normalization', () => {
    it('normalizes Kenyan local 07xx numbers to +254 E.164 format', () => {
      expect(normalizePhoneNumber('0712345678')).toBe('+254712345678');
    });

    it('normalizes Kenyan 01xx numbers to +254 E.164 format', () => {
      expect(normalizePhoneNumber('0112345678')).toBe('+254112345678');
    });

    it('normalizes numbers with 254 prefix without plus', () => {
      expect(normalizePhoneNumber('254712345678')).toBe('+254712345678');
    });

    it('preserves valid +254 international format', () => {
      expect(normalizePhoneNumber('+254712345678')).toBe('+254712345678');
    });

    it('strips whitespaces, parentheses, and dashes', () => {
      expect(normalizePhoneNumber(' (0712) 345-678 ')).toBe('+254712345678');
    });

    it('preserves non-Kenyan international numbers starting with +', () => {
      expect(normalizePhoneNumber('+14155552671')).toBe('+14155552671');
      expect(normalizePhoneNumber('+447911123456')).toBe('+447911123456');
    });
  });

  describe('Africa\'s Talking SMS Adapter', () => {
    it('dispatches neutral SMS messages successfully', async () => {
      const result = await atAdapter.sendSms({
        to: '0712345678',
        message: 'Security Notice: Please confirm your account activity at portfolioimmortalized.com',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('DELIVERED');
      expect(result.recipient).toBe('+254712345678');
      expect(result.messageId).toContain('at_msg_');
      expect(atAdapter.sentMessages).toHaveLength(1);
    });

    it('rejects SMS messages containing non-neutral forbidden terms (PEN-11)', async () => {
      const forbiddenSamples = [
        'Notice regarding deceased estate inheritance',
        'Notification of death verification',
        'Your relative has died',
        'Will release process initiated',
      ];

      for (const sample of forbiddenSamples) {
        await expect(
          atAdapter.sendSms({
            to: '0712345678',
            message: sample,
          })
        ).rejects.toThrow(/violates notification neutrality invariant/);
      }
    });
  });

  describe('Twilio SMS Adapter', () => {
    it('dispatches international SMS messages successfully', async () => {
      const result = await twilioAdapter.sendSms({
        to: '+14155552671',
        message: 'Security Verification: A sign-in was requested from Nairobi, Kenya.',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('DELIVERED');
      expect(result.recipient).toBe('+14155552671');
      expect(result.messageId).toContain('tw_msg_');
      expect(twilioAdapter.sentMessages).toHaveLength(1);
    });

    it('rejects international SMS messages with non-neutral wording', async () => {
      await expect(
        twilioAdapter.sendSms({
          to: '+14155552671',
          message: 'Estate notice: Inherited funds available',
        })
      ).rejects.toThrow(/violates notification neutrality invariant/);
    });
  });

  describe('Expo Push Notification Provider', () => {
    it('sends push notifications to valid Exponent push tokens', async () => {
      const result = await pushAdapter.sendPush({
        to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        title: 'Security Alert',
        body: 'Please verify your active session.',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('SENT');
      expect(result.ticketId).toContain('ticket_');
      expect(pushAdapter.sentMessages).toHaveLength(1);
    });

    it('rejects push dispatch for malformed push tokens', async () => {
      const result = await pushAdapter.sendPush({
        to: 'short_invalid',
        title: 'Alert',
        body: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('DEVICE_UNREGISTERED');
      expect(result.errorMessage).toBe('Invalid push token format');
    });
  });

  describe('DeviceTokenDal', () => {
    it('registers a device token and deactivates duplicate existing tokens', async () => {
      const userA = { userId: 'user_owner_01' };

      const tok1 = await tokenDal.registerToken(userA, {
        token: 'ExponentPushToken[device_abc_1234567890]',
        platform: 'android',
        deviceModel: 'Samsung Galaxy S23',
      });

      expect(tok1.isActive).toBe(true);
      expect(tok1.userId).toBe('user_owner_01');

      const activeBefore = await tokenDal.getActiveTokensForUser('user_owner_01');
      expect(activeBefore).toHaveLength(1);

      // Re-register exact same token
      const tok2 = await tokenDal.registerToken(userA, {
        token: 'ExponentPushToken[device_abc_1234567890]',
        platform: 'android',
        deviceModel: 'Samsung Galaxy S23 Ultra',
      });

      const activeAfter = await tokenDal.getActiveTokensForUser('user_owner_01');
      expect(activeAfter).toHaveLength(1);
      expect(activeAfter[0]!.id).toBe(tok2.id);
    });

    it('allows deactivating a device token', async () => {
      const user = { userId: 'user_owner_02' };
      const tok = await tokenDal.registerToken(user, {
        token: 'ExponentPushToken[device_xyz_9876543210]',
        platform: 'ios',
      });

      const deactivated = await tokenDal.deactivateToken(user, tok.id);
      expect(deactivated).toBe(true);

      const active = await tokenDal.getActiveTokensForUser('user_owner_02');
      expect(active).toHaveLength(0);
    });
  });

  describe('MultiChannelNotificationDispatcher', () => {
    it('dispatches across Push, Email, SMS, and In-App for CRITICAL urgency with Kenyan number', async () => {
      const userId = 'usr_kenya_owner';
      await tokenDal.registerToken(
        { userId },
        { token: 'ExponentPushToken[kenya_phone_token_12345]', platform: 'android' }
      );

      const req: MultiChannelNotificationRequest = {
        recipientId: userId,
        recipientEmail: 'owner@example.com',
        recipientPhone: '0712345678',
        eventType: 'INACTIVITY_WARNING_STAGE_1',
        urgency: NotificationUrgency.CRITICAL,
        title: 'Action Required',
        body: 'Please confirm your active status in Portfolio Immortalized.',
      };

      const summary = await dispatcher.dispatch(req);

      expect(summary.recipientId).toBe(userId);
      expect(summary.channelsDelivered).toContain(NotificationChannel.PUSH);
      expect(summary.channelsDelivered).toContain(NotificationChannel.EMAIL);
      expect(summary.channelsDelivered).toContain(NotificationChannel.SMS);
      expect(summary.channelsDelivered).toContain(NotificationChannel.IN_APP);
      expect(summary.errors).toHaveLength(0);

      // Verify Africa's Talking was used for 0712345678
      expect(atAdapter.sentMessages).toHaveLength(1);
      expect(atAdapter.sentMessages[0]!.to).toBe('+254712345678');
      expect(twilioAdapter.sentMessages).toHaveLength(0);
    });

    it('routes international numbers to Twilio SMS adapter for HIGH urgency', async () => {
      const userId = 'usr_intl_owner';

      const req: MultiChannelNotificationRequest = {
        recipientId: userId,
        recipientPhone: '+14155552671',
        eventType: 'TRUSTEE_VERIFICATION_ALERT',
        urgency: NotificationUrgency.HIGH,
        title: 'Security Alert',
        body: 'Trustee nomination confirmation is required.',
      };

      const summary = await dispatcher.dispatch(req);

      expect(summary.channelsDelivered).toContain(NotificationChannel.SMS);
      expect(twilioAdapter.sentMessages).toHaveLength(1);
      expect(twilioAdapter.sentMessages[0]!.to).toBe('+14155552671');
      expect(atAdapter.sentMessages).toHaveLength(0);
    });

    it('only records IN_APP for LOW urgency notifications (no push, no sms, no email)', async () => {
      const userId = 'usr_quiet_user';
      await tokenDal.registerToken(
        { userId },
        { token: 'ExponentPushToken[quiet_token_1234567890]', platform: 'ios' }
      );

      const req: MultiChannelNotificationRequest = {
        recipientId: userId,
        recipientEmail: 'quiet@example.com',
        recipientPhone: '0722000000',
        eventType: 'MONTHLY_SUMMARY',
        urgency: NotificationUrgency.LOW,
        title: 'Monthly Summary Available',
        body: 'Your monthly report has been generated.',
      };

      const summary = await dispatcher.dispatch(req);

      expect(summary.channelsDelivered).toEqual([NotificationChannel.IN_APP]);
      expect(atAdapter.sentMessages).toHaveLength(0);
      expect(twilioAdapter.sentMessages).toHaveLength(0);
      expect(pushAdapter.sentMessages).toHaveLength(0);
    });
  });
});
