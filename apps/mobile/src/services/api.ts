/**
 * Configured API Client for Mobile Application
 * Automatically retrieves and binds authenticated session tokens from MobileAuthService (SecureStore).
 */

import { PortfolioApiClient } from '@portfolio-immortalized/api-client';
import { mobileAuth } from './auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.portfolio-immortalized.co.ke';

export const mobileApiClient = new PortfolioApiClient({
  baseUrl: API_BASE_URL,
  getAuthToken: async () => {
    return mobileAuth.getToken();
  },
});
