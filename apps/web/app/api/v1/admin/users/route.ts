import { NextRequest, NextResponse } from 'next/server';
import { ListAdminUsersQuerySchema } from '@portfolio-immortalized/validation';
import { adminDal } from '../admin-instance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
      cursor: searchParams.get('cursor') || undefined,
    };

    const parsed = ListAdminUsersQuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_QUERY', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await adminDal.listUsers(parsed.data);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Error listing admin users:', error);
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_LIST_USERS' },
      { status: 500 }
    );
  }
}
