import { NextRequest, NextResponse } from 'next/server';
import { SessionManager, makeUserId, LegacyInstructionId } from '@portfolio-immortalized/server';
import { legacyPlanDal, defaultOwnerId } from '../../legacy-instance';

const sessionManager = new SessionManager();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId
      ? makeUserId(sessionContext.session.userId)
      : defaultOwnerId;

    const plan = await legacyPlanDal.removeInstruction(
      userId,
      params.id as LegacyInstructionId
    );

    return NextResponse.json({
      data: plan,
      requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: {
          code: error.code || 'DELETE_INSTRUCTION_FAILED',
          message: error.message || 'Failed to remove instruction.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
