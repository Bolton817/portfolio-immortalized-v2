import { NextRequest, NextResponse } from 'next/server';
import { BillingDal, TIER_QUOTAS } from '@portfolio-immortalized/server';

const billingDal = new BillingDal();

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'usr_dev_owner_01';
    const sub = await billingDal.getSubscription(userId);
    const quota = TIER_QUOTAS[sub.tier];
    const invoices = await billingDal.getUserInvoices({ userId }, userId);

    return NextResponse.json({
      success: true,
      data: {
        subscription: sub,
        quota,
        invoices,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
