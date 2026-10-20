import {
  AdminDal,
  LifecycleService,
  AuditQueryService,
  globalAuditSink,
  makeUserId,
} from '@portfolio-immortalized/server';
import { deathCaseDal, caseAuditService } from '../cases/case-instance';

export const adminDal = new AdminDal(caseAuditService);
export const lifecycleService = new LifecycleService(adminDal, deathCaseDal, caseAuditService);
export const auditQueryService = new AuditQueryService(globalAuditSink);

export const defaultSecOpsAdminId = makeUserId('usr_admin_security');
export const defaultSuperAdminId = makeUserId('usr_admin_super');
