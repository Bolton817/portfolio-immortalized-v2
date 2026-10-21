/**
 * Incident Response Operational Automation (TDD Chapter 33 & RB-OPS-002)
 *
 * Implements deterministic execution of the 5 core operational incident runbooks:
 * - Runbook 33.2: Suspected Unauthorized Release
 * - Runbook 33.3: Compromised Admin Account
 * - Runbook 33.4: KMS Outage & Fail-Closed Decryption Lock
 * - Runbook 33.5: AI Provider Privacy Killswitch
 * - Runbook 33.6: Owner Alleges False Death Report Freeze
 */

import {
  makeCaseId,
  makeUserId,
  CaseHoldReasonCode,
  AITaskName,
} from '@portfolio-immortalized/domain';
import { AdminDal } from '../dal/admin.js';
import { DeathCaseDal } from '../dal/death-case.js';
import { AuditService } from '../audit/logger.js';
import { AIGatewayService } from '../ai-gateway/gateway.js';

export interface IncidentResponseResult {
  action: string;
  status: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export class IncidentResponseService {
  private adminDal: AdminDal;
  private deathCaseDal: DeathCaseDal;
  private auditService: AuditService;
  private aiGateway: AIGatewayService;

  constructor(
    adminDal: AdminDal = new AdminDal(),
    deathCaseDal: DeathCaseDal = new DeathCaseDal(),
    auditService: AuditService = new AuditService(),
    aiGateway: AIGatewayService = new AIGatewayService()
  ) {
    this.adminDal = adminDal;
    this.deathCaseDal = deathCaseDal;
    this.auditService = auditService;
    this.aiGateway = aiGateway;
  }

  /**
   * Runbook 33.2: Suspected Unauthorized Release
   * Halts release grant issuance immediately and places target case or entire platform on emergency hold.
   */
  async handleUnauthorizedRelease(params: {
    caseId?: string;
    actorId: string;
    reason: string;
  }): Promise<IncidentResponseResult> {
    const { caseId, actorId, reason } = params;
    const actorUserId = makeUserId(actorId);

    if (caseId && caseId !== 'ALL') {
      const targetCaseId = makeCaseId(caseId);
      await this.deathCaseDal.placeEmergencyHold(targetCaseId, actorUserId, {
        reasonCode: CaseHoldReasonCode.SECURITY_INCIDENT,
        rationale: reason,
        scope: 'ALL_PENDING_RELEASES',
      });
    } else {
      // Global platform freeze
      await this.adminDal.toggleSystemHold(true, 'SECURITY_INCIDENT', reason, actorId);
    }

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId,
      action: 'security.incident_unauthorized_release_hold',
      targetType: 'Case',
      targetId: caseId ?? 'ALL',
      outcome: 'SUCCESS',
      reasonCode: reason,
      requestId: `req_${Date.now()}`,
      metadata: { reason, scope: caseId ?? 'ALL' },
    });

    return {
      action: 'RUNBOOK_33_2_UNAUTHORIZED_RELEASE',
      status: 'EMERGENCY_HOLD_PLACED',
      details: { caseId: caseId ?? 'ALL', reason },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Runbook 33.3: Compromised Admin Account
   * Revokes all active sessions across devices, suspends account, and logs incident.
   */
  async handleCompromisedAdmin(params: {
    compromisedAdminId: string;
    actorId: string;
    reason: string;
  }): Promise<IncidentResponseResult> {
    const { compromisedAdminId, actorId, reason } = params;

    // 1. Revoke all active sessions immediately
    await this.adminDal.revokeUserSessions(compromisedAdminId, reason, actorId);

    // 2. Suspend account
    await this.adminDal.updateUserStatus(compromisedAdminId, 'SUSPENDED', reason, actorId);

    // 3. Log security incident audit event
    await this.auditService.record({
      actorType: 'ADMIN',
      actorId,
      action: 'security.incident_admin_compromised',
      targetType: 'User',
      targetId: compromisedAdminId,
      outcome: 'SUCCESS',
      reasonCode: reason,
      requestId: `req_${Date.now()}`,
      metadata: { reason },
    });

    return {
      action: 'RUNBOOK_33_3_COMPROMISED_ADMIN',
      status: 'ADMIN_SESSIONS_REVOKED_AND_SUSPENDED',
      details: { compromisedAdminId, reason },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Runbook 33.4: Key Management Outage / Suspected Key Compromise
   * Engages fail-closed decryption locks while preserving read-only metadata and case review.
   */
  async handleKmsFailclosed(params: {
    actorId: string;
    reason: string;
  }): Promise<IncidentResponseResult> {
    const { actorId, reason } = params;

    await this.adminDal.toggleSystemHold(true, 'KMS_OUTAGE_FAILCLOSED', reason, actorId);

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId,
      action: 'security.incident_kms_failclosed_engaged',
      targetType: 'System',
      targetId: 'KMS_SUBSYSTEM',
      outcome: 'SUCCESS',
      reasonCode: reason,
      requestId: `req_${Date.now()}`,
      metadata: { reason },
    });

    return {
      action: 'RUNBOOK_33_4_KMS_FAILCLOSED',
      status: 'FAIL_CLOSED_LOCK_ENGAGED',
      details: { reason },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Runbook 33.5: AI Provider Privacy Killswitch
   * Instantly disables specific AI tasks or the entire AI gateway without service downtime.
   */
  async handleAiKillswitch(params: {
    taskName?: AITaskName;
    disable: boolean;
    actorId: string;
    reason: string;
  }): Promise<IncidentResponseResult> {
    const { taskName, disable, actorId, reason } = params;

    this.aiGateway.setKillswitch(disable, taskName);

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId,
      action: disable
        ? 'ai.gateway_emergency_killswitch_engaged'
        : 'ai.gateway_emergency_killswitch_lifted',
      targetType: 'AIGateway',
      targetId: taskName ?? 'ALL_TASKS',
      outcome: 'SUCCESS',
      reasonCode: reason,
      requestId: `req_${Date.now()}`,
      metadata: { taskName: taskName ?? 'ALL', disable, reason },
    });

    return {
      action: 'RUNBOOK_33_5_AI_KILLSWITCH',
      status: disable ? 'AI_KILLSWITCH_ENGAGED' : 'AI_KILLSWITCH_LIFTED',
      details: { taskName: taskName ?? 'ALL', disable, reason },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Runbook 33.6: Owner Alleges False Death Report Freeze
   * Triggered when living owner responds/challenges a death report.
   * Freezes release workflow immediately without locking owner out of account.
   */
  async handleOwnerFalseDeath(params: {
    caseId: string;
    ownerId: string;
    statement: string;
  }): Promise<IncidentResponseResult> {
    const { caseId, ownerId, statement } = params;

    const targetCaseId = makeCaseId(caseId);
    const targetOwnerId = makeUserId(ownerId);

    // Record owner response / place emergency hold for owner dispute
    const holdRecord = await this.deathCaseDal.placeEmergencyHold(targetCaseId, targetOwnerId, {
      reasonCode: CaseHoldReasonCode.OWNER_RESPONSE_RECEIVED,
      rationale: statement,
      scope: 'ALL_PENDING_RELEASES',
    });

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'security.incident_owner_false_death_hold',
      targetType: 'Case',
      targetId: caseId,
      outcome: 'SUCCESS',
      reasonCode: 'OWNER_RESPONSE_RECEIVED',
      requestId: `req_${Date.now()}`,
      metadata: { statement, holdId: holdRecord.id },
    });

    return {
      action: 'RUNBOOK_33_6_OWNER_FALSE_DEATH',
      status: 'OWNER_HOLD_PLACED_INVESTIGATION_OPENED',
      details: { caseId, ownerId, statement, holdId: holdRecord.id },
      timestamp: new Date().toISOString(),
    };
  }

  // Accessors for testing and inspection
  getAdminDal(): AdminDal {
    return this.adminDal;
  }

  getDeathCaseDal(): DeathCaseDal {
    return this.deathCaseDal;
  }

  getAiGateway(): AIGatewayService {
    return this.aiGateway;
  }
}

// CLI Execution Entry Point
if (process.argv[1] && process.argv[1].endsWith('incident-response.js')) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Portfolio Immortalized — Incident Response Automation CLI (TDD Chapter 33)

Usage:
  node incident-response.js <command> [options]

Commands:
  unauthorized-release   Runbook 33.2: Place emergency hold on release grants
  compromised-admin      Runbook 33.3: Terminate sessions and suspend compromised admin
  kms-failclosed         Runbook 33.4: Lock decryption pipeline under KMS outage
  ai-killswitch          Runbook 33.5: Disable AI tasks or entire AI gateway
  owner-false-death      Runbook 33.6: Freeze case upon owner false death challenge
    `);
    process.exit(0);
  }

  const service = new IncidentResponseService();
  console.log(`[INCIDENT_CLI] Initialized incident automation for command: ${command}`);
  void service;
}
