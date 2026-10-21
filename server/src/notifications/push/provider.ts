/**
 * Push Notification Provider Interface
 * Reference: TDD Chapter 25, Appendix A (OD-08)
 */

export interface PushMessagePayload {
  to: string; // Expo push token or APNs/FCM device token e.g. ExponentPushToken[...]
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
}

export interface PushDeliveryResult {
  success: boolean;
  ticketId: string;
  recipientToken: string;
  status: 'SENT' | 'DEVICE_UNREGISTERED' | 'FAILED';
  errorMessage?: string;
}

export interface PushNotificationProvider {
  sendPush(payload: PushMessagePayload): Promise<PushDeliveryResult>;
  sendBatch(payloads: PushMessagePayload[]): Promise<PushDeliveryResult[]>;
}
