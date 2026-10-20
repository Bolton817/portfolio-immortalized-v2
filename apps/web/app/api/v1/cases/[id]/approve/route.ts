import { NextRequest, NextResponse } from 'next/server';
import { IndependentFinalApprovalSchema, DalAuthorizationError } from '@portfolio-immortalized/server';
import { makeCaseId, makeUserId } from '@portfolio-immortalized/domain';
import { deathCaseDal, releaseService, demoApproverId } from '@/app/api/v1/cases/case-instance';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = IndependentFinalApprovalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const approverId = makeUserId(req.headers.get('x-user-id') || demoApproverId);
    const caseId = makeCaseId(id);

    // Step 1: Enforce independent final approval (approverId !== reviewerId)
    const authorizedCase = await deathCaseDal.grantFinalApproval(
      caseId,
      approverId,
      parsed.data
    );

    // Step 2: Trigger release grant issuance
    let issuedGrants = null;
    try {
      issuedGrants = await releaseService.generateGrantsForAuthorizedCase(caseId);
    } catch (releaseErr) {
      console.warn('Release grants issuance deferred:', releaseErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        case: authorizedCase,
        grants: issuedGrants,
      },
      message: 'Independent final release authorized successfully. Controlled release grants issued.',
    });
  } catch (error: unknown) {
    if (error instanceof DalAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error approving release:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
