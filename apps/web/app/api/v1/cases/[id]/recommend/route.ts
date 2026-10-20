import { NextRequest, NextResponse } from 'next/server';
import { SubmitReviewRecommendationSchema, DalAuthorizationError } from '@portfolio-immortalized/server';
import { makeCaseId, makeUserId } from '@portfolio-immortalized/domain';
import { deathCaseDal, demoReviewerId } from '@/app/api/v1/cases/case-instance';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = SubmitReviewRecommendationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const reviewerId = makeUserId(req.headers.get('x-user-id') || demoReviewerId);
    const updatedCase = await deathCaseDal.submitReviewRecommendation(
      makeCaseId(id),
      reviewerId,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: updatedCase,
      message: 'Case review recommendation submitted. Awaiting secondary independent authorization.',
    });
  } catch (error: unknown) {
    if (error instanceof DalAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error submitting review recommendation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
