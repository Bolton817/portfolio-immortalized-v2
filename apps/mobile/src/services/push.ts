import { Platform } from 'react-native';

export interface PushRegistrationResult {
  success: boolean;
  token?: string;
  error?: string;
}

export class MobilePushService {
  /**
   * Registers for remote push notifications and registers the token with backend API
   */
  async registerForPushNotificationsAsync(apiBaseUrl: string = 'http://localhost:3000'): Promise<PushRegistrationResult> {
    try {
      // In production with expo-notifications:
      // const { status } = await Notifications.requestPermissionsAsync();
      // const tokenData = await Notifications.getExpoPushTokenAsync();
      const simulatedToken = `ExponentPushToken[${Platform.OS}_${Math.random().toString(36).substring(2, 10)}]`;

      // Register with backend API
      const res = await fetch(`${apiBaseUrl}/api/v1/notifications/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'usr_mobile_owner',
        },
        body: JSON.stringify({
          token: simulatedToken,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceModel: Platform.OS === 'ios' ? 'iPhone 15 Pro' : 'Pixel 8',
          appVersion: '1.0.0',
        }),
      });

      if (!res.ok) {
        return { success: false, error: `Backend returned ${res.status}` };
      }

      return { success: true, token: simulatedToken };
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    }
  }
}

export const mobilePushService = new MobilePushService();
