/**
 * Production Structured JSON Logger with Automated PII Scrubbing
 * Adheres to Kenya Data Protection Act 2019 data minimization principles
 * and prevents accidental leakage of DEKs, credentials, and sensitive personal identifiers.
 * References: TDD Chapter 28, Security Risks R-16, R-18
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  traceId?: string;
  userId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerSink {
  write(entry: StructuredLogEntry): void;
}

export class ConsoleLoggerSink implements LoggerSink {
  write(entry: StructuredLogEntry): void {
    const json = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(json);
    } else if (entry.level === 'warn') {
      console.warn(json);
    } else {
      console.log(json);
    }
  }
}

export class MemoryLoggerSink implements LoggerSink {
  public entries: StructuredLogEntry[] = [];

  write(entry: StructuredLogEntry): void {
    this.entries.unshift(entry);
  }

  clear(): void {
    this.entries = [];
  }
}

/**
 * PII and Secret Redaction Patterns
 */
const KENYAN_ID_REGEX = /\b(?:ID|ID NO|NATIONAL ID|ID NUMBER)?\s*(?:[:#=\s])*\b(\d{7,8})\b/gi;
const KENYAN_PHONE_REGEX = /(?:\+?254|0)(?:7\d{8}|1\d{8})\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_TOKEN_REGEX = /Bearer\s+([A-Za-z0-9_\-\.]{15,})/gi;
const SENSITIVE_KEY_NAMES = new Set([
  'password',
  'token',
  'secret',
  'dek',
  'kek',
  'key',
  'apiKey',
  'authorization',
  'cookie',
  'credential',
]);

export function scrubString(str: string): string {
  return str
    .replace(BEARER_TOKEN_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(KENYAN_ID_REGEX, '[REDACTED_KENYAN_ID]')
    .replace(KENYAN_PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
}

export function scrubObject<T>(val: T): T {
  if (val === null || val === undefined) {
    return val;
  }

  if (typeof val === 'string') {
    return scrubString(val) as unknown as T;
  }

  if (Array.isArray(val)) {
    return val.map((item) => scrubObject(item)) as unknown as T;
  }

  if (typeof val === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEY_NAMES.has(k.toLowerCase())) {
        copy[k] = '[REDACTED_SECRET]';
      } else {
        copy[k] = scrubObject(v);
      }
    }
    return copy as T;
  }

  return val;
}

export class StructuredLogger {
  private service: string;
  private sinks: LoggerSink[];

  constructor(service: string = 'portfolio-immortalized', sinks?: LoggerSink[]) {
    this.service = service;
    this.sinks = sinks || [new ConsoleLoggerSink()];
  }

  log(
    level: LogLevel,
    message: string,
    metadata?: {
      traceId?: string;
      userId?: string;
      context?: Record<string, unknown>;
      error?: Error;
    }
  ): StructuredLogEntry {
    const sanitizedMessage = scrubString(message);
    const sanitizedContext = metadata?.context ? scrubObject(metadata.context) : undefined;

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message: sanitizedMessage,
      traceId: metadata?.traceId,
      userId: metadata?.userId,
      context: sanitizedContext,
      error: metadata?.error
        ? {
            name: metadata.error.name,
            message: scrubString(metadata.error.message),
            stack: metadata.error.stack ? scrubString(metadata.error.stack) : undefined,
          }
        : undefined,
    };

    for (const sink of this.sinks) {
      sink.write(entry);
    }

    return entry;
  }

  debug(message: string, metadata?: Parameters<StructuredLogger['log']>[2]): StructuredLogEntry {
    return this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Parameters<StructuredLogger['log']>[2]): StructuredLogEntry {
    return this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Parameters<StructuredLogger['log']>[2]): StructuredLogEntry {
    return this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Parameters<StructuredLogger['log']>[2]): StructuredLogEntry {
    return this.log('error', message, metadata);
  }
}

export const globalMemoryLoggerSink = new MemoryLoggerSink();
export const logger = new StructuredLogger('portfolio-immortalized-api', [
  new ConsoleLoggerSink(),
  globalMemoryLoggerSink,
]);
