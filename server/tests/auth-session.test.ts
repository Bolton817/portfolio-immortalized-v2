import { describe, it, expect } from 'vitest';
import { SessionManager } from '../src/index.js';

describe('SessionManager (TDD Chapter 21)', () => {
  const sessionManager = new SessionManager('test-secret-key-32-chars-minimum!');

  it('rejects requests without any session credentials', async () => {
    const headers = new Headers();
    const result = await sessionManager.resolveSession(headers);

    expect(result.session).toBeNull();
    expect(result.error).toBe('NO_SESSION_CREDENTIAL_PROVIDED');
    expect(() => sessionManager.assertAuthenticated(result)).toThrow('AUTH_REQUIRED');
  });

  it('resolves valid mock bearer session token for testing', async () => {
    const headers = new Headers();
    headers.set('Authorization', 'Bearer mock_user_usr123_CASE_REVIEWER');

    const result = await sessionManager.resolveSession(headers);

    expect(result.session).not.toBeNull();
    expect(result.session?.userId).toBe('usr123');
    expect(result.session?.role).toBe('CASE_REVIEWER');
    expect(result.session?.emailVerified).toBe(true);
    expect(() => sessionManager.assertAuthenticated(result)).not.toThrow();
  });

  it('rejects invalid or malformed bearer token', async () => {
    const headers = new Headers();
    headers.set('Authorization', 'Bearer invalid_garbage_token');

    const result = await sessionManager.resolveSession(headers);

    expect(result.session).toBeNull();
    expect(result.error).toBe('INVALID_OR_EXPIRED_SESSION');
  });
});
