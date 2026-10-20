import { NextRequest, NextResponse } from 'next/server';
import { aiGatewayService, AIAuthorityViolationError } from '@portfolio-immortalized/server';
import { DocumentClassificationInputSchema } from '@portfolio-immortalized/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = DocumentClassificationInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_FAILED', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await aiGatewayService.classifyDocument(parsed.data);

    return NextResponse.json({
      success: true,
      data: result.output,
      meta: {
        jobId: result.jobId,
        provider: result.provider,
        modelId: result.modelId,
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AIAuthorityViolationError) {
      return NextResponse.json(
        { success: false, error: 'AI_AUTHORITY_VIOLATION', message: error.message },
        { status: 403 }
      );
    }
    console.error('Error in AI document classification:', error);
    return NextResponse.json(
      { success: false, error: 'AI_PROCESSING_FAILED', message: (error as Error).message },
      { status: 500 }
    );
  }
}
