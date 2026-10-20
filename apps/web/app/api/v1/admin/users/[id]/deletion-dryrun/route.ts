import { NextRequest, NextResponse } from 'next/server';
import { lifecycleService, defaultSuperAdminId } from '../../../admin-instance';
import { LegalHoldBlocksPurgeError } from '@portfolio-immortalized/domain';
import { AdminDalError } from '@portfolio-immortalized/server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const execute = Boolean(body.execute);
    const reasonCode = body.reasonCode || 'ADMINISTRATIVE_COMPLIANCE_REVIEW';

    if (execute) {
      const result = await lifecycleService.queueAccountDeletion(
        id,
        reasonCode,
        defaultSuperAdminId
      );
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    const report = await lifecycleService.evaluateDeletionImpact(
      id,
      defaultSuperAdminId
    );

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: unknown) {
    if (error instanceof LegalHoldBlocksPurgeError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
          activeHoldsCount: error.activeHoldsCount,
          activeCasesCount: error.activeCasesCount,
        },
        { status: 409 }
      );
    }

    if (error instanceof AdminDalError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Error evaluating account deletion dry run:', error);
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_EVALUATE_DELETION' },
      { status: 500 }
    );
  }
}
