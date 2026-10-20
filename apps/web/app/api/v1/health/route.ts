import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    data: {
      status: 'UP',
      service: 'portfolio-immortalized-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
    requestId: `req_${Math.random().toString(36).substring(2, 12)}`,
  });
}
