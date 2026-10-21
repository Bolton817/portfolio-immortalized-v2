import {
  SubscriptionRecord,
  InvoiceRecord,
  SubscriptionTier,
  BillingCycle,
  SubscriptionStatus,
  PaymentGateway,
} from '@portfolio-immortalized/domain';
import { assertOwnerAccess } from './tenancy.js';
import { AuditService } from '../audit/logger.js';
import crypto from 'crypto';

export class BillingDal {
  private subscriptions: Map<string, SubscriptionRecord> = new Map(); // key = userId
  private invoices: Map<string, InvoiceRecord> = new Map(); // key = invoiceId
  private auditService: AuditService;

  constructor(auditService: AuditService = new AuditService()) {
    this.auditService = auditService;
  }

  async getSubscription(userId: string): Promise<SubscriptionRecord> {
    let sub = this.subscriptions.get(userId);
    if (!sub) {
      // Default to STARTER tier
      const now = new Date();
      const nextYear = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
      sub = {
        id: `sub_${crypto.randomBytes(8).toString('hex')}`,
        userId,
        tier: SubscriptionTier.STARTER,
        cycle: BillingCycle.ANNUAL,
        status: SubscriptionStatus.ACTIVE,
        gateway: PaymentGateway.MPESA,
        currentPeriodStart: now,
        currentPeriodEnd: nextYear,
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now,
      };
      this.subscriptions.set(userId, sub);
    }
    return { ...sub };
  }

  async updateSubscription(
    session: { userId: string; role?: string },
    tier: SubscriptionTier,
    cycle: BillingCycle,
    gateway: PaymentGateway,
    externalSubscriptionId?: string
  ): Promise<SubscriptionRecord> {
    assertOwnerAccess(session.userId, session.userId);

    const now = new Date();
    const durationDays = cycle === BillingCycle.MONTHLY ? 30 : cycle === BillingCycle.ANNUAL ? 365 : 36500;
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 3600 * 1000);

    const existing = await this.getSubscription(session.userId);
    const updated: SubscriptionRecord = {
      ...existing,
      tier,
      cycle,
      status: SubscriptionStatus.ACTIVE,
      gateway,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      externalSubscriptionId: externalSubscriptionId || existing.externalSubscriptionId,
      updatedAt: now,
    };

    this.subscriptions.set(session.userId, updated);

    await this.auditService.record({
      actorType: 'USER',
      actorId: session.userId,
      action: 'billing.subscription.updated',
      targetType: 'Subscription',
      targetId: updated.id,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        tier,
        cycle,
        gateway,
      },
    });

    return { ...updated };
  }

  async recordInvoice(invoice: Omit<InvoiceRecord, 'id' | 'createdAt'>): Promise<InvoiceRecord> {
    const id = `inv_${crypto.randomBytes(8).toString('hex')}`;
    const record: InvoiceRecord = {
      ...invoice,
      id,
      createdAt: new Date(),
    };
    this.invoices.set(id, record);

    await this.auditService.record({
      actorType: 'USER',
      actorId: invoice.userId,
      action: 'billing.invoice.recorded',
      targetType: 'Invoice',
      targetId: id,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
      },
    });

    return record;
  }

  async getUserInvoices(session: { userId: string; role?: string }, userId: string): Promise<InvoiceRecord[]> {
    assertOwnerAccess(session.userId, userId);
    const list: InvoiceRecord[] = [];
    for (const inv of this.invoices.values()) {
      if (inv.userId === userId) {
        list.push({ ...inv });
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
