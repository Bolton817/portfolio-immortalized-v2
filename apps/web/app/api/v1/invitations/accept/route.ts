import { NextRequest, NextResponse } from 'next/server';
import { AcceptInvitationSchema } from '@portfolio-immortalized/validation';
import {
  RelationshipDal,
  SessionManager,
  makeUserId,
} from '@portfolio-immortalized/server';

const relationshipDal = new RelationshipDal();
const sessionManager = new SessionManager();
const defaultTrusteeUserId = makeUserId('usr_trustee_demo');

export async function POST(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const acceptingUserId = sessionContext.session?.userId || defaultTrusteeUserId;

    const body = await request.json();
    const parseResult = AcceptInvitationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid invitation acceptance data.',
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

    const updated = await relationshipDal.acceptTrusteeInvitation(
      parseResult.data.token,
      acceptingUserId
    );

    return NextResponse.json({
      data: {
        relationship: updated,
        message: 'Trustee responsibility accepted successfully.',
      },
      requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    });
  } catch (err) {
    const error = err as Error;
    const isClientError =
      error.message.includes('invalid') ||
      error.message.includes('expired') ||
      error.message.includes('already been used');

    return NextResponse.json(
      {
        error: {
          code: isClientError ? 'INVALID_TOKEN' : 'INTERNAL_ERROR',
          message: error.message,
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status: isClientError ? 400 : 500 }
    );
  }
}
