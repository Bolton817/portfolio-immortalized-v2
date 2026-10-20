import { NextRequest, NextResponse } from 'next/server';
import { ToggleSystemHoldSchema } from '@portfolio-immortalized/validation';
import { adminDal, defaultSecOpsAdminId } from '../../admin-instance';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = ToggleSystemHoldSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAYLOAD', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await adminDal.toggleSystemHold(
      parsed.data.active,
      parsed.data.reasonCode,
      parsed.data.rationale,
      defaultSecOpsAdminId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Error toggling system emergency hold:', error);
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_TOGGLE_SYSTEM_HOLD' },
      { status: 500 }
    );
  }
}
