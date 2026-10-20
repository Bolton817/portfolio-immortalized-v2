import { NextRequest, NextResponse } from 'next/server';
import { CreateUploadIntentSchema } from '@portfolio-immortalized/validation';
import { SessionManager, makeUserId } from '@portfolio-immortalized/server';
import { vaultDal, defaultVaultOwnerId } from '../vault-instance';

const sessionManager = new SessionManager();

export async function POST(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId
      ? makeUserId(sessionContext.session.userId)
      : defaultVaultOwnerId;

    const body = await request.json();
    const parseResult = CreateUploadIntentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid upload intent payload.',
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

    const intent = await vaultDal.createUploadIntent(userId, parseResult.data);

    return NextResponse.json(
      {
        data: intent,
        requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: {
          code: error.code || 'INTENT_FAILED',
          message: error.message || 'Failed to initialize upload intent.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
