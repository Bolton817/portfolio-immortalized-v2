import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@portfolio-immortalized/server';
import { StripeCheckoutRequestSchema } from '@portfolio-immortalized/validation';

const stripeService = new StripeService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if it's a Stripe webhook event
    if (body.type && body.data) {
      const result = await stripeService.handleWebhook(body);
      return NextResponse.json(result);
    }

    // Otherwise, create Checkout Session
    const parsed = StripeCheckoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid checkout request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const userId = req.headers.get('x-user-id') || 'usr_dev_owner_01';
    const userEmail = req.headers.get('x-user-email') || 'owner@estate.ke';

    const response = await stripeService.createCheckoutSession(
      { userId },
      {
        ...parsed.data,
        userId,
        userEmail,
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
