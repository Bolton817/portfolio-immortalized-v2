import * as crypto from 'crypto';

export interface GeneratedInvitationToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Generates a cryptographically secure, single-use random token for invitations.
 * Per TDD Chapter 10.4: The raw token is returned only to the email delivery service,
 * while only the SHA-256 hash is persisted in the database.
 */
export function generateInvitationToken(expiryDays: number = 7): GeneratedInvitationToken {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

/**
 * Computes deterministic SHA-256 hash for database indexing and token verification.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Checks whether an invitation token has expired.
 */
export function isTokenExpired(expiresAt: Date, referenceTime: Date = new Date()): boolean {
  return referenceTime.getTime() > expiresAt.getTime();
}
