import { NextRequest, NextResponse } from 'next/server';
import { CreateBeneficiarySchema } from '@portfolio-immortalized/validation';
import {
  RelationshipDal,
  SessionManager,
  makeUserId,
} from '@portfolio-immortalized/server';

const relationshipDal = new RelationshipDal();
const sessionManager = new SessionManager();
const defaultUserId = makeUserId('usr_owner_demo');

export async function GET(request: NextRequest) {
  const sessionContext = await sessionManager.resolveSession(request.headers);
  const userId = sessionContext.session?.userId || defaultUserId;

  const beneficiaries = await relationshipDal.listBeneficiariesByOwner(userId);

  return NextResponse.json({
    data: {
      beneficiaries,
      count: beneficiaries.length,
    },
    requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId || defaultUserId;

    const body = await request.json();
    const parseResult = CreateBeneficiarySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid beneficiary data provided.',
            requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
            details: parseResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const beneficiary = await relationshipDal.createBeneficiary(
      userId,
      parseResult.data,
      userId
    );

    return NextResponse.json(
      {
        data: {
          beneficiary,
        },
        requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
      },
      { status: 201 }
    );
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status: 500 }
    );
  }
}
