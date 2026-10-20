import { NextRequest, NextResponse } from 'next/server';
import { SessionManager, makeUserId } from '@portfolio-immortalized/server';
import { legacyPlanDal, defaultOwnerId } from '../legacy-instance';

const sessionManager = new SessionManager();

export async function GET(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId
      ? makeUserId(sessionContext.session.userId)
      : defaultOwnerId;

    const [draftPlan, publishedPlan] = await Promise.all([
      legacyPlanDal.getDraftPlan(userId),
      legacyPlanDal.getPublishedPlan(userId),
    ]);

    return NextResponse.json({
      data: {
        draftPlan,
        publishedPlan,
      },
      requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: {
          code: error.code || 'PLAN_FETCH_FAILED',
          message: error.message || 'Failed to retrieve legacy plan.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
