import { NextRequest, NextResponse } from 'next/server';
import { TrusteeConflictReportSchema } from '@portfolio-immortalized/validation';
import {
  CaseHoldReasonCode,
  NotificationEventType,
  makeCaseId,
  makeUserId,
} from '@portfolio-immortalized/domain';
import { deathCaseDal, caseAuditService } from '../../cases/case-instance';
import { outboxService } from '../../worker/worker-instance';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TrusteeConflictReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_CONFLICT_REPORT', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { caseId, conflictType, narrative } = parsed.data;

    // Map conflict type to hold reason code
    let reasonCode = CaseHoldReasonCode.LEGAL_DISPUTE;
    if (conflictType === 'FRAUD_SUSPECTED') {
      reasonCode = CaseHoldReasonCode.SUSPECTED_FRAUD;
    }

    // Place emergency hold immediately (OD-18, CASE-03)
    const holdRecord = await deathCaseDal.placeEmergencyHold(
      makeCaseId(caseId),
      makeUserId('trustee_reporter'),
      {
        reasonCode,
        rationale: `Trustee filed formal dispute [${conflictType}]: ${narrative}`,
        scope: 'ALL_PENDING_RELEASES',
      }
    );

    // Enqueue emergency alert to administrators & security operations
    await outboxService.enqueue(
      NotificationEventType.EMERGENCY_HOLD_NOTIFICATION,
      {
        recipientEmail: 'security-ops@portfolio-immortalized.com',
        recipientName: 'Security Operations',
        caseId,
        reasonCode,
        narrative,
      },
      `emergency_hold_${caseId}_${Date.now()}`
    );

    await caseAuditService.record({
      actorType: 'TRUSTEE',
      actorId: 'trustee_reporter',
      action: 'trustee.conflict_reported',
      targetType: 'DeathCase',
      targetId: caseId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        conflictType,
        holdId: holdRecord.id,
        reasonCode,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        caseId,
        holdPlaced: true,
        state: 'HOLD',
        holdId: holdRecord.id,
      },
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; code?: string; message?: string };
    const status = err.statusCode || 500;
    return NextResponse.json(
      { success: false, error: err.code || 'FAILED_TO_FILE_CONFLICT', message: err.message },
      { status }
    );
  }
}
