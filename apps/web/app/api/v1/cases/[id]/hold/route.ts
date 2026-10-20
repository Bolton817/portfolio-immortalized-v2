import { NextRequest, NextResponse } from 'next/server';
import {
  PlaceEmergencyHoldSchema,
  ResolveEmergencyHoldSchema,
  DalAuthorizationError,
} from '@portfolio-immortalized/server';
import { makeCaseId, makeUserId } from '@portfolio-immortalized/domain';
import { deathCaseDal, demoSecurityAdminId } from '@/app/api/v1/cases/case-instance';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = PlaceEmergencyHoldSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const adminId = makeUserId(req.headers.get('x-user-id') || demoSecurityAdminId);
    const hold = await deathCaseDal.placeEmergencyHold(
      makeCaseId(id),
      adminId,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: hold,
      message: 'Emergency hold placed successfully. All transitions and releases are frozen.',
    });
  } catch (error: unknown) {
    if (error instanceof DalAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error placing emergency hold:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = ResolveEmergencyHoldSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const adminId = makeUserId(req.headers.get('x-user-id') || demoSecurityAdminId);
    const resolvedHold = await deathCaseDal.resolveEmergencyHold(
      makeCaseId(id),
      adminId,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: resolvedHold,
      message: 'Emergency hold resolved. Case restored to UNDER_REVIEW.',
    });
  } catch (error: unknown) {
    if (error instanceof DalAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error resolving emergency hold:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
