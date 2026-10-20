import { NextRequest, NextResponse } from 'next/server';
import { SubmitDeathReportSchema, DalAuthorizationError } from '@portfolio-immortalized/server';
import { CaseInitiationType, DeathCaseState, makeUserId } from '@portfolio-immortalized/domain';
import { deathCaseDal, defaultOwnerId } from './case-instance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stateParam = searchParams.get('state');
    const ownerIdParam = searchParams.get('ownerId');

    const cases = await deathCaseDal.listCases({
      state: stateParam ? (stateParam as DeathCaseState) : undefined,
      ownerId: ownerIdParam ? makeUserId(ownerIdParam) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: cases,
      totalCount: cases.length,
    });
  } catch (error: unknown) {
    console.error('Error listing cases:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SubmitDeathReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { ownerId, informantStatement, relationshipType } = parsed.data;
    const initiatorId = makeUserId('usr_informant_demo');

    const createdCase = await deathCaseDal.initiateCase(
      makeUserId(ownerId || defaultOwnerId),
      CaseInitiationType.TRUSTEE_REPORT,
      initiatorId,
      {
        statement: informantStatement,
        relationshipType,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: createdCase,
        message: 'Death investigation case initiated successfully.',
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
    console.error('Error submitting death report:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
