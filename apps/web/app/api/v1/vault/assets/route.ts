import { NextRequest, NextResponse } from 'next/server';
import { AssetQuerySchema } from '@portfolio-immortalized/validation';
import { SessionManager, makeUserId } from '@portfolio-immortalized/server';
import { vaultDal, defaultVaultOwnerId } from '../vault-instance';

const sessionManager = new SessionManager();

export async function GET(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId
      ? makeUserId(sessionContext.session.userId)
      : defaultVaultOwnerId;

    const url = new URL(request.url);
    const rawQuery = {
      category: url.searchParams.get('category') || undefined,
      search: url.searchParams.get('search') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      offset: url.searchParams.get('offset') || undefined,
    };

    const parseResult = AssetQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_QUERY',
            message: 'Invalid query parameters.',
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

    const assets = await vaultDal.listAssets(userId, parseResult.data);

    return NextResponse.json({
      data: assets,
      meta: {
        total: assets.length,
        limit: parseResult.data.limit,
        offset: parseResult.data.offset,
      },
      requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: {
          code: error.code || 'LIST_ASSETS_FAILED',
          message: error.message || 'Failed to list vault assets.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
