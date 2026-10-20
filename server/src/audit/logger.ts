export interface AuditLogPayload {
  id?: string;
  occurredAt?: Date;
  actorType: 'USER' | 'TRUSTEE' | 'BENEFICIARY' | 'ADMIN' | 'WORKER' | 'SYSTEM';
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED' | 'PENDING';
  reasonCode?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}

export interface SanitizedAuditEvent {
  id: string;
  occurredAt: Date;
  actorType: 'USER' | 'TRUSTEE' | 'BENEFICIARY' | 'ADMIN' | 'WORKER' | 'SYSTEM';
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED' | 'PENDING';
  reasonCode?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}

export interface AuditSink {
  write(payload: AuditLogPayload): Promise<void>;
}

/**
 * Global memory audit sink for cross-service testing and development.
 */
export class MemoryAuditSink implements AuditSink {
  public events: SanitizedAuditEvent[] = [];

  async write(payload: AuditLogPayload): Promise<void> {
    // Redact any potential accidental secrets in metadata
    const sanitizedMetadata = payload.metadata ? { ...payload.metadata } : undefined;
    if (sanitizedMetadata) {
      delete (sanitizedMetadata as Record<string, unknown>).password;
      delete (sanitizedMetadata as Record<string, unknown>).token;
      delete (sanitizedMetadata as Record<string, unknown>).dek;
      delete (sanitizedMetadata as Record<string, unknown>).key;
    }

    const event: SanitizedAuditEvent = {
      ...payload,
      id: payload.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      occurredAt: payload.occurredAt || new Date(),
      metadata: sanitizedMetadata,
    };

    this.events.unshift(event);
  }
}

export const globalAuditSink = new MemoryAuditSink();

export class AuditService {
  private sink: AuditSink;

  constructor(sink: AuditSink = globalAuditSink) {
    this.sink = sink;
  }

  async record(payload: AuditLogPayload): Promise<void> {
    await this.sink.write(payload);
  }

  getSink(): AuditSink {
    return this.sink;
  }
}
