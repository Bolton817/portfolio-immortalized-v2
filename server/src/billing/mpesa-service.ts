import {
  MpesaStkPushRequest,
  MpesaStkPushResponse,
  MpesaCallbackPayload,
  PaymentGateway,
  SubscriptionTier,
  BillingCycle,
} from '@portfolio-immortalized/domain';
import { BillingDal } from '../dal/billing-dal.js';
import { StructuredLogger } from '../observability/logger.js';
import { AuditService } from '../audit/logger.js';
import crypto from 'crypto';

export interface PendingMpesaTransaction {
  merchantRequestId: string;
  checkoutRequestId: string;
  userId: string;
  phoneNumber: string;
  amount: number;
  tier: SubscriptionTier;
  cycle: BillingCycle;
  createdAt: Date;
}

export class MpesaService {
  private billingDal: BillingDal;
  private logger: StructuredLogger;
  private auditService: AuditService;
  private businessShortCode: string;
  private passkey: string;
  public pendingTransactions: Map<string, PendingMpesaTransaction> = new Map(); // key = checkoutRequestId

  constructor(options: {
    billingDal?: BillingDal;
    logger?: StructuredLogger;
    auditService?: AuditService;
    businessShortCode?: string;
    passkey?: string;
  } = {}) {
    this.logger = options.logger || new StructuredLogger();
    this.auditService = options.auditService || new AuditService();
    this.billingDal = options.billingDal || new BillingDal(this.auditService);
    this.businessShortCode = options.businessShortCode || process.env.MPESA_SHORTCODE || '174379';
    this.passkey = options.passkey || process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
  }

  generatePassword(timestamp: string): string {
    const raw = `${this.businessShortCode}${this.passkey}${timestamp}`;
    return Buffer.from(raw).toString('base64');
  }

  async initiateStkPush(
    session: { userId: string; role?: string },
    req: MpesaStkPushRequest
  ): Promise<MpesaStkPushResponse> {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = this.generatePassword(timestamp);

    const merchantRequestId = `mr_${crypto.randomBytes(6).toString('hex')}`;
    const checkoutRequestId = `ws_CO_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;

    const pendingTx: PendingMpesaTransaction = {
      merchantRequestId,
      checkoutRequestId,
      userId: session.userId,
      phoneNumber: req.phoneNumber,
      amount: req.amount,
      tier: req.tier,
      cycle: req.cycle,
      createdAt: new Date(),
    };

    this.pendingTransactions.set(checkoutRequestId, pendingTx);

    this.logger.info('Initiated M-Pesa STK Push', {
      context: {
        merchantRequestId,
        checkoutRequestId,
        userId: session.userId,
        amount: req.amount,
        tier: req.tier,
        hasAuth: Boolean(password),
      },
    });

    await this.auditService.record({
      actorType: 'USER',
      actorId: session.userId,
      action: 'billing.mpesa.stk_push_initiated',
      targetType: 'MpesaTransaction',
      targetId: checkoutRequestId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        amount: req.amount,
        tier: req.tier,
        cycle: req.cycle,
      },
    });

    return {
      merchantRequestId,
      checkoutRequestId,
      responseCode: '0',
      responseDescription: 'Success. Request accepted for processing',
      customerMessage: 'Success. Please enter your M-Pesa PIN on your phone to complete your subscription.',
    };
  }

  async processCallback(payload: MpesaCallbackPayload): Promise<{ success: boolean; message: string }> {
    const { stkCallback } = payload.Body;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const pending = this.pendingTransactions.get(checkoutRequestId);

    if (!pending) {
      this.logger.warn('Received M-Pesa callback for unknown checkoutRequestId', {
        context: { checkoutRequestId },
      });
      return { success: false, message: 'Unknown transaction' };
    }

    if (stkCallback.ResultCode === 0) {
      // Transaction successful
      let receiptNumber = `mpesa_${crypto.randomBytes(4).toString('hex')}`;
      if (stkCallback.CallbackMetadata) {
        const item = stkCallback.CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
        if (item && item.Value) {
          receiptNumber = String(item.Value);
        }
      }

      // Upgrade subscription in DAL
      await this.billingDal.updateSubscription(
        { userId: pending.userId },
        pending.tier,
        pending.cycle,
        PaymentGateway.MPESA,
        receiptNumber
      );

      // Record invoice
      await this.billingDal.recordInvoice({
        subscriptionId: `sub_${pending.userId}`,
        userId: pending.userId,
        amount: pending.amount,
        currency: 'KES',
        gateway: PaymentGateway.MPESA,
        transactionReference: receiptNumber,
        paidAt: new Date(),
        status: 'PAID',
      });

      this.pendingTransactions.delete(checkoutRequestId);

      this.logger.info('M-Pesa STK Push payment verified and subscription activated', {
        context: {
          checkoutRequestId,
          userId: pending.userId,
          receiptNumber,
          tier: pending.tier,
        },
      });

      return { success: true, message: 'Subscription activated' };
    } else {
      // Transaction cancelled or failed
      await this.billingDal.recordInvoice({
        subscriptionId: `sub_${pending.userId}`,
        userId: pending.userId,
        amount: pending.amount,
        currency: 'KES',
        gateway: PaymentGateway.MPESA,
        transactionReference: checkoutRequestId,
        status: 'FAILED',
      });

      this.pendingTransactions.delete(checkoutRequestId);

      this.logger.warn('M-Pesa payment failed or rejected by user', {
        context: {
          checkoutRequestId,
          resultCode: stkCallback.ResultCode,
          resultDesc: stkCallback.ResultDesc,
        },
      });

      return { success: false, message: stkCallback.ResultDesc };
    }
  }
}
