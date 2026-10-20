import { ListAuditEventsQueryInput } from '@portfolio-immortalized/validation';
import { MemoryAuditSink, SanitizedAuditEvent, globalAuditSink } from './logger.js';

/**
 * Service for querying and exporting tamper-evident audit logs (ADR-010, OPS-001).
 */
export class AuditQueryService {
  private sink: MemoryAuditSink;

  constructor(sink: MemoryAuditSink = globalAuditSink) {
    this.sink = sink;
    this.seedInitialEventsIfEmpty();
  }

  private seedInitialEventsIfEmpty(): void {
    if (this.sink.events.length === 0) {
      const now = Date.now();
      const initialSeed: SanitizedAuditEvent[] = [
        {
          id: `aud_${now - 1000 * 60 * 60 * 24 * 3}_seed1`,
          occurredAt: new Date(now - 1000 * 60 * 60 * 24 * 3),
          actorType: 'ADMIN',
          actorId: 'usr_admin_security',
          action: 'security.keyops.rotation_evaluated',
          targetType: 'KeyManagement',
          targetId: 'KMS_ROOT_ENVELOPE',
          outcome: 'SUCCESS',
          reasonCode: 'ROUTINE_SECURITY_POSTURE_CHECK',
          requestId: 'req_seed_keyops_01',
          metadata: { algorithm: 'AES-256-GCM', keyState: 'ACTIVE' },
        },
        {
          id: `aud_${now - 1000 * 60 * 60 * 24 * 2}_seed2`,
          occurredAt: new Date(now - 1000 * 60 * 60 * 24 * 2),
          actorType: 'USER',
          actorId: 'usr_owner_1',
          action: 'vault.asset_uploaded',
          targetType: 'Asset',
          targetId: 'ast_will_001',
          outcome: 'SUCCESS',
          requestId: 'req_seed_upload_02',
          metadata: { classification: 'C4_CRITICAL_SECRETS', filename: 'primary_will_2026.pdf' },
        },
        {
          id: `aud_${now - 1000 * 60 * 60 * 12}_seed3`,
          occurredAt: new Date(now - 1000 * 60 * 60 * 12),
          actorType: 'ADMIN',
          actorId: 'usr_admin_reviewer',
          action: 'death_case.triage_ai_summary_requested',
          targetType: 'DeathCase',
          targetId: 'case_inactivity_001',
          outcome: 'SUCCESS',
          reasonCode: 'PRELIMINARY_EVIDENCE_ASSESSMENT',
          requestId: 'req_seed_triage_03',
          metadata: { provider: 'mock', confidenceScore: 0.94 },
        },
      ];

      for (const e of initialSeed) {
        this.sink.events.push(e);
      }
    }
  }

  /**
   * Search audit trail events with multi-attribute filtering and pagination.
   */
  async search(query?: Partial<ListAuditEventsQueryInput>): Promise<{
    events: SanitizedAuditEvent[];
    total: number;
    offset: number;
    limit: number;
  }> {
    let results = [...this.sink.events];

    if (query?.actorId) {
      results = results.filter((e) => e.actorId === query.actorId);
    }

    if (query?.actorType) {
      results = results.filter((e) => e.actorType === query.actorType);
    }

    if (query?.action) {
      results = results.filter((e) => e.action.toLowerCase().includes(query.action!.toLowerCase()));
    }

    if (query?.targetType) {
      results = results.filter((e) => e.targetType === query.targetType);
    }

    if (query?.targetId) {
      results = results.filter((e) => e.targetId === query.targetId);
    }

    if (query?.outcome) {
      results = results.filter((e) => e.outcome === query.outcome);
    }

    if (query?.startDate) {
      const start = new Date(query.startDate).getTime();
      results = results.filter((e) => new Date(e.occurredAt).getTime() >= start);
    }

    if (query?.endDate) {
      const end = new Date(query.endDate).getTime();
      results = results.filter((e) => new Date(e.occurredAt).getTime() <= end);
    }

    // Sort descending by timestamp
    results.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    const total = results.length;
    const offset = query?.offset ?? 0;
    const limit = query?.limit ?? 50;
    const paginated = results.slice(offset, offset + limit);

    return {
      events: paginated,
      total,
      offset,
      limit,
    };
  }

  /**
   * Generates RFC 4180 compliant CSV export of audit records (OPS-001).
   */
  async exportCsv(query?: Partial<ListAuditEventsQueryInput>): Promise<string> {
    const searchRes = await this.search({ ...query, offset: 0, limit: 5000 });
    const headers = [
      'id',
      'occurredAt',
      'actorType',
      'actorId',
      'action',
      'targetType',
      'targetId',
      'outcome',
      'reasonCode',
      'requestId',
      'metadata',
    ];

    const escapeCsv = (val: unknown): string => {
      if (val === undefined || val === null) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = [headers.join(',')];

    for (const e of searchRes.events) {
      const row = [
        escapeCsv(e.id),
        escapeCsv(e.occurredAt instanceof Date ? e.occurredAt.toISOString() : new Date(e.occurredAt).toISOString()),
        escapeCsv(e.actorType),
        escapeCsv(e.actorId ?? ''),
        escapeCsv(e.action),
        escapeCsv(e.targetType),
        escapeCsv(e.targetId),
        escapeCsv(e.outcome),
        escapeCsv(e.reasonCode ?? ''),
        escapeCsv(e.requestId),
        escapeCsv(e.metadata ? JSON.stringify(e.metadata) : ''),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\r\n');
  }
}
