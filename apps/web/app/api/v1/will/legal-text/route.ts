import { NextRequest, NextResponse } from 'next/server';
import { WillDal } from '@portfolio-immortalized/server';

const willDal = new WillDal();

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'usr_dev_owner_01';
    const text = await willDal.getLegalText({ userId }, userId);
    return NextResponse.json({
      success: true,
      data: { legalText: text },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
