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
} from '@portfolio-immortalized/server';

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
  console.log(`[Worker] Started background daemon running every ${intervalSeconds} seconds...`);

  const runCycle = async () => {
    try {
      const summary = await worker.runTick();
      console.log(
        `[Worker Tick ${summary.timestamp}] Swept: ${summary.inactivity.totalEvaluated}, Outbox: ${summary.outbox.processed}, Expired: ${summary.expiredGrantsCount}`
      );
    } catch (err) {
      console.error('[Worker Tick Error]', err);
    }
  };

  await runCycle();
  return setInterval(runCycle, intervalSeconds * 1000);
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  bootstrapWorker().catch((err) => {
    console.error('[Worker Fatal Error]', err);
    process.exit(1);
  });
}
