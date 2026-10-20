import {
  UserId,
  CaseInitiationType,
  evaluateInactivityStatus,
  isMeaningfulActivity,
  InactivityPolicyConfig,
  DEFAULT_INACTIVITY_POLICY,
} from '@portfolio-immortalized/domain';
import { DeathCaseDal } from '../dal/death-case.js';
import { AuditService } from '../audit/logger.js';

export interface OwnerActivityRecord {
  ownerId: UserId;
  lastMeaningfulActivityAt: Date;
  remindersSentCount: number;
  lastReminderSentAt?: Date;
}

export interface InactivitySweepResult {
  totalEvaluated: number;
  remindersDispatched: number;
  investigationsOpened: number;
  unaffectedCount: number;
}

export class InactivitySweepService {
  private activityRecords: Map<string, OwnerActivityRecord> = new Map();
  private deathCaseDal: DeathCaseDal;
  private auditService: AuditService;
  private policy: InactivityPolicyConfig;

  constructor(
    deathCaseDal: DeathCaseDal,
    auditService: AuditService = new AuditService(),
    policy: InactivityPolicyConfig = DEFAULT_INACTIVITY_POLICY
  ) {
    this.deathCaseDal = deathCaseDal;
    this.auditService = auditService;
    this.policy = policy;
  }

  // Register or update an owner's activity record
  registerOwner(ownerId: UserId, initialActivityAt: Date = new Date()): void {
    const existing = this.activityRecords.get(ownerId);
    if (existing) {
      existing.lastMeaningfulActivityAt = initialActivityAt;
    } else {
      this.activityRecords.set(ownerId, {
        ownerId,
        lastMeaningfulActivityAt: initialActivityAt,
        remindersSentCount: 0,
      });
    }
  }

  // Record an activity event; strictly filters out passive/disqualified events
  async recordActivity(ownerId: UserId, eventType: string): Promise<boolean> {
    if (!isMeaningfulActivity(eventType)) {
      // Disqualified / passive activity (e.g. background heartbeat, app launch passive)
      return false;
    }

    const record = this.activityRecords.get(ownerId) ?? {
      ownerId,
      lastMeaningfulActivityAt: new Date(),
      remindersSentCount: 0,
    };

    record.lastMeaningfulActivityAt = new Date();
    record.remindersSentCount = 0;
    this.activityRecords.set(ownerId, record);

    // If an investigation or case was open, notify DeathCaseDal
    await this.deathCaseDal.handleOwnerActivity(ownerId, eventType);

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'owner.meaningful_activity_recorded',
      targetType: 'User',
      targetId: ownerId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: { eventType },
    });

    return true;
  }

  // Execute periodic inactivity sweep (e.g. triggered by cron or background worker)
  async executeSweep(evaluationTime: Date = new Date()): Promise<InactivitySweepResult> {
    const result: InactivitySweepResult = {
      totalEvaluated: this.activityRecords.size,
      remindersDispatched: 0,
      investigationsOpened: 0,
      unaffectedCount: 0,
    };

    for (const record of this.activityRecords.values()) {
      const evaluation = evaluateInactivityStatus(
        record.lastMeaningfulActivityAt,
        evaluationTime,
        this.policy
      );

      if (evaluation.shouldOpenInvestigation) {
        // Zero timer-based release: opens investigation case, NOT asset release!
        const deathCase = await this.deathCaseDal.initiateCase(
          record.ownerId,
          CaseInitiationType.INACTIVITY,
          'system' as UserId,
          {
            policyVersion: this.policy.policyVersion,
            statement: `Automated inactivity investigation opened after ${evaluation.daysInactive} days of verified inactivity.`,
          }
        );

        result.investigationsOpened += 1;

        await this.auditService.record({
          actorType: 'SYSTEM',
          actorId: 'system' as UserId,
          action: 'inactivity.investigation_opened',
          targetType: 'DeathCase',
          targetId: deathCase.id,
          outcome: 'SUCCESS',
          requestId: `req_${Date.now()}`,
          metadata: {
            ownerId: record.ownerId,
            daysInactive: evaluation.daysInactive,
          },
        });
      } else if (evaluation.shouldSendReminder) {
        result.remindersDispatched += 1;
        record.remindersSentCount += 1;
        record.lastReminderSentAt = evaluationTime;

        await this.auditService.record({
          actorType: 'SYSTEM',
          actorId: 'system' as UserId,
          action: 'inactivity.reminder_dispatched',
          targetType: 'User',
          targetId: record.ownerId,
          outcome: 'SUCCESS',
          requestId: `req_${Date.now()}`,
          metadata: {
            daysInactive: evaluation.daysInactive,
            reminderNumber: record.remindersSentCount,
          },
        });
      } else {
        result.unaffectedCount += 1;
      }
    }

    return result;
  }

  getOwnerActivity(ownerId: UserId): OwnerActivityRecord | undefined {
    return this.activityRecords.get(ownerId);
  }
}
