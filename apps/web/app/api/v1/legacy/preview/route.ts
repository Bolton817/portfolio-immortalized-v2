import { NextRequest, NextResponse } from 'next/server';
import { SessionManager, makeUserId, BeneficiaryId } from '@portfolio-immortalized/server';
import { legacyPlanDal, defaultOwnerId } from '../legacy-instance';

const sessionManager = new SessionManager();

export async function GET(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId
      ? makeUserId(sessionContext.session.userId)
      : defaultOwnerId;

    const url = new URL(request.url);
    const beneficiaryId = url.searchParams.get('beneficiaryId') as BeneficiaryId | null;

    const preview = await legacyPlanDal.generateRecipientPreview(
      userId,
      beneficiaryId || undefined
    );

    return NextResponse.json({
      data: preview,
      requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: {
          code: error.code || 'PREVIEW_FAILED',
          message: error.message || 'Failed to generate recipient preview.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
