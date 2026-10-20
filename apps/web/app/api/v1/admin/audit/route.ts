import { NextRequest, NextResponse } from 'next/server';
import { ListAuditEventsQuerySchema } from '@portfolio-immortalized/validation';
import { auditQueryService } from '../admin-instance';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = {
      actorId: searchParams.get('actorId') || undefined,
      actorType: searchParams.get('actorType') || undefined,
      action: searchParams.get('action') || undefined,
      targetType: searchParams.get('targetType') || undefined,
      targetId: searchParams.get('targetId') || undefined,
      outcome: (searchParams.get('outcome') as 'SUCCESS' | 'DENIED' | 'FAILED' | 'PENDING') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 50,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : 0,
    };

    const parsed = ListAuditEventsQuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_QUERY', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await auditQueryService.search(parsed.data);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Error querying audit events:', error);
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_QUERY_AUDIT_EVENTS' },
      { status: 500 }
    );
  }
}
