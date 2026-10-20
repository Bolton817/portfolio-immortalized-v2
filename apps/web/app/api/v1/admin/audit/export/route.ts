import { NextRequest } from 'next/server';
import { auditQueryService } from '../../admin-instance';

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
    };

    const csvContent = await auditQueryService.exportCsv(query);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error exporting audit CSV:', error);
    return new Response('Failed to export audit CSV', { status: 500 });
  }
}
