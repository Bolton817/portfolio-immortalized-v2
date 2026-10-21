import { NextResponse } from 'next/server';
import { MetricsExporter } from '@portfolio-immortalized/server';

export async function GET() {
  const summary = MetricsExporter.getSystemStatusSummary();
  return NextResponse.json({
    success: true,
    data: summary,
  });
}
