import { NextRequest, NextResponse } from 'next/server';
import { beneficiaryDal } from '../../../../../../worker/worker-instance';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; assetId: string } }
) {
  try {
    const sessionToken =
      req.headers.get('X-Beneficiary-Token') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/, '') ||
      new URL(req.url).searchParams.get('token');

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Missing beneficiary session authorization' },
        { status: 401 }
      );
    }

    const session = beneficiaryDal.verifySessionToken(sessionToken);
    const result = await beneficiaryDal.getWatermarkedAsset(session, params.id, params.assetId);

    const headers = new Headers();
    headers.set('Content-Type', result.mimeType);
    headers.set('Content-Disposition', `inline; filename="${result.filename}"`);
    headers.set('X-Forensic-Trace-Hash', result.forensicHash);
    headers.set('X-Watermark-Status', 'applied');
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; code?: string; message?: string };
    const status = err.statusCode || 403;
    return NextResponse.json(
      { success: false, error: err.code || 'ACCESS_DENIED', message: err.message },
      { status }
    );
  }
}
