import { NextRequest, NextResponse } from 'next/server';
import { adminDal } from '../../admin-instance';
import { maskEmail } from '@portfolio-immortalized/domain';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await adminDal.getUserById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'USER_NOT_FOUND', message: `User ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        maskedEmail: maskEmail(user.email),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching admin user detail:', error);
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_GET_USER' },
      { status: 500 }
    );
  }
}
