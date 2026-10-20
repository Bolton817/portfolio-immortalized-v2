import { NextRequest, NextResponse } from 'next/server';
import { makeBeneficiaryId, makeUserId } from '@portfolio-immortalized/domain';
import { releaseService } from '@/app/api/v1/cases/case-instance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get('email');
    const beneficiaryIdParam = searchParams.get('beneficiaryId') || req.headers.get('x-beneficiary-id');
    const userIdParam = searchParams.get('userId') || req.headers.get('x-user-id');

    const grants = await releaseService.listGrantsForBeneficiary({
      email: emailParam || undefined,
      beneficiaryId: beneficiaryIdParam ? makeBeneficiaryId(beneficiaryIdParam) : undefined,
      beneficiaryUserId: userIdParam ? makeUserId(userIdParam) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: grants,
      totalCount: grants.length,
    });
  } catch (error: unknown) {
    console.error('Error listing release grants:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
