import { NextRequest, NextResponse } from 'next/server';
import { MpesaService } from '@portfolio-immortalized/server';
import { MpesaStkPushRequestSchema, MpesaCallbackSchema } from '@portfolio-immortalized/validation';

const mpesaService = new MpesaService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if it's an M-Pesa STK callback from Safaricom Daraja
    if (body.Body && body.Body.stkCallback) {
      const parsedCallback = MpesaCallbackSchema.safeParse(body);
      if (!parsedCallback.success) {
        return NextResponse.json({ error: 'Invalid callback format' }, { status: 400 });
      }
      const result = await mpesaService.processCallback(parsedCallback.data);
      return NextResponse.json(result);
    }

    // Otherwise, it's a client request to initiate an STK push
    const parsedRequest = MpesaStkPushRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: 'Invalid STK push request', details: parsedRequest.error.issues },
        { status: 400 }
      );
    }

    // Resolve user session (using mock dev user or auth token)
    const userId = req.headers.get('x-user-id') || 'usr_dev_owner_01';
    const amount = parsedRequest.data.tier === 'HERITAGE' ? 4999 : 19999;

    const response = await mpesaService.initiateStkPush(
      { userId },
      {
        ...parsedRequest.data,
        userId,
        amount,
      }
    );

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
