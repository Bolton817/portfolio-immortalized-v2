import { NextRequest, NextResponse } from 'next/server';
import { WillDal } from '@portfolio-immortalized/server';
import { PhysicalCustodySchema } from '@portfolio-immortalized/validation';

const willDal = new WillDal();

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'usr_dev_owner_01';
    const body = await req.json();

    const parsed = PhysicalCustodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid physical custody details', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updatedWill = await willDal.recordPhysicalCustody({ userId }, parsed.data);

    return NextResponse.json({
      success: true,
      data: updatedWill,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
