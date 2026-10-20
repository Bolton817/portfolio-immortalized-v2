import { NextRequest, NextResponse } from 'next/server';
import { BrevoWebhookPayloadSchema } from '@portfolio-immortalized/validation';
import { verifyBrevoWebhookSignature } from '@portfolio-immortalized/server';
import { caseAuditService } from '../../cases/case-instance';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-sib-signature') || req.headers.get('x-brevo-signature');

    const isValid = verifyBrevoWebhookSignature({
      rawBody,
      signatureHeader: signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' },
        { status: 401 }
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'INVALID_JSON', message: 'Failed to parse JSON body' },
        { status: 400 }
      );
    }

    const parsed = BrevoWebhookPayloadSchema.safeParse(parsedBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'INVALID_WEBHOOK_PAYLOAD', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const event = parsed.data;

    await caseAuditService.record({
      actorType: 'SYSTEM',
      actorId: 'brevo_webhook',
      action: `brevo.email_${event.event}`,
      targetType: 'NotificationMessage',
      targetId: event.messageId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        email: event.email,
        tag: event.tag,
        ts_event: event.ts_event,
      },
    });

    return NextResponse.json({
      success: true,
      received: true,
      event: event.event,
    });
  } catch (error: unknown) {
    console.error('Brevo webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'WEBHOOK_PROCESSING_FAILED' },
      { status: 500 }
    );
  }
}
