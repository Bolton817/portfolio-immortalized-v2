/**
 * Operational Telemetry & Latency Metrics
 * Tracks database query durations, KMS envelope unwrap latencies, and outbox throughput.
 * References: TDD Chapter 28, Requirements OPS-01, OPS-02
 */

export interface LatencyMetric {
  operation: string;
  durationMs: number;
  timestamp: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface MetricSummary {
  operation: string;
  count: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  successRatePercent: number;
}

export class TelemetryService {
  private metrics: LatencyMetric[] = [];
  private maxRecords: number;

  constructor(maxRecords: number = 1000) {
    this.maxRecords = maxRecords;
  }

  /**
   * Times an asynchronous operation and records its latency metric.
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    let success = true;
    try {
      const result = await fn();
      return { result, durationMs: performance.now() - start };
    } catch (err) {
      success = false;
      throw err;
    } finally {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      this.record({
        operation,
        durationMs,
        timestamp: new Date().toISOString(),
        success,
        metadata,
      });
    }
  }

  /**
   * Records a discrete latency metric.
   */
  record(metric: LatencyMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxRecords) {
      this.metrics.shift();
    }
  }

  /**
   * Retrieves summary statistics for a given operation name or all operations.
   */
  getSummary(operation?: string): MetricSummary[] {
    const filtered = operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;

    const groups = new Map<string, LatencyMetric[]>();
    for (const m of filtered) {
      const list = groups.get(m.operation) || [];
      list.push(m);
      groups.set(m.operation, list);
    }

    const summaries: MetricSummary[] = [];
    for (const [op, records] of groups.entries()) {
      const count = records.length;
      if (count === 0) continue;

      const totalDuration = records.reduce((sum, r) => sum + r.durationMs, 0);
      const minDuration = Math.min(...records.map((r) => r.durationMs));
      const maxDuration = Math.max(...records.map((r) => r.durationMs));
      const successfulCount = records.filter((r) => r.success).length;

      summaries.push({
        operation: op,
        count,
        avgDurationMs: Math.round((totalDuration / count) * 100) / 100,
        minDurationMs: minDuration,
        maxDurationMs: maxDuration,
        successRatePercent: Math.round((successfulCount / count) * 10000) / 100,
      });
    }

    return summaries;
  }

  /**
   * Clears in-memory metrics (useful for test isolates).
   */
  clear(): void {
    this.metrics = [];
  }
}

export const globalTelemetry = new TelemetryService();
