import {
  BrevoNotificationAdapter,
  OutboxService,
  WatermarkService,
  BeneficiaryDal,
  BackgroundWorker,
} from '@portfolio-immortalized/server';
import {
  caseAuditService,
  inactivityService,
  releaseService,
} from '../cases/case-instance';
import { vaultDal } from '../vault/vault-instance';

export const brevoAdapter = new BrevoNotificationAdapter({ isMock: true });
export const outboxService = new OutboxService(brevoAdapter);
export const watermarkService = new WatermarkService();
export const beneficiaryDal = new BeneficiaryDal(
  releaseService,
  vaultDal,
  watermarkService,
  caseAuditService
);
export const backgroundWorker = new BackgroundWorker({
  inactivityService,
  outboxService,
  releaseService,
  auditService: caseAuditService,
});
