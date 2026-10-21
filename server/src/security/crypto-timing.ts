/**
 * Cryptographic Timing Attack Resistance Utilities
 * Enforces constant-time comparisons for token hashes, signature validations,
 * and secret authentication challenges to prevent side-channel timing leaks.
 * References: TDD Chapter 27, Security Risk R-08, OWASP API2
 */

import { timingSafeEqual } from 'crypto';

/**
 * Performs a constant-time comparison between two strings or buffers.
 * If the lengths differ, it performs a dummy comparison before returning false
 * to prevent leaking the target string's length through early exit timing.
 */
export function safeTimingEqual(a: string | Buffer, b: string | Buffer): boolean {
  const bufA = typeof a === 'string' ? Buffer.from(a, 'utf8') : a;
  const bufB = typeof b === 'string' ? Buffer.from(b, 'utf8') : b;

  if (bufA.length !== bufB.length) {
    // Perform a dummy timingSafeEqual comparison with bufA against itself
    // to keep timing relatively uniform instead of an instantaneous return
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}
