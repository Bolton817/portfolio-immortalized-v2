import { NextRequest, NextResponse } from 'next/server';
import { TrusteeCoSignSchema, DalAuthorizationError } from '@portfolio-immortalized/server';
import { makeCaseId, makeUserId } from '@portfolio-immortalized/domain';
import { deathCaseDal, demoTrustee2Id } from '@/app/api/v1/cases/case-instance';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = TrusteeCoSignSchema.safeParse({
      ...body,
      caseId: id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const trusteeId = makeUserId(req.headers.get('x-user-id') || demoTrustee2Id);
    const updatedCase = await deathCaseDal.recordTrusteeCoSign(
      makeCaseId(id),
      trusteeId,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: updatedCase,
      message: 'Trustee co-signature attested successfully.',
    });
  } catch (error: unknown) {
    if (error instanceof DalAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error co-signing case:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
