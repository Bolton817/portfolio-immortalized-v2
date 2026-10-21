/**
 * Standalone Background Worker Process (apps/worker)
 * Executes scheduled operations in persistent or containerized environments:
 * 1. Periodic inactivity sweeps
 * 2. Outbox notification processing
 * 3. Overdue release grant revocation/expiration
 * References: TDD Chapter 10, 24; Architecture ADR-008
 */

import {
  BackgroundWorker,
  InactivitySweepService,
  OutboxService,
  ReleaseService,
  DeathCaseDal,
  LegacyPlanDal,
  VaultDal,
  AuditService,
  BrevoNotificationAdapter,
  logger,
} from '@portfolio-immortalized/server';

let isShuttingDown = false;
let isCycleActive = false;

export async function bootstrapWorker() {
  const auditService = new AuditService();
  const deathCaseDal = new DeathCaseDal(auditService);
  const inactivityService = new InactivitySweepService(deathCaseDal, auditService);
  const vaultDal = new VaultDal({ auditService });
  const legacyPlanDal = new LegacyPlanDal({ vaultDal, auditService });
  const releaseService = new ReleaseService(deathCaseDal, legacyPlanDal, vaultDal, auditService);
  const brevoAdapter = new BrevoNotificationAdapter();
  const outboxService = new OutboxService(brevoAdapter);

  const worker = new BackgroundWorker({
    inactivityService,
    outboxService,
    releaseService,
    auditService,
  });

  const intervalSeconds = Number(process.env.WORKER_INTERVAL_SECONDS) || 60;
  logger.info(`[Worker] Started background daemon running every ${intervalSeconds} seconds...`);

  const runCycle = async () => {
    if (isShuttingDown || isCycleActive) {
      return;
    }
    isCycleActive = true;
    try {
      const summary = await worker.runTick();
      logger.info(
        `[Worker Tick ${summary.timestamp}] Swept: ${summary.inactivity.totalEvaluated}, Outbox: ${summary.outbox.processed}, Expired: ${summary.expiredGrantsCount}`
      );
    } catch (err) {
      logger.error('[Worker Tick Error]', { error: err as Error });
    } finally {
      isCycleActive = false;
    }
  };

  await runCycle();
  const timer = setInterval(runCycle, intervalSeconds * 1000);

  // Graceful Shutdown Signal Trapping (OPS-03, Container Lifecycle)
  const handleShutdown = async (signal: string) => {
    logger.info(`[Worker] Received ${signal}. Initiating graceful shutdown...`);
    isShuttingDown = true;
    clearInterval(timer);

    // Wait up to 5 seconds if a cycle is currently processing
    let attempts = 0;
    while (isCycleActive && attempts < 10) {
      await new Promise((res) => setTimeout(res, 500));
      attempts++;
    }

    logger.info('[Worker] Background processing cleanly stopped. Process exiting.');
    if (process.env.NODE_ENV !== 'test') {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  return { worker, timer, handleShutdown };
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  bootstrapWorker().catch((err) => {
    console.error('[Worker Fatal Error]', err);
    process.exit(1);
  });
}
