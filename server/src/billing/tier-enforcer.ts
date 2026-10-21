import { BillingDal } from '../dal/billing-dal.js';
import { TIER_QUOTAS } from '@portfolio-immortalized/domain';

export class QuotaExceededError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class FeatureNotAllowedError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FeatureNotAllowedError';
  }
}

export class TierQuotaEnforcer {
  private billingDal: BillingDal;

  constructor(billingDal: BillingDal = new BillingDal()) {
    this.billingDal = billingDal;
  }

  async assertStorageWithinQuota(userId: string, currentUsedBytes: number, newAssetBytes: number): Promise<void> {
    const sub = await this.billingDal.getSubscription(userId);
    const quota = TIER_QUOTAS[sub.tier];

    if (currentUsedBytes + newAssetBytes > quota.storageBytesLimit) {
      const limitMb = Math.round(quota.storageBytesLimit / (1024 * 1024));
      const requestedMb = Math.round((currentUsedBytes + newAssetBytes) / (1024 * 1024));
      throw new QuotaExceededError(
        `Storage limit exceeded for tier '${sub.tier}'. Limit is ${limitMb}MB, requested total is ${requestedMb}MB. Please upgrade your subscription plan.`,
        'STORAGE_QUOTA_EXCEEDED'
      );
    }
  }

  async assertTrusteeWithinLimit(userId: string, currentTrusteeCount: number): Promise<void> {
    const sub = await this.billingDal.getSubscription(userId);
    const quota = TIER_QUOTAS[sub.tier];

    if (currentTrusteeCount >= quota.maxTrustees) {
      throw new QuotaExceededError(
        `Trustee nomination limit reached for tier '${sub.tier}' (${quota.maxTrustees} max). Please upgrade to Heritage or Dynasty tier.`,
        'TRUSTEE_LIMIT_EXCEEDED'
      );
    }
  }

  async assertBeneficiaryWithinLimit(userId: string, currentBeneficiaryCount: number): Promise<void> {
    const sub = await this.billingDal.getSubscription(userId);
    const quota = TIER_QUOTAS[sub.tier];

    if (currentBeneficiaryCount >= quota.maxBeneficiaries) {
      throw new QuotaExceededError(
        `Beneficiary limit reached for tier '${sub.tier}' (${quota.maxBeneficiaries} max). Please upgrade your subscription plan.`,
        'BENEFICIARY_LIMIT_EXCEEDED'
      );
    }
  }

  async assertFeatureAllowed(userId: string, feature: 'WILL_BUILDER' | 'MEDIA_MEMOS' | 'PRIORITY_TRIAGE'): Promise<void> {
    const sub = await this.billingDal.getSubscription(userId);
    const quota = TIER_QUOTAS[sub.tier];

    if (feature === 'WILL_BUILDER' && !quota.allowWillBuilder) {
      throw new FeatureNotAllowedError(
        `Interactive Statutory Will Builder requires Heritage or Dynasty subscription. Current tier is '${sub.tier}'.`,
        'WILL_BUILDER_TIER_REQUIRED'
      );
    }

    if (feature === 'MEDIA_MEMOS' && !quota.allowVideoAudioMemos) {
      throw new FeatureNotAllowedError(
        `Video and audio legacy memos require Heritage or Dynasty subscription. Current tier is '${sub.tier}'.`,
        'MEDIA_MEMOS_TIER_REQUIRED'
      );
    }
  }
}
