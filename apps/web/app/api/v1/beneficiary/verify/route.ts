import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryVerificationSchema } from '@portfolio-immortalized/validation';
import { beneficiaryDal } from '../../worker/worker-instance';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BeneficiaryVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_VERIFICATION_PAYLOAD', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await beneficiaryDal.verifyRecipientToken(
      parsed.data.token,
      parsed.data.email,
      parsed.data.nationalIdLast4
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; code?: string; message?: string };
    const status = err.statusCode || 401;
    return NextResponse.json(
      { success: false, error: err.code || 'VERIFICATION_FAILED', message: err.message },
      { status }
    );
  }
}
