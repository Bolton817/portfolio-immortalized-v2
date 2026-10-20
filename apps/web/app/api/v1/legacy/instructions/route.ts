import { NextRequest, NextResponse } from 'next/server';
import { UpsertInstructionSchema } from '@portfolio-immortalized/validation';
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
    const parseResult = UpsertInstructionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid legacy allocation instruction.',
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

    const plan = await legacyPlanDal.upsertInstruction(userId, parseResult.data);

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
          code: error.code || 'INSTRUCTION_FAILED',
          message: error.message || 'Failed to save legacy instruction.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
