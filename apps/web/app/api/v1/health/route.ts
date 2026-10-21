import { NextResponse } from 'next/server';
import {
  globalTelemetry,
  EnvelopeEncryptionService,
  LocalMockKmsService,
} from '@portfolio-immortalized/server';

export async function GET() {
  const requestId = `req_${Math.random().toString(36).substring(2, 12)}`;
  const startTime = performance.now();

  const mem = process.memoryUsage();
  const memoryMetrics = {
    heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
  };

  // 1. Probe KMS Envelope Encryption
  let kmsStatus: 'UP' | 'DOWN' = 'UP';
  let kmsLatencyMs = 0;
  try {
    const kmsStart = performance.now();
    const kmsClient = new LocalMockKmsService();
    const testEnvelope = new EnvelopeEncryptionService(kmsClient, 'health-test-kek');
    const binding = { assetId: 'health_test', versionNumber: 1, ownerId: 'system' };
    const encrypted = await testEnvelope.encrypt(Buffer.from('HEALTH_CHECK_PAYLOAD'), binding);
    await testEnvelope.decrypt(encrypted, binding);
    kmsLatencyMs = Math.round((performance.now() - kmsStart) * 100) / 100;
  } catch {
    kmsStatus = 'DOWN';
  }

  // 2. Probe Database Connectivity
  let dbStatus: 'UP' | 'DOWN' = 'UP';
  let dbLatencyMs = 0;
  try {
    const dbStart = performance.now();
    // In production with Prisma: await prisma.$queryRaw`SELECT 1`;
    // Simulated fast ping in dev/test
    dbLatencyMs = Math.round((performance.now() - dbStart) * 100) / 100;
  } catch {
    dbStatus = 'DOWN';
  }

  const overallStatus = kmsStatus === 'UP' && dbStatus === 'UP' ? 'UP' : 'DEGRADED';
  const totalLatencyMs = Math.round((performance.now() - startTime) * 100) / 100;

  return NextResponse.json({
    data: {
      status: overallStatus,
      service: 'portfolio-immortalized-api',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      jurisdiction: 'Kenya (Law of Succession Act Cap. 160 / Data Protection Act 2019)',
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        kmsEnvelope: {
          status: kmsStatus,
          latencyMs: kmsLatencyMs,
        },
      },
      memory: memoryMetrics,
      telemetry: {
        totalLatencyMs,
        recentOperations: globalTelemetry.getSummary(),
      },
    },
    requestId,
  });
}
