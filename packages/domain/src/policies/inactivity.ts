/**
 * Definition of owner activity event categories and eligibility under Inactivity Policy.
 * Reference: TDD Chapter 11.1
 */

export const QUALIFYING_MEANINGFUL_ACTIVITY_TYPES = [
  'AUTH_LOGIN_SUCCESS',
  'AUTH_PASSKEY_VERIFIED',
  'SETTINGS_SECURITY_UPDATED',
  'VAULT_UPLOAD_COMMITTED',
  'VAULT_METADATA_UPDATED',
  'PEOPLE_RELATIONSHIP_UPDATED',
  'LEGACY_PLAN_CONFIRMED',
] as const;

export type MeaningfulActivityType = (typeof QUALIFYING_MEANINGFUL_ACTIVITY_TYPES)[number];

export const DISQUALIFIED_ACTIVITY_TYPES = [
  'APP_LAUNCH_PASSIVE',
  'BACKGROUND_TOKEN_REFRESH',
  'NOTIFICATION_RECEIVED',
  'NOTIFICATION_OPENED',
  'EMAIL_OPEN_TRACKER',
  'ANALYTICS_PING',
  'DEVICE_ONLINE_HEARTBEAT',
] as const;

export interface InactivityPolicyConfig {
  policyVersion: string;
  reminderDays: number;     // e.g. 75 days
  thresholdDays: number;    // e.g. 90 days
  gracePeriodDays: number;  // e.g. 14 days
}

export const DEFAULT_INACTIVITY_POLICY: InactivityPolicyConfig = {
  policyVersion: 'inactivity-v1-ke',
  reminderDays: 75,
  thresholdDays: 90,
  gracePeriodDays: 14,
};

export type InactivityEvaluationStatus =
  | 'ACTIVE'
  | 'REMINDER_DUE'
  | 'THRESHOLD_REACHED'
  | 'GRACE_PERIOD_EXPIRED';

/**
 * Evaluates whether an event is accepted as meaningful owner activity.
 */
export function isMeaningfulActivity(eventType: string): boolean {
  return QUALIFYING_MEANINGFUL_ACTIVITY_TYPES.includes(eventType as MeaningfulActivityType);
}

/**
 * Pure function evaluating inactivity status against the configured policy.
 */
export function evaluateInactivityStatus(
  lastMeaningfulActivityAt: Date,
  evaluationTime: Date = new Date(),
  policy: InactivityPolicyConfig = DEFAULT_INACTIVITY_POLICY
): {
  status: InactivityEvaluationStatus;
  daysInactive: number;
  shouldSendReminder: boolean;
  shouldOpenInvestigation: boolean;
} {
  const diffMs = evaluationTime.getTime() - lastMeaningfulActivityAt.getTime();
  const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysInactive >= policy.thresholdDays + policy.gracePeriodDays) {
    return {
      status: 'GRACE_PERIOD_EXPIRED',
      daysInactive,
      shouldSendReminder: false,
      shouldOpenInvestigation: true,
    };
  }

  if (daysInactive >= policy.thresholdDays) {
    return {
      status: 'THRESHOLD_REACHED',
      daysInactive,
      shouldSendReminder: true,
      shouldOpenInvestigation: false,
    };
  }

  if (daysInactive >= policy.reminderDays) {
    return {
      status: 'REMINDER_DUE',
      daysInactive,
      shouldSendReminder: true,
      shouldOpenInvestigation: false,
    };
  }

  return {
    status: 'ACTIVE',
    daysInactive,
    shouldSendReminder: false,
    shouldOpenInvestigation: false,
  };
}
