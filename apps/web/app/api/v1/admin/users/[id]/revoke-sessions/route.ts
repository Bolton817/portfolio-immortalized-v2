import { NextRequest, NextResponse } from 'next/server';
import { RevokeUserSessionsSchema } from '@portfolio-immortalized/validation';
import { adminDal, defaultSecOpsAdminId } from '../../../admin-instance';
import { AdminDalError } from '@portfolio-immortalized/server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = RevokeUserSessionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAYLOAD', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await adminDal.revokeUserSessions(
      id,
      parsed.data.reason,
      defaultSecOpsAdminId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof AdminDalError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Error revoking user sessions:', error);
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_REVOKE_SESSIONS' },
      { status: 500 }
    );
  }
}
