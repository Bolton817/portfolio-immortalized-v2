/**
 * Sentry Error Tracking Wrapper
 * Provides safe error reporting and lifecycle breadcrumbs without leaking
 * decryption keys, passwords, or confidential vault documents.
 * References: TDD Chapter 28, Security Risk R-18
 */

import { scrubObject, scrubString } from './logger.js';

export interface Breadcrumb {
  timestamp: string;
  category: 'auth' | 'vault' | 'case' | 'release' | 'worker' | 'system';
  message: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

export class SentryService {
  private dsn?: string;
  private environment: string;
  private breadcrumbs: Breadcrumb[] = [];
  private capturedExceptions: Array<{ error: Error; context?: Record<string, unknown> }> = [];

  constructor(dsn?: string, environment: string = process.env.NODE_ENV || 'development') {
    this.dsn = dsn || process.env.SENTRY_DSN;
    this.environment = environment;
  }

  isConfigured(): boolean {
    return Boolean(this.dsn && this.dsn.length > 0);
  }

  getEnvironment(): string {
    return this.environment;
  }

  /**
   * Adds an operational lifecycle breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const sanitizedData = breadcrumb.data ? scrubObject(breadcrumb.data) : undefined;
    const sanitizedMessage = scrubString(breadcrumb.message);

    this.breadcrumbs.push({
      ...breadcrumb,
      message: sanitizedMessage,
      data: sanitizedData,
      timestamp: new Date().toISOString(),
    });

    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Captures an application exception with sanitized context
   */
  captureException(error: Error, context?: Record<string, unknown>): string {
    const eventId = `sentry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sanitizedContext = context ? scrubObject(context) : undefined;

    this.capturedExceptions.push({
      error: new Error(scrubString(error.message)),
      context: sanitizedContext,
    });

    // In actual production deployment with @sentry/node initialized:
    // Sentry.captureException(error, { extra: sanitizedContext });

    return eventId;
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  getCapturedExceptions(): Array<{ error: Error; context?: Record<string, unknown> }> {
    return [...this.capturedExceptions];
  }

  clear(): void {
    this.breadcrumbs = [];
    this.capturedExceptions = [];
  }
}

export const sentry = new SentryService();
