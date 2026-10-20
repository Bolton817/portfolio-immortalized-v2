/**
 * Background Worker Engine (Runner)
 * Executes scheduled operations:
 * 1. Inactivity monitoring sweeps (Chapter 10)
 * 2. Reliable transactional outbox notifications dispatch (Chapter 24)
 * 3. Overdue release grant expiration checks (Chapter 12)
 * References: TDD Chapter 10, 12, 24; Architecture ADR-008
 */

import { ReleaseGrantStatus } from '@portfolio-immortalized/domain';
import { InactivitySweepService, InactivitySweepResult } from '../services/inactivity.js';
import { OutboxService, OutboxProcessSummary } from '../notifications/outbox.js';
import { ReleaseService, ReleaseGrantRecord } from '../services/release.js';
import { AuditService } from '../audit/logger.js';

export interface BackgroundWorkerConfig {
  inactivityService: InactivitySweepService;
  outboxService: OutboxService;
  releaseService: ReleaseService;
  auditService?: AuditService;
}

export interface WorkerTickResult {
  timestamp: string;
  inactivity: InactivitySweepResult;
  outbox: OutboxProcessSummary;
  expiredGrantsCount: number;
}

export class BackgroundWorker {
  private inactivityService: InactivitySweepService;
  private outboxService: OutboxService;
  private releaseService: ReleaseService;
  private auditService: AuditService;

  constructor(config: BackgroundWorkerConfig) {
    this.inactivityService = config.inactivityService;
    this.outboxService = config.outboxService;
    this.releaseService = config.releaseService;
    this.auditService = config.auditService || new AuditService();
  }

  /**
   * Executes scheduled inactivity sweep across registered accounts
   */
  async runInactivitySweep(evaluationTime: Date = new Date()): Promise<InactivitySweepResult> {
    return this.inactivityService.executeSweep(evaluationTime);
  }

  /**
   * Dispatches pending transactional notifications via outbox engine
   */
  async runOutboxDispatch(limit: number = 50, maxRetries: number = 5): Promise<OutboxProcessSummary> {
    return this.outboxService.processPendingEvents(limit, maxRetries);
  }

  /**
   * Identifies and transitions expired release grants to EXPIRED status
   */
  async runGrantExpiryCheck(referenceTime: Date = new Date()): Promise<number> {
    let expiredCount = 0;
    const internalGrants = (this.releaseService as unknown as { grants: Map<string, ReleaseGrantRecord> }).grants;

    if (internalGrants) {
      for (const grant of internalGrants.values()) {
        if (grant.status === ReleaseGrantStatus.ACTIVE && grant.expiresAt.getTime() <= referenceTime.getTime()) {
          grant.status = ReleaseGrantStatus.EXPIRED;
          expiredCount += 1;

          await this.auditService.record({
            actorType: 'WORKER',
            actorId: 'worker_grant_expiry',
            action: 'release.grant_expired',
            targetType: 'ReleaseGrant',
            targetId: grant.id,
            outcome: 'SUCCESS',
            requestId: `req_${Date.now()}`,
            metadata: {
              beneficiaryId: grant.beneficiaryId,
              caseId: grant.caseId,
              expiresAt: grant.expiresAt,
            },
          });
        }
      }
    }

    return expiredCount;
  }

  /**
   * Master execution tick combining inactivity sweep, outbox dispatch, and grant maintenance
   */
  async runTick(options: {
    referenceTime?: Date;
    processLimit?: number;
    maxRetries?: number;
  } = {}): Promise<WorkerTickResult> {
    const refTime = options.referenceTime || new Date();
    const limit = options.processLimit || 50;
    const maxRetries = options.maxRetries || 5;

    const inactivityResult = await this.runInactivitySweep(refTime);
    const outboxResult = await this.runOutboxDispatch(limit, maxRetries);
    const expiredGrants = await this.runGrantExpiryCheck(refTime);

    return {
      timestamp: refTime.toISOString(),
      inactivity: inactivityResult,
      outbox: outboxResult,
      expiredGrantsCount: expiredGrants,
    };
  }
}
