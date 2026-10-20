import { NextRequest, NextResponse } from 'next/server';
import { SubmitCaseEvidenceSchema, DalAuthorizationError } from '@portfolio-immortalized/server';
import { makeCaseId, makeUserId } from '@portfolio-immortalized/domain';
import { deathCaseDal, demoTrustee1Id } from '@/app/api/v1/cases/case-instance';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = SubmitCaseEvidenceSchema.safeParse({
      ...body,
      caseId: id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const submitterId = makeUserId(req.headers.get('x-user-id') || demoTrustee1Id);
    const evidence = await deathCaseDal.submitEvidence(
      makeCaseId(id),
      submitterId,
      parsed.data
    );

    return NextResponse.json(
      {
        success: true,
        data: evidence,
        message: 'Evidence submitted successfully and pending reviewer verification.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof DalAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error submitting evidence:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
