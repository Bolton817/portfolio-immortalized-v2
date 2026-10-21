import {
  StripeCheckoutRequest,
  StripeCheckoutResponse,
  PaymentGateway,
  SubscriptionTier,
  BillingCycle,
} from '@portfolio-immortalized/domain';
import { BillingDal } from '../dal/billing-dal.js';
import { StructuredLogger } from '../observability/logger.js';
import { AuditService } from '../audit/logger.js';
import crypto from 'crypto';

export class StripeService {
  private billingDal: BillingDal;
  private logger: StructuredLogger;
  private auditService: AuditService;
  public checkoutSessions: Map<string, { userId: string; tier: SubscriptionTier; cycle: BillingCycle; amount: number }> = new Map();

  constructor(options: {
    billingDal?: BillingDal;
    logger?: StructuredLogger;
    auditService?: AuditService;
    apiKey?: string;
  } = {}) {
    this.logger = options.logger || new StructuredLogger();
    this.auditService = options.auditService || new AuditService();
    this.billingDal = options.billingDal || new BillingDal(this.auditService);
  }

  async createCheckoutSession(
    session: { userId: string; role?: string },
    req: StripeCheckoutRequest
  ): Promise<StripeCheckoutResponse> {
    const sessionId = `cs_test_${crypto.randomBytes(12).toString('hex')}`;
    const amount = req.tier === SubscriptionTier.HERITAGE ? 39.99 : 149.99;

    this.checkoutSessions.set(sessionId, {
      userId: session.userId,
      tier: req.tier,
      cycle: req.cycle,
      amount,
    });

    const checkoutUrl = `https://checkout.stripe.com/pay/${sessionId}`;

    this.logger.info('Created Stripe Checkout Session', {
      context: {
        sessionId,
        userId: session.userId,
        tier: req.tier,
        cycle: req.cycle,
      },
    });

    await this.auditService.record({
      actorType: 'USER',
      actorId: session.userId,
      action: 'billing.stripe.checkout_created',
      targetType: 'StripeSession',
      targetId: sessionId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        tier: req.tier,
        cycle: req.cycle,
      },
    });

    return {
      sessionId,
      checkoutUrl,
    };
  }

  async handleWebhook(event: {
    type: string;
    data: { object: { id: string; client_reference_id?: string; customer?: string; subscription?: string; amount_total?: number; currency?: string } };
  }): Promise<{ success: boolean; handled: boolean }> {
    const obj = event.data.object;

    if (event.type === 'checkout.session.completed') {
      const sessionId = obj.id;
      const stored = this.checkoutSessions.get(sessionId);

      if (stored) {
        await this.billingDal.updateSubscription(
          { userId: stored.userId },
          stored.tier,
          stored.cycle,
          PaymentGateway.STRIPE,
          obj.subscription || obj.id
        );

        await this.billingDal.recordInvoice({
          subscriptionId: `sub_${stored.userId}`,
          userId: stored.userId,
          amount: stored.amount,
          currency: (obj.currency?.toUpperCase() as 'USD' | 'EUR' | 'GBP') || 'USD',
          gateway: PaymentGateway.STRIPE,
          transactionReference: obj.id,
          paidAt: new Date(),
          status: 'PAID',
        });

        this.checkoutSessions.delete(sessionId);

        this.logger.info('Stripe checkout completed, subscription activated', {
          context: {
            sessionId,
            userId: stored.userId,
            tier: stored.tier,
          },
        });

        return { success: true, handled: true };
      }
    }

    return { success: true, handled: false };
  }
}
