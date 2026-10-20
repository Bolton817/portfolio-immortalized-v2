import { NextRequest, NextResponse } from 'next/server';
import { SessionManager, makeUserId, makeAssetId } from '@portfolio-immortalized/server';
import { vaultDal, defaultVaultOwnerId } from '../../vault-instance';

const sessionManager = new SessionManager();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId
      ? makeUserId(sessionContext.session.userId)
      : defaultVaultOwnerId;

    const asset = await vaultDal.getAsset(userId, makeAssetId(params.id));

    return NextResponse.json({
      data: asset,
      requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: {
          code: error.code || 'ASSET_ERROR',
          message: error.message || 'Failed to retrieve asset.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId
      ? makeUserId(sessionContext.session.userId)
      : defaultVaultOwnerId;

    await vaultDal.softDeleteAsset(userId, makeAssetId(params.id));

    return NextResponse.json({
      data: {
        id: params.id,
        purged: true,
      },
      requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: {
          code: error.code || 'DELETE_FAILED',
          message: error.message || 'Failed to delete asset.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
