/**
 * Transactional Outbox Engine for Reliable Asynchronous Notification Dispatch
 * Reference: TDD Chapter 10.4, 24; Architecture ADR-008
 */

import {
  NotificationEventType,
  OutboxEventStatus,
  TrusteeInvitationNotificationPayload,
  InactivityNoticePayload,
  ReleaseGrantNotificationPayload,
  EmergencyHoldNotificationPayload,
  DeathCaseStatusAlertPayload,
} from '@portfolio-immortalized/domain';
import { BrevoNotificationAdapter } from './brevo.js';

export interface OutboxRecord {
  id: string;
  eventType: NotificationEventType;
  payload: unknown;
  status: OutboxEventStatus;
  attempts: number;
  deduplicationKey: string;
  nextAttemptAt: Date;
  createdAt: Date;
  updatedAt: Date;
  lastError?: string;
}

export interface OutboxProcessSummary {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

export class OutboxService {
  private records: Map<string, OutboxRecord> = new Map();
  private notificationAdapter: BrevoNotificationAdapter;

  constructor(adapter?: BrevoNotificationAdapter) {
    this.notificationAdapter = adapter || new BrevoNotificationAdapter({ isMock: true });
  }

  /**
   * Enqueues a notification into the outbox transactionally with deduplication.
   */
  async enqueue(
    eventType: NotificationEventType,
    payload: unknown,
    deduplicationKey: string,
    initialDelaySeconds: number = 0
  ): Promise<OutboxRecord> {
    const existing = this.records.get(deduplicationKey);
    if (existing) {
      // If already delivered or actively processing, return existing record idempotently
      return existing;
    }

    const now = new Date();
    const nextAttemptAt = new Date(now.getTime() + initialDelaySeconds * 1000);

    const record: OutboxRecord = {
      id: `outbox_${Math.random().toString(36).substring(2, 12)}`,
      eventType,
      payload,
      status: OutboxEventStatus.PENDING,
      attempts: 0,
      deduplicationKey,
      nextAttemptAt,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(deduplicationKey, record);
    return record;
  }

  /**
   * Retrieves all records currently in the outbox store.
   */
  listEvents(filter?: { status?: OutboxEventStatus; eventType?: NotificationEventType }): OutboxRecord[] {
    const all = Array.from(this.records.values());
    return all.filter((rec) => {
      if (filter?.status && rec.status !== filter.status) return false;
      if (filter?.eventType && rec.eventType !== filter.eventType) return false;
      return true;
    });
  }

  /**
   * Claims and processes pending events with exponential backoff on transient errors.
   */
  async processPendingEvents(
    limit: number = 50,
    maxRetries: number = 5,
    referenceTime: Date = new Date()
  ): Promise<OutboxProcessSummary> {
    const eligible: OutboxRecord[] = [];

    for (const record of this.records.values()) {
      if (
        (record.status === OutboxEventStatus.PENDING || record.status === OutboxEventStatus.FAILED) &&
        record.nextAttemptAt.getTime() <= referenceTime.getTime() &&
        record.attempts < maxRetries
      ) {
        eligible.push(record);
        if (eligible.length >= limit) break;
      }
    }

    const summary: OutboxProcessSummary = {
      processed: eligible.length,
      succeeded: 0,
      failed: 0,
      deadLettered: 0,
    };

    for (const record of eligible) {
      record.status = OutboxEventStatus.PROCESSING;
      record.updatedAt = new Date();

      try {
        await this.dispatchRecord(record);
        record.status = OutboxEventStatus.DELIVERED;
        record.updatedAt = new Date();
        summary.succeeded += 1;
      } catch (err) {
        const errorMsg = (err as Error).message || 'Unknown notification dispatch error';
        record.lastError = errorMsg;
        record.attempts += 1;
        record.updatedAt = new Date();

        if (record.attempts >= maxRetries) {
          record.status = OutboxEventStatus.DEAD_LETTER;
          summary.deadLettered += 1;
        } else {
          record.status = OutboxEventStatus.FAILED;
          // Exponential backoff: 2^attempts * 1000ms
          const backoffDelayMs = Math.pow(2, record.attempts) * 1000;
          record.nextAttemptAt = new Date(Date.now() + backoffDelayMs);
          summary.failed += 1;
        }
      }
    }

    return summary;
  }

  /**
   * Internal dispatcher directing event types to appropriate neutral templates
   */
  private async dispatchRecord(record: OutboxRecord): Promise<void> {
    switch (record.eventType) {
      case NotificationEventType.TRUSTEE_INVITATION: {
        const msg = this.notificationAdapter.renderTrusteeInvitation(
          record.payload as TrusteeInvitationNotificationPayload
        );
        await this.notificationAdapter.sendEmail(msg);
        break;
      }
      case NotificationEventType.INACTIVITY_OWNER_REMINDER:
      case NotificationEventType.INACTIVITY_OWNER_INQUIRY:
      case NotificationEventType.INACTIVITY_TRUSTEE_ALERT: {
        const msg = this.notificationAdapter.renderInactivityNotice(
          record.payload as InactivityNoticePayload
        );
        await this.notificationAdapter.sendEmail(msg);
        break;
      }
      case NotificationEventType.RELEASE_GRANT_AVAILABLE: {
        const msg = this.notificationAdapter.renderReleaseGrant(
          record.payload as ReleaseGrantNotificationPayload
        );
        await this.notificationAdapter.sendEmail(msg);
        break;
      }
      case NotificationEventType.EMERGENCY_HOLD_NOTIFICATION: {
        const msg = this.notificationAdapter.renderEmergencyHold(
          record.payload as EmergencyHoldNotificationPayload
        );
        await this.notificationAdapter.sendEmail(msg);
        break;
      }
      case NotificationEventType.DEATH_CASE_STATUS_ALERT: {
        const msg = this.notificationAdapter.renderDeathCaseStatusAlert(
          record.payload as DeathCaseStatusAlertPayload
        );
        await this.notificationAdapter.sendEmail(msg);
        break;
      }
      default:
        throw new Error(`UNSUPPORTED_OUTBOX_EVENT_TYPE: ${record.eventType}`);
    }
  }
}
