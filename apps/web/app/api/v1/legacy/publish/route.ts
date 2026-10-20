import { NextRequest, NextResponse } from 'next/server';
import { PublishLegacyPlanSchema } from '@portfolio-immortalized/validation';
import { SessionManager, makeUserId } from '@portfolio-immortalized/server';
import { legacyPlanDal, defaultOwnerId } from '../legacy-instance';

const sessionManager = new SessionManager();

export async function POST(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId
      ? makeUserId(sessionContext.session.userId)
      : defaultOwnerId;

    const body = await request.json();
    const parseResult = PublishLegacyPlanSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'You must confirm and accept the statutory succession terms.',
            requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
            details: parseResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const publishedPlan = await legacyPlanDal.publishPlan(userId, parseResult.data);

    return NextResponse.json({
      data: publishedPlan,
      requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: {
          code: error.code || 'PUBLISH_FAILED',
          message: error.message || 'Failed to publish legacy plan.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
