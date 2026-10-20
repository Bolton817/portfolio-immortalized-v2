import { NextRequest, NextResponse } from 'next/server';
import { InviteTrusteeSchema } from '@portfolio-immortalized/validation';
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

  const trustees = await relationshipDal.listTrusteesByOwner(userId);

  return NextResponse.json({
    data: {
      trustees,
      quorumMet: trustees.filter((t) => t.status === 'ACCEPTED').length >= 2,
    },
    requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId || defaultUserId;

    const body = await request.json();
    const parseResult = InviteTrusteeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid trustee invitation data.',
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

    const { relationship, rawInvitationToken } = await relationshipDal.createTrusteeInvitation(
      userId,
      parseResult.data,
      userId
    );

    // In a production environment, Brevo delivers rawInvitationToken via email.
    // For local evaluation, we expose an acceptanceUrl for developer convenience.
    const acceptanceUrl = `/trustee/accept?token=${rawInvitationToken}`;

    return NextResponse.json(
      {
        data: {
          relationship,
          deliveryStatus: 'QUEUED',
          acceptanceUrl, // Accessible for preview/testing
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
