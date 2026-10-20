import { NextRequest, NextResponse } from 'next/server';
import { UpdateUserStatusSchema } from '@portfolio-immortalized/validation';
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

    const parsed = UpdateUserStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAYLOAD', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updatedUser = await adminDal.updateUserStatus(
      id,
      parsed.data.status,
      parsed.data.reason,
      defaultSecOpsAdminId
    );

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error: unknown) {
    if (error instanceof AdminDalError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Error updating user status:', error);
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_UPDATE_USER_STATUS' },
      { status: 500 }
    );
  }
}
