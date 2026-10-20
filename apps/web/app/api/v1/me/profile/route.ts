import { NextRequest, NextResponse } from 'next/server';
import { UpdateProfileSchema } from '@portfolio-immortalized/validation';
import {
  ProfileDal,
  calculateProfileReadiness,
  SessionManager,
  makeUserId,
} from '@portfolio-immortalized/server';

// In-memory demo profile store instance for local runtime
const profileDal = new ProfileDal();
const sessionManager = new SessionManager();

// Seed initial profile for the default user
const defaultUserId = makeUserId('usr_owner_demo');
profileDal.createProfile(defaultUserId, 'Alex Johnson');

export async function GET(request: NextRequest) {
  const sessionContext = await sessionManager.resolveSession(request.headers);
  // Default to demo user if unauthenticated in dev
  const userId = sessionContext.session?.userId || defaultUserId;

  let profile = await profileDal.getProfile(userId);
  if (!profile) {
    profile = await profileDal.createProfile(userId, 'Alex Johnson');
  }

  const readiness = calculateProfileReadiness(profile, 0, 0);

  return NextResponse.json({
    data: {
      profile,
      readiness,
    },
    requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionContext = await sessionManager.resolveSession(request.headers);
    const userId = sessionContext.session?.userId || defaultUserId;

    const body = await request.json();
    const parseResult = UpdateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid profile data provided.',
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

    const expectedVersion = typeof body.expectedVersion === 'number' ? body.expectedVersion : 1;
    const updated = await profileDal.updateProfile(userId, parseResult.data, expectedVersion);
    const readiness = calculateProfileReadiness(updated, 0, 0);

    return NextResponse.json({
      data: {
        profile: updated,
        readiness,
      },
      requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    });
  } catch (err) {
    const error = err as Error;
    const isConflict = error.message.includes('Optimistic lock failed');
    return NextResponse.json(
      {
        error: {
          code: isConflict ? 'VERSION_CONFLICT' : 'INTERNAL_ERROR',
          message: error.message,
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
        },
      },
      { status: isConflict ? 409 : 500 }
    );
  }
}
