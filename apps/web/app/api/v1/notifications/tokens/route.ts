import { NextRequest, NextResponse } from 'next/server';
import { DeviceTokenDal } from '@portfolio-immortalized/server';
import { RegisterDeviceTokenSchema } from '@portfolio-immortalized/validation';

const tokenDal = new DeviceTokenDal();

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'usr_dev_owner_01';
    const body = await req.json();

    const parsed = RegisterDeviceTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid device token format', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const record = await tokenDal.registerToken({ userId }, parsed.data);

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
