import { NextRequest, NextResponse } from 'next/server';
import { aiGatewayService } from '@portfolio-immortalized/server';
import { AITaskStatus } from '@portfolio-immortalized/domain';
import { ListAIJobsSchema } from '@portfolio-immortalized/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = {
      taskName: searchParams.get('taskName') || undefined,
      status: (searchParams.get('status') as AITaskStatus) || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
      cursor: searchParams.get('cursor') || undefined,
    };


    const parsed = ListAIJobsSchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_QUERY', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const jobs = await aiGatewayService.listJobs(parsed.data);

    return NextResponse.json({
      success: true,
      data: jobs,
      totalCount: jobs.length,
    });
  } catch (error: unknown) {
    console.error('Error listing AI jobs:', error);
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_LIST_AI_JOBS' },
      { status: 500 }
    );
  }
}
