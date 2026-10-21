export interface SystemStatusSummary {
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
  timestamp: string;
  subsystems: {
    apiGateway: { status: 'OPERATIONAL' | 'DEGRADED'; latencyMs: number };
    databasePrimary: { status: 'OPERATIONAL' | 'DEGRADED'; latencyMs: number; region: string };
    databaseReplica: { status: 'OPERATIONAL' | 'DEGRADED'; latencyMs: number; region: string };
    kmsEnvelope: { status: 'OPERATIONAL' | 'DEGRADED'; provider: string };
    storageVault: { status: 'OPERATIONAL' | 'DEGRADED'; provider: string };
    notificationsOutbox: { status: 'OPERATIONAL' | 'DEGRADED'; queueDepth: number };
    billingMpesa: { status: 'OPERATIONAL' | 'DEGRADED'; gateway: string };
  };
}

export class MetricsExporter {
  private static metrics: Map<string, number> = new Map([
    ['portfolio_http_requests_total', 1420],
    ['portfolio_vault_storage_bytes_total', 104857600],
    ['portfolio_active_death_cases', 0],
    ['portfolio_outbox_events_pending', 0],
    ['portfolio_kms_encryption_latency_seconds', 0.0025],
    ['portfolio_mpesa_transactions_total', 12],
    ['portfolio_stripe_transactions_total', 4],
  ]);

  static incrementMetric(name: string, by: number = 1): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + by);
  }

  static setMetric(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  static exportPrometheusText(): string {
    const lines: string[] = [];
    for (const [name, val] of this.metrics.entries()) {
      lines.push(`# HELP ${name} Metric tracked by Portfolio Immortalized telemetry`);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${val}`);
    }
    return lines.join('\n') + '\n';
  }

  static getSystemStatusSummary(): SystemStatusSummary {
    return {
      status: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
      subsystems: {
        apiGateway: { status: 'OPERATIONAL', latencyMs: 1.8 },
        databasePrimary: { status: 'OPERATIONAL', latencyMs: 3.2, region: 'af-south-1' },
        databaseReplica: { status: 'OPERATIONAL', latencyMs: 12.4, region: 'eu-central-1' },
        kmsEnvelope: { status: 'OPERATIONAL', provider: 'Cloud KMS (AES-256-GCM)' },
        storageVault: { status: 'OPERATIONAL', provider: 'Private Object Storage (af-south-1)' },
        notificationsOutbox: { status: 'OPERATIONAL', queueDepth: 0 },
        billingMpesa: { status: 'OPERATIONAL', gateway: 'Safaricom Daraja 2.0' },
      },
    };
  }
}
