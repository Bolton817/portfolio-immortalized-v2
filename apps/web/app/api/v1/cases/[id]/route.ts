import { NextRequest, NextResponse } from 'next/server';
import { makeCaseId } from '@portfolio-immortalized/domain';
import { DalAuthorizationError } from '@portfolio-immortalized/server';
import { deathCaseDal } from '../case-instance';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseRecord = await deathCaseDal.getCaseById(makeCaseId(id));

    return NextResponse.json({
      success: true,
      data: caseRecord,
    });
  } catch (error: unknown) {
    if (error instanceof DalAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error fetching case details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
