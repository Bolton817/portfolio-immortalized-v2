/**
 * Notification, Outbox, and Forensic Watermarking Domain Types
 * References: TDD Chapter 10.4, 24; Blueprint POL-01, REL-001, OD-18, OD-19
 */

export enum NotificationEventType {
  TRUSTEE_INVITATION = 'TRUSTEE_INVITATION',
  INACTIVITY_OWNER_REMINDER = 'INACTIVITY_OWNER_REMINDER',
  INACTIVITY_OWNER_INQUIRY = 'INACTIVITY_OWNER_INQUIRY',
  INACTIVITY_TRUSTEE_ALERT = 'INACTIVITY_TRUSTEE_ALERT',
  DEATH_CASE_STATUS_ALERT = 'DEATH_CASE_STATUS_ALERT',
  RELEASE_GRANT_AVAILABLE = 'RELEASE_GRANT_AVAILABLE',
  EMERGENCY_HOLD_NOTIFICATION = 'EMERGENCY_HOLD_NOTIFICATION',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
}

export enum NotificationUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface DeviceTokenRecord {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceModel?: string;
  appVersion?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MultiChannelNotificationRequest {
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  eventType: NotificationEventType;
  urgency: NotificationUrgency;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

export enum OutboxEventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
}

export interface WatermarkDescriptor {
  recipientName: string;
  recipientEmail: string;
  grantId: string;
  releasedAt: Date;
  jurisdiction: string;
  forensicHash: string;
  customNotice?: string;
}

export interface BaseNotificationPayload {
  recipientEmail: string;
  recipientName?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface TrusteeInvitationNotificationPayload extends BaseNotificationPayload {
  ownerName: string;
  actionUrl: string;
  expiresAtIso: string;
}

export interface InactivityNoticePayload extends BaseNotificationPayload {
  stage: 'REMINDER_75D' | 'INQUIRY_90D' | 'TRUSTEE_ALERT_104D';
  lastActivityIso: string;
  actionUrl: string;
}

export interface ReleaseGrantNotificationPayload extends BaseNotificationPayload {
  grantId: string;
  ownerName: string;
  actionUrl: string;
  expiresAtIso: string;
  assetCount: number;
}

export interface EmergencyHoldNotificationPayload extends BaseNotificationPayload {
  caseId?: string;
  reasonCode: string;
  narrative: string;
}

export interface DeathCaseStatusAlertPayload extends BaseNotificationPayload {
  caseId: string;
  previousState: string;
  newState: string;
  actionUrl?: string;
}
