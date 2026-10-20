import { NextRequest, NextResponse } from 'next/server';
import { InactivitySweepQuerySchema } from '@portfolio-immortalized/server';
import { inactivityService } from '@/app/api/v1/cases/case-instance';

export async function POST(req: NextRequest) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body allowed
    }

    const parsed = InactivitySweepQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await inactivityService.executeSweep();

    return NextResponse.json({
      success: true,
      data: result,
      message: `Inactivity sweep completed. Evaluated: ${result.totalEvaluated}, Reminders: ${result.remindersDispatched}, Investigations Opened: ${result.investigationsOpened}.`,
    });
  } catch (error: unknown) {
    console.error('Error executing inactivity sweep:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
