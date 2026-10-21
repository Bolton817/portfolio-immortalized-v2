import { NextRequest, NextResponse } from 'next/server';
import { WillDal } from '@portfolio-immortalized/server';
import { CreateWillDraftSchema } from '@portfolio-immortalized/validation';

const willDal = new WillDal();

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'usr_dev_owner_01';
    const will = await willDal.getWill({ userId }, userId);
    return NextResponse.json({
      success: true,
      data: will,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'usr_dev_owner_01';
    const body = await req.json();

    const parsed = CreateWillDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid will draft data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await willDal.createOrUpdateDraft({ userId }, parsed.data);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
