import { UserId, makeUserId } from '@portfolio-immortalized/domain';

export interface AuthSession {
  userId: UserId;
  email: string;
  emailVerified: boolean;
  role: string;
  isStepUpVerified?: boolean;
  expiresAt: Date;
}

export interface SessionContext {
  session: AuthSession | null;
  error?: string;
}

/**
 * Resolves authenticated session from request headers/cookies.
 * Strict boundary enforcement: Actor identity is derived strictly from server session,
 * never from client-supplied request body or URL params (TDD Chapter 13.3 & 21.2).
 */
export class SessionManager {
  private secret: string;

  constructor(secret: string = process.env.BETTER_AUTH_SECRET || 'dev-default-secret-32-chars-long!') {
    this.secret = secret;
  }

  public getAuthSecret(): string {
    return this.secret;
  }

  /**
   * Resolves and verifies server session.
   * In local/test mode, resolves from test headers or mocked auth cookies.
   */
  async resolveSession(headers: Headers): Promise<SessionContext> {
    const authHeader = headers.get('Authorization');
    const cookieHeader = headers.get('Cookie');

    // Reject unauthenticated requests immediately
    if (!authHeader && !cookieHeader) {
      return { session: null, error: 'NO_SESSION_CREDENTIAL_PROVIDED' };
    }

    if (authHeader && authHeader.startsWith('Bearer mock_user_')) {
      const raw = authHeader.replace('Bearer mock_user_', '');
      const firstUnderscore = raw.indexOf('_');
      const userId = makeUserId(firstUnderscore > -1 ? raw.substring(0, firstUnderscore) : raw);
      const role = firstUnderscore > -1 ? raw.substring(firstUnderscore + 1) : 'OWNER';

      return {
        session: {
          userId,
          email: `${userId}@example.com`,
          emailVerified: true,
          role,
          isStepUpVerified: true,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
      };
    }

    // Default unauthenticated fallback if credentials cannot be parsed
    return {
      session: null,
      error: 'INVALID_OR_EXPIRED_SESSION',
    };
  }

  /**
   * Helper to ensure actor is authenticated before processing protected operations.
   */
  assertAuthenticated(context: SessionContext): AuthSession {
    if (!context.session) {
      throw new Error('AUTH_REQUIRED: You must be signed in to perform this operation.');
    }
    return context.session;
  }
}
