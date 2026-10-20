import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import {
  NotificationEventType,
  OutboxEventStatus,
} from '@portfolio-immortalized/domain';
import {
  OutboxService,
  BrevoNotificationAdapter,
  verifyBrevoWebhookSignature,
} from '../src/index.js';

describe('Outbox & Transactional Notifications Engine (Chapter 10, 24)', () => {
  let mockAdapter: BrevoNotificationAdapter;
  let outboxService: OutboxService;

  beforeEach(() => {
    mockAdapter = new BrevoNotificationAdapter({ isMock: true });
    outboxService = new OutboxService(mockAdapter);
  });

  it('enqueues notification event transactionally with unique deduplication key', async () => {
    const record = await outboxService.enqueue(
      NotificationEventType.TRUSTEE_INVITATION,
      {
        recipientEmail: 'trustee.alice@example.com',
        recipientName: 'Alice Trustee',
        ownerName: 'Bob Owner',
        actionUrl: 'https://immortalized.io/trustee/accept?token=xyz123',
        expiresAtIso: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      },
      'invitation_dedup_001'
    );

    expect(record.id).toBeDefined();
    expect(record.status).toBe(OutboxEventStatus.PENDING);
    expect(record.attempts).toBe(0);
    expect(record.deduplicationKey).toBe('invitation_dedup_001');
  });

  it('handles duplicate enqueue idempotently without creating redundant records', async () => {
    const first = await outboxService.enqueue(
      NotificationEventType.INACTIVITY_OWNER_REMINDER,
      {
        recipientEmail: 'owner@example.com',
        stage: 'REMINDER_75D',
        lastActivityIso: new Date().toISOString(),
        actionUrl: 'https://immortalized.io/dashboard',
      },
      'inactivity_reminder_owner_1'
    );

    const duplicate = await outboxService.enqueue(
      NotificationEventType.INACTIVITY_OWNER_REMINDER,
      {
        recipientEmail: 'owner@example.com',
        stage: 'REMINDER_75D',
        lastActivityIso: new Date().toISOString(),
        actionUrl: 'https://immortalized.io/dashboard',
      },
      'inactivity_reminder_owner_1'
    );

    expect(duplicate.id).toBe(first.id);
    expect(outboxService.listEvents()).toHaveLength(1);
  });

  it('processes pending outbox events and marks them DELIVERED', async () => {
    await outboxService.enqueue(
      NotificationEventType.RELEASE_GRANT_AVAILABLE,
      {
        recipientEmail: 'beneficiary@example.com',
        recipientName: 'Carol Beneficiary',
        ownerName: 'Bob Owner',
        actionUrl: 'https://immortalized.io/beneficiary/verify?token=grant123',
        expiresAtIso: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
        assetCount: 3,
        grantId: 'grant_demo_abc',
      },
      'release_grant_carol_1'
    );

    const result = await outboxService.processPendingEvents(10, 5);
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    const events = outboxService.listEvents({ status: OutboxEventStatus.DELIVERED });
    expect(events).toHaveLength(1);
    expect(mockAdapter.sentMessages).toHaveLength(1);
    expect(mockAdapter.sentMessages[0]?.to).toBe('beneficiary@example.com');
  });

  it('applies exponential backoff retry when delivery encounters a transient failure', async () => {
    // Force adapter to fail on first attempt
    const failingAdapter = new BrevoNotificationAdapter({ isMock: true });
    failingAdapter.sendEmail = async () => {
      throw new Error('SMTP connection timeout');
    };

    const failingOutbox = new OutboxService(failingAdapter);
    await failingOutbox.enqueue(
      NotificationEventType.EMERGENCY_HOLD_NOTIFICATION,
      {
        recipientEmail: 'security@example.com',
        caseId: 'case_123',
        reasonCode: 'SUSPECTED_FRAUD',
        narrative: 'Disputed estate documents reported by trustee',
      },
      'emergency_hold_alert_1'
    );

    const result = await failingOutbox.processPendingEvents(10, 5);
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);

    const events = failingOutbox.listEvents();
    expect(events[0]?.attempts).toBe(1);
    expect(events[0]?.status).toBe(OutboxEventStatus.FAILED);
    expect(events[0]?.lastError).toContain('SMTP connection timeout');
    // Next attempt must be scheduled in the future: 2^1 * 1000ms = 2 seconds
    expect(events[0]?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('moves record to DEAD_LETTER when maximum retry attempts (5) are exhausted', async () => {
    const failingAdapter = new BrevoNotificationAdapter({ isMock: true });
    failingAdapter.sendEmail = async () => {
      throw new Error('Permanent mailbox failure (550 User unknown)');
    };

    const failingOutbox = new OutboxService(failingAdapter);
    const rec = await failingOutbox.enqueue(
      NotificationEventType.INACTIVITY_TRUSTEE_ALERT,
      {
        recipientEmail: 'deadletter@example.com',
        stage: 'TRUSTEE_ALERT_104D',
        lastActivityIso: new Date().toISOString(),
        actionUrl: 'https://immortalized.io/trustee/portal',
      },
      'deadletter_test_key'
    );

    // Fast-forward attempts to 4
    rec.attempts = 4;
    rec.nextAttemptAt = new Date(Date.now() - 1000);

    const result = await failingOutbox.processPendingEvents(10, 5);
    expect(result.deadLettered).toBe(1);
    expect(rec.status).toBe(OutboxEventStatus.DEAD_LETTER);
    expect(rec.attempts).toBe(5);
  });

  it('verifies Brevo webhook HMAC-SHA256 signature', () => {
    const secret = 'webhook-test-hmac-secret-123456';
    const payload = JSON.stringify({
      event: 'delivered',
      email: 'recipient@example.com',
      messageId: 'msg_987',
      ts_event: 1729440000,
    });

    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(Buffer.from(payload, 'utf8'))
      .digest('hex');

    const isValid = verifyBrevoWebhookSignature({
      rawBody: payload,
      signatureHeader: validSignature,
      secret,
    });
    expect(isValid).toBe(true);

    const isInvalid = verifyBrevoWebhookSignature({
      rawBody: payload,
      signatureHeader: 'tampered_signature_hex_value',
      secret,
    });
    expect(isInvalid).toBe(false);

    const isMissing = verifyBrevoWebhookSignature({
      rawBody: payload,
      signatureHeader: null,
      secret,
    });
    expect(isMissing).toBe(false);
  });

  it('enforces Neutral Notification Content Policy (Risk R-14/R-16): zero sensitive disclosures in email bodies', () => {
    const adapter = new BrevoNotificationAdapter({ isMock: true });

    // 1. Inactivity Reminder
    const inactivityMsg = adapter.renderInactivityNotice({
      recipientEmail: 'owner@example.com',
      stage: 'REMINDER_75D',
      lastActivityIso: new Date().toISOString(),
      actionUrl: 'https://immortalized.io/dashboard',
    });
    expect(inactivityMsg.htmlContent).not.toMatch(/deceased|death|died|passphrase|private key|dek/i);
    expect(inactivityMsg.textContent).not.toMatch(/deceased|death|died|passphrase|private key|dek/i);

    // 2. Release Grant Notice
    const grantMsg = adapter.renderReleaseGrant({
      recipientEmail: 'beneficiary@example.com',
      recipientName: 'Alice',
      ownerName: 'Bob',
      actionUrl: 'https://immortalized.io/beneficiary/verify?token=act_123',
      expiresAtIso: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
      assetCount: 2,
      grantId: 'grant_1',
    });
    // Never contains vault asset plaintext, DEK, or raw credentials
    expect(grantMsg.htmlContent).not.toMatch(/password|private key|encryption key|dek/i);
    expect(grantMsg.htmlContent).toContain('Authorized Legacy Release');
    expect(grantMsg.htmlContent).toContain('Cap. 160');
  });
});
