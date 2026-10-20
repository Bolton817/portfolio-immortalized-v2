import { NextRequest, NextResponse } from 'next/server';
import { CommitUploadPayloadSchema } from '@portfolio-immortalized/validation';
import { SessionManager, makeUserId, makeAssetId } from '@portfolio-immortalized/server';
import { vaultDal, defaultVaultOwnerId } from '../vault-instance';

const sessionManager = new SessionManager();

export async function POST(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId
      ? makeUserId(sessionContext.session.userId)
      : defaultVaultOwnerId;

    const body = await request.json();
    const parseResult = CommitUploadPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid upload commit payload.',
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

    const { assetId, versionNumber, declaredSha256, mimeType, payloadBase64 } = parseResult.data;
    const plaintextPayload = Buffer.from(payloadBase64, 'base64');

    const asset = await vaultDal.commitUpload(
      userId,
      makeAssetId(assetId),
      versionNumber,
      plaintextPayload,
      declaredSha256,
      mimeType
    );

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
          code: error.code || 'COMMIT_FAILED',
          message: error.message || 'Failed to commit vault upload.',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status }
    );
  }
}
