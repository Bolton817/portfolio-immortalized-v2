import * as crypto from 'crypto';
import {
  UserId,
  AssetId,
  BeneficiaryId,
  LegacyPlanId,
  LegacyInstructionId,
  LegacyPlanStatus,
} from '@portfolio-immortalized/domain';
import {
  UpsertInstructionInput,
  PublishLegacyPlanInput,
} from '@portfolio-immortalized/validation';
import { assertOwnerAccess, DalAuthorizationError } from './tenancy.js';
import { VaultDal } from './vault.js';
import { RelationshipDal } from './relationships.js';
import { AuditService } from '../audit/logger.js';

export interface LegacyInstructionRecord {
  id: LegacyInstructionId;
  planId: LegacyPlanId;
  beneficiaryId: BeneficiaryId;
  assignedAssetIds: AssetId[];
  customInstructions: string | null;
  deliveryDelayDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LegacyPlanRecord {
  id: LegacyPlanId;
  ownerId: UserId;
  version: number;
  status: LegacyPlanStatus;
  policyVersion: string;
  acceptedAt: Date | null;
  instructions: LegacyInstructionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipientAllocatedAsset {
  assetId: AssetId;
  title: string;
  category: string;
  versionNumber: number;
  sizeBytes: number;
}

export interface RecipientPreviewItem {
  beneficiaryId: BeneficiaryId;
  beneficiaryName: string;
  beneficiaryEmail: string;
  relationshipType: string;
  allocatedAssets: RecipientAllocatedAsset[];
  customInstructions: string | null;
  deliveryDelayDays: number;
}

export interface RecipientPreviewReport {
  ownerId: UserId;
  planId: LegacyPlanId;
  planVersion: number;
  planStatus: LegacyPlanStatus;
  totalBeneficiariesWithAllocations: number;
  totalAllocatedAssets: number;
  recipients: RecipientPreviewItem[];
  unallocatedAssetIds: AssetId[];
}

export class LegacyPlanDal {
  private plans: Map<string, LegacyPlanRecord> = new Map();
  private vaultDal: VaultDal;
  public relationshipDal: RelationshipDal;
  private auditService: AuditService;

  constructor(options?: {
    vaultDal?: VaultDal;
    relationshipDal?: RelationshipDal;
    auditService?: AuditService;
  }) {
    this.vaultDal = options?.vaultDal ?? new VaultDal();
    this.relationshipDal = options?.relationshipDal ?? new RelationshipDal();
    this.auditService = options?.auditService ?? new AuditService();
  }

  // ============================================================================
  // Draft Plan Retrieval & Initialization
  // ============================================================================

  async getDraftPlan(ownerId: UserId): Promise<LegacyPlanRecord> {
    // 1. Check for existing working draft
    const existingDraft = Array.from(this.plans.values()).find(
      (p) => p.ownerId === ownerId && p.status === LegacyPlanStatus.DRAFT
    );
    if (existingDraft) {
      return existingDraft;
    }

    // 2. Determine initial version number based on any existing plans
    const allOwnerPlans = Array.from(this.plans.values()).filter((p) => p.ownerId === ownerId);
    const highestVersion = allOwnerPlans.reduce((max, p) => Math.max(max, p.version), 0);
    const nextVersion = highestVersion + 1;

    // 3. Create a fresh DRAFT plan
    const now = new Date();
    const newPlan: LegacyPlanRecord = {
      id: crypto.randomUUID() as LegacyPlanId,
      ownerId,
      version: nextVersion,
      status: LegacyPlanStatus.DRAFT,
      policyVersion: 'ke-v1.0',
      acceptedAt: null,
      instructions: [],
      createdAt: now,
      updatedAt: now,
    };

    this.plans.set(newPlan.id, newPlan);
    return newPlan;
  }

  async getPublishedPlan(ownerId: UserId): Promise<LegacyPlanRecord | null> {
    const published = Array.from(this.plans.values())
      .filter((p) => p.ownerId === ownerId && p.status === LegacyPlanStatus.PUBLISHED)
      .sort((a, b) => b.version - a.version)[0];

    return published ?? null;
  }

  async getPlanById(ownerId: UserId, planId: LegacyPlanId): Promise<LegacyPlanRecord> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new DalAuthorizationError('PLAN_NOT_FOUND', `Legacy plan "${planId}" not found.`, 404);
    }
    assertOwnerAccess(ownerId, plan.ownerId);
    return plan;
  }

  // ============================================================================
  // Instruction Upsert & Removal
  // ============================================================================

  async upsertInstruction(
    ownerId: UserId,
    inputOrPlanId: UpsertInstructionInput | string,
    maybeInput?: UpsertInstructionInput
  ): Promise<LegacyPlanRecord> {
    const input: UpsertInstructionInput =
      typeof inputOrPlanId === 'string' ? maybeInput! : inputOrPlanId;
    const plan = await this.getDraftPlan(ownerId);
    assertOwnerAccess(ownerId, plan.ownerId);

    // 1. Verify beneficiary belongs to this owner
    const beneficiaries = await this.relationshipDal.listBeneficiariesByOwner(ownerId);
    const beneficiary = beneficiaries.find((b) => b.id === input.beneficiaryId);
    if (!beneficiary) {
      throw new DalAuthorizationError(
        'BENEFICIARY_NOT_FOUND',
        `Beneficiary "${input.beneficiaryId}" is not in your designated network.`,
        404
      );
    }

    // 2. Verify all assigned assets exist in this owner's vault
    const vaultAssets = await this.vaultDal.listAssets(ownerId);
    const vaultAssetMap = new Map(vaultAssets.map((a) => [a.id as string, a]));

    for (const assetId of input.assignedAssetIds) {
      if (!vaultAssetMap.has(assetId)) {
        throw new DalAuthorizationError(
          'ASSET_NOT_FOUND',
          `Asset "${assetId}" does not exist in your vault.`,
          404
        );
      }
    }

    const now = new Date();
    // 3. Check if instruction already exists for this beneficiary
    const existingIndex = plan.instructions.findIndex((i) => i.beneficiaryId === input.beneficiaryId);

    if (existingIndex >= 0 && plan.instructions[existingIndex]) {
      const existing = plan.instructions[existingIndex]!;
      plan.instructions[existingIndex] = {
        id: existing.id,
        planId: existing.planId,
        beneficiaryId: existing.beneficiaryId,
        assignedAssetIds: input.assignedAssetIds as AssetId[],
        customInstructions: input.customInstructions ?? null,
        deliveryDelayDays: input.deliveryDelayDays ?? 0,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    } else {
      const newInstruction: LegacyInstructionRecord = {
        id: crypto.randomUUID() as LegacyInstructionId,
        planId: plan.id,
        beneficiaryId: input.beneficiaryId as BeneficiaryId,
        assignedAssetIds: input.assignedAssetIds as AssetId[],
        customInstructions: input.customInstructions ?? null,
        deliveryDelayDays: input.deliveryDelayDays ?? 0,
        createdAt: now,
        updatedAt: now,
      };
      plan.instructions.push(newInstruction);
    }

    plan.updatedAt = now;
    this.plans.set(plan.id, plan);

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'legacy_plan.instruction_updated',
      targetType: 'LegacyInstruction',
      targetId: input.beneficiaryId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        planId: plan.id,
        assignedAssetCount: input.assignedAssetIds.length,
        hasCustomInstructions: Boolean(input.customInstructions),
      },
    });

    return plan;
  }

  async removeInstruction(
    ownerId: UserId,
    instructionId: LegacyInstructionId
  ): Promise<LegacyPlanRecord> {
    const plan = await this.getDraftPlan(ownerId);
    assertOwnerAccess(ownerId, plan.ownerId);

    const initialCount = plan.instructions.length;
    plan.instructions = plan.instructions.filter((i) => i.id !== instructionId);

    if (plan.instructions.length === initialCount) {
      throw new DalAuthorizationError(
        'INSTRUCTION_NOT_FOUND',
        `Instruction "${instructionId}" was not found in your draft plan.`,
        404
      );
    }

    plan.updatedAt = new Date();
    this.plans.set(plan.id, plan);

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'legacy_plan.instruction_removed',
      targetType: 'LegacyInstruction',
      targetId: instructionId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: { planId: plan.id },
    });

    return plan;
  }

  // ============================================================================
  // Publish Plan (Immutability & Statutory Succession Disclaimer)
  // ============================================================================

  async publishPlan(
    ownerId: UserId,
    inputOrPlanId: PublishLegacyPlanInput | string,
    maybeInput?: Partial<PublishLegacyPlanInput> & {
      acknowledgedCap160?: boolean;
      acknowledgedProbateDisclaimer?: boolean;
    }
  ): Promise<LegacyPlanRecord> {
    const rawInput = (typeof inputOrPlanId === 'string' ? maybeInput : inputOrPlanId) as any;
    const input: PublishLegacyPlanInput = {
      acceptanceDisclaimerConfirmed:
        rawInput?.acceptanceDisclaimerConfirmed ??
        Boolean(rawInput?.acknowledgedCap160 && rawInput?.acknowledgedProbateDisclaimer),
      policyVersion: rawInput?.policyVersion || 'ke-v1.0',
    };

    if (!input.acceptanceDisclaimerConfirmed) {
      throw new DalAuthorizationError(
        'DISCLAIMER_REQUIRED',
        'You must acknowledge and confirm the statutory succession terms before publishing your legacy plan.',
        400
      );
    }

    const draft = await this.getDraftPlan(ownerId);
    assertOwnerAccess(ownerId, draft.ownerId);

    if (draft.instructions.length === 0) {
      throw new DalAuthorizationError(
        'EMPTY_PLAN',
        'Cannot publish an empty legacy plan. Allocate at least one asset to a designated beneficiary.',
        400
      );
    }

    const now = new Date();

    // 1. Supersede any existing published plan
    for (const plan of this.plans.values()) {
      if (plan.ownerId === ownerId && plan.status === LegacyPlanStatus.PUBLISHED) {
        plan.status = LegacyPlanStatus.SUPERSEDED;
        plan.updatedAt = now;
      }
    }

    // 2. Publish the draft plan
    draft.status = LegacyPlanStatus.PUBLISHED;
    draft.acceptedAt = now;
    draft.policyVersion = input.policyVersion || 'ke-v1.0';
    draft.updatedAt = now;
    this.plans.set(draft.id, draft);

    // 3. Automatically spawn the next working draft seeded with the published instructions
    const nextDraftId = crypto.randomUUID() as LegacyPlanId;
    const nextDraft: LegacyPlanRecord = {
      id: nextDraftId,
      ownerId,
      version: draft.version + 1,
      status: LegacyPlanStatus.DRAFT,
      policyVersion: draft.policyVersion,
      acceptedAt: null,
      instructions: draft.instructions.map((i) => ({
        ...i,
        id: crypto.randomUUID() as LegacyInstructionId,
        planId: nextDraftId,
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
    this.plans.set(nextDraftId, nextDraft);

    // 4. Record audit event
    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'legacy_plan.published',
      targetType: 'LegacyPlan',
      targetId: draft.id,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        version: draft.version,
        instructionCount: draft.instructions.length,
        policyVersion: draft.policyVersion,
        disclaimerAccepted: true,
      },
    });

    return draft;
  }

  // ============================================================================
  // Recipient Preview Engine (POL-05)
  // ============================================================================

  async generateRecipientPreview(
    ownerId: UserId,
    targetBeneficiaryId?: BeneficiaryId
  ): Promise<RecipientPreviewReport> {
    // Prefer published plan if available, otherwise show draft simulation
    const published = await this.getPublishedPlan(ownerId);
    const activePlan = published ?? (await this.getDraftPlan(ownerId));

    // Fetch trusted network and vault assets
    const beneficiaries = await this.relationshipDal.listBeneficiariesByOwner(ownerId);
    const beneficiaryMap = new Map(beneficiaries.map((b) => [b.id as string, b]));

    const vaultAssets = await this.vaultDal.listAssets(ownerId);
    const vaultAssetMap = new Map(vaultAssets.map((a) => [a.id as string, a]));

    const allocatedAssetIdSet = new Set<string>();
    const recipients: RecipientPreviewItem[] = [];

    for (const instruction of activePlan.instructions) {
      if (targetBeneficiaryId && instruction.beneficiaryId !== targetBeneficiaryId) {
        continue;
      }

      const beneficiary = beneficiaryMap.get(instruction.beneficiaryId as string);
      if (!beneficiary) continue;

      const allocatedAssets: RecipientAllocatedAsset[] = [];
      for (const assetId of instruction.assignedAssetIds) {
        const asset = vaultAssetMap.get(assetId as string);
        if (asset) {
          allocatedAssetIdSet.add(assetId as string);
          allocatedAssets.push({
            assetId: asset.id,
            title: asset.title,
            category: asset.assetType,
            versionNumber: asset.currentVersion?.versionNumber ?? 1,
            sizeBytes: asset.currentVersion?.storageObject?.sizeBytes ?? 0,
          });
        }
      }

      recipients.push({
        beneficiaryId: instruction.beneficiaryId,
        beneficiaryName: beneficiary.nameSnapshot,
        beneficiaryEmail: beneficiary.emailSnapshot,
        relationshipType: beneficiary.relationshipType,
        allocatedAssets,
        customInstructions: instruction.customInstructions,
        deliveryDelayDays: instruction.deliveryDelayDays,
      });
    }

    // Determine which vault assets are not yet allocated to anyone
    const unallocatedAssetIds = vaultAssets
      .filter((a) => !allocatedAssetIdSet.has(a.id as string))
      .map((a) => a.id);

    return {
      ownerId,
      planId: activePlan.id,
      planVersion: activePlan.version,
      planStatus: activePlan.status,
      totalBeneficiariesWithAllocations: recipients.length,
      totalAllocatedAssets: allocatedAssetIdSet.size,
      recipients,
      unallocatedAssetIds,
    };
  }
}
