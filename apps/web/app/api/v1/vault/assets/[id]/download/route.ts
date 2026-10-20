import { NextRequest, NextResponse } from 'next/server';
import { SessionManager, makeUserId, makeAssetId } from '@portfolio-immortalized/server';
import { vaultDal, defaultVaultOwnerId } from '../../../vault-instance';

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

    const url = new URL(request.url);
    const versionParam = url.searchParams.get('version');
    const versionNumber = versionParam ? parseInt(versionParam, 10) : undefined;

    const descriptor = await vaultDal.getAssetDownloadDescriptor(
      userId,
      makeAssetId(params.id),
      versionNumber,
      { requesterRole: sessionContext.session?.role }
    );

    return new NextResponse(new Uint8Array(descriptor.plaintext), {
      status: 200,
      headers: {
        'Content-Type': descriptor.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(descriptor.title)}"`,
        'X-Asset-Id': descriptor.assetId,
        'X-Asset-Version': descriptor.versionNumber.toString(),
        'X-Content-SHA256': descriptor.sha256,
      },
    });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    const status = error.statusCode || 500;
    return NextResponse.json(
      {
        error: {
          code: error.code || 'DOWNLOAD_FAILED',
          message: error.message || 'Failed to download asset from vault.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
