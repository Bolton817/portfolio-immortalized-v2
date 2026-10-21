/**
 * Sliding Window Rate Limiter
 * Protects sensitive endpoints (e.g., invitation redemption, beneficiary verification,
 * death reporting, recovery requests) against brute-force attacks and abuse.
 * References: TDD Chapter 27, Requirement AUTH-01, Security Risk R-08, OWASP API2
 */

export interface RateLimitConfig {
  windowMs: number; // Duration of window in milliseconds (e.g. 15 * 60 * 1000)
  maxAttempts: number; // Maximum attempts within the window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  totalAttempts: number;
  retryAfterSeconds: number;
  resetAt: Date;
}

export interface RateLimiterStore {
  recordAttempt(key: string, timestamp: number): Promise<void>;
  getAttempts(key: string, windowStart: number): Promise<number[]>;
  reset(key: string): Promise<void>;
}

/**
 * In-memory sliding-window store suitable for single-node instances and test environments.
 */
export class MemoryRateLimiterStore implements RateLimiterStore {
  private hits: Map<string, number[]> = new Map();

  async recordAttempt(key: string, timestamp: number): Promise<void> {
    const timestamps = this.hits.get(key) || [];
    timestamps.push(timestamp);
    this.hits.set(key, timestamps);
  }

  async getAttempts(key: string, windowStart: number): Promise<number[]> {
    const timestamps = this.hits.get(key) || [];
    const validTimestamps = timestamps.filter((t) => t >= windowStart);
    this.hits.set(key, validTimestamps);
    return validTimestamps;
  }

  async reset(key: string): Promise<void> {
    this.hits.delete(key);
  }
}

export class SlidingWindowRateLimiter {
  private store: RateLimiterStore;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig, store?: RateLimiterStore) {
    this.config = config;
    this.store = store || new MemoryRateLimiterStore();
  }

  /**
   * Evaluates if a request from the given key (IP address, user ID, or token hash) is permitted.
   */
  async check(key: string, now: number = Date.now()): Promise<RateLimitResult> {
    const windowStart = now - this.config.windowMs;
    const pastAttempts = await this.store.getAttempts(key, windowStart);

    if (pastAttempts.length >= this.config.maxAttempts) {
      const oldestAttempt = pastAttempts[0] ?? now;
      const resetTime = oldestAttempt + this.config.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

      return {
        allowed: false,
        remaining: 0,
        totalAttempts: pastAttempts.length,
        retryAfterSeconds,
        resetAt: new Date(resetTime),
      };
    }

    // Record the attempt
    await this.store.recordAttempt(key, now);
    const updatedAttemptsCount = pastAttempts.length + 1;
    const remaining = Math.max(0, this.config.maxAttempts - updatedAttemptsCount);
    const resetAt = new Date(now + this.config.windowMs);

    return {
      allowed: true,
      remaining,
      totalAttempts: updatedAttemptsCount,
      retryAfterSeconds: 0,
      resetAt,
    };
  }

  /**
   * Resets rate limit records for a given key (e.g. after successful authentication or MFA)
   */
  async reset(key: string): Promise<void> {
    await this.store.reset(key);
  }
}

// Default pre-configured limiters for critical endpoints
export const inviteAcceptRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5, // 5 attempts per 15 minutes
});

export const beneficiaryVerifyRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
});

export const deathReportRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3,
});
