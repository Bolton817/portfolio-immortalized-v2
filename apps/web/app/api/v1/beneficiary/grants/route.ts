import { NextRequest, NextResponse } from 'next/server';
import { beneficiaryDal } from '../../worker/worker-instance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.headers.get('X-Beneficiary-Token') || req.headers.get('authorization')?.replace(/^Bearer\s+/, '');
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Missing X-Beneficiary-Token header' },
        { status: 401 }
      );
    }

    const session = beneficiaryDal.verifySessionToken(sessionToken);
    const grants = await beneficiaryDal.listAuthorizedGrants(session);

    return NextResponse.json({
      success: true,
      data: { grants },
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; code?: string; message?: string };
    const status = err.statusCode || 401;
    return NextResponse.json(
      { success: false, error: err.code || 'UNAUTHORIZED', message: err.message },
      { status }
    );
  }
}
