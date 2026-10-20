import { NextRequest, NextResponse } from 'next/server';
import { WorkerTickSchema } from '@portfolio-immortalized/validation';
import { backgroundWorker } from '../worker-instance';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const parsed = WorkerTickSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_TICK_PARAMS', details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Optional secret check if WORKER_SECRET is configured
    const expectedSecret = process.env.WORKER_SECRET;
    if (expectedSecret) {
      const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/, '');
      const providedSecret = req.headers.get('x-worker-secret') || parsed.data.secret || authHeader;
      if (providedSecret !== expectedSecret) {
        return NextResponse.json(
          { success: false, error: 'UNAUTHORIZED_WORKER', message: 'Invalid worker secret' },
          { status: 401 }
        );
      }
    }

    const result = await backgroundWorker.runTick({
      processLimit: parsed.data.processOutboxLimit,
    });

    return NextResponse.json({
      success: true,
      data: {
        sweptCases: result.inactivity.investigationsOpened,
        processedOutbox: result.outbox.processed,
        expiredGrants: result.expiredGrantsCount,
        summary: result,
      },
    });
  } catch (error: unknown) {
    console.error('Worker tick execution error:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: 'WORKER_TICK_FAILED', message: err.message },
      { status: 500 }
    );
  }
}
