import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import {
  LegacyPlanDal,
  VaultDal,
  RelationshipDal,
  LocalStorageProvider,
  UserId,
  makeUserId,
  AssetType,
  AssetSensitivity,
  LegacyPlanStatus,
} from '../src/index.js';

describe('LegacyPlanDal — Directives, Allocations & Recipient Preview', () => {
  let legacyPlanDal: LegacyPlanDal;
  let vaultDal: VaultDal;
  let relationshipDal: RelationshipDal;
  let storageProvider: LocalStorageProvider;

  const ownerId: UserId = makeUserId('usr_owner_legacy_01');
  const intruderId: UserId = makeUserId('usr_intruder_legacy_02');

  let willAssetId: string;
  let deedAssetId: string;
  let childBeneficiaryId: string;
  let spouseBeneficiaryId: string;

  beforeEach(async () => {
    storageProvider = new LocalStorageProvider();
    vaultDal = new VaultDal({ storageProvider });
    relationshipDal = new RelationshipDal();
    legacyPlanDal = new LegacyPlanDal({ vaultDal, relationshipDal });

    // Seed Vault Assets
    const willBuf = Buffer.from('%PDF-1.7 Last Will 2026');
    const willSha = crypto.createHash('sha256').update(willBuf).digest('hex');
    const willIntent = await vaultDal.createUploadIntent(ownerId, {
      fileName: 'Last_Will_2026.pdf',
      declaredMimeType: 'application/pdf',
      declaredSizeBytes: willBuf.length,
      assetType: AssetType.WILL,
      sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
    });
    const willAsset = await vaultDal.commitUpload(ownerId, willIntent.assetId, 1, willBuf, willSha, 'application/pdf');
    willAssetId = willAsset.id;

    const deedBuf = Buffer.from('%PDF-1.7 Karen Property Deed');
    const deedSha = crypto.createHash('sha256').update(deedBuf).digest('hex');
    const deedIntent = await vaultDal.createUploadIntent(ownerId, {
      fileName: 'Karen_Deed.pdf',
      declaredMimeType: 'application/pdf',
      declaredSizeBytes: deedBuf.length,
      assetType: AssetType.DOCUMENT,
      sensitivity: AssetSensitivity.HIGH_CONFIDENTIAL,
    });
    const deedAsset = await vaultDal.commitUpload(ownerId, deedIntent.assetId, 1, deedBuf, deedSha, 'application/pdf');
    deedAssetId = deedAsset.id;

    // Seed Beneficiaries
    const spouse = await relationshipDal.createBeneficiary(
      ownerId,
      {
        name: 'Jane Doe Johnson',
        email: 'jane@example.com',
        relationshipType: 'SPOUSE',
      },
      ownerId
    );
    spouseBeneficiaryId = spouse.id;

    const child = await relationshipDal.createBeneficiary(
      ownerId,
      {
        name: 'Timothy Johnson',
        email: 'timothy@example.com',
        relationshipType: 'CHILD',
      },
      ownerId
    );
    childBeneficiaryId = child.id;
  });

  describe('Draft Plan Lifecycle', () => {
    it('creates a new working draft plan if none exists', async () => {
      const draft = await legacyPlanDal.getDraftPlan(ownerId);
      expect(draft.id).toBeDefined();
      expect(draft.version).toBe(1);
      expect(draft.status).toBe(LegacyPlanStatus.DRAFT);
      expect(draft.instructions).toHaveLength(0);

      // Calling again should return the same draft
      const draftAgain = await legacyPlanDal.getDraftPlan(ownerId);
      expect(draftAgain.id).toBe(draft.id);
    });
  });

  describe('upsertInstruction & Tenancy Isolation', () => {
    it('allocates vault assets to a beneficiary with custom guidance', async () => {
      const updatedPlan = await legacyPlanDal.upsertInstruction(ownerId, {
        beneficiaryId: spouseBeneficiaryId,
        assignedAssetIds: [willAssetId, deedAssetId],
        customInstructions: 'Please consult attorney Mwangi regarding the land title transfer.',
        deliveryDelayDays: 0,
      });

      expect(updatedPlan.instructions).toHaveLength(1);
      const instruction = updatedPlan.instructions[0];
      expect(instruction.beneficiaryId).toBe(spouseBeneficiaryId);
      expect(instruction.assignedAssetIds).toEqual([willAssetId, deedAssetId]);
      expect(instruction.customInstructions).toContain('Mwangi');
    });

    it('updates an existing instruction without duplicating beneficiary entries', async () => {
      await legacyPlanDal.upsertInstruction(ownerId, {
        beneficiaryId: spouseBeneficiaryId,
        assignedAssetIds: [willAssetId],
        customInstructions: 'Initial note',
      });

      const updatedPlan = await legacyPlanDal.upsertInstruction(ownerId, {
        beneficiaryId: spouseBeneficiaryId,
        assignedAssetIds: [willAssetId, deedAssetId],
        customInstructions: 'Updated guidance note',
      });

      expect(updatedPlan.instructions).toHaveLength(1);
      expect(updatedPlan.instructions[0].assignedAssetIds).toHaveLength(2);
      expect(updatedPlan.instructions[0].customInstructions).toBe('Updated guidance note');
    });

    it('rejects allocation when beneficiary does not exist in owner network', async () => {
      await expect(
        legacyPlanDal.upsertInstruction(ownerId, {
          beneficiaryId: '00000000-0000-0000-0000-000000000000',
          assignedAssetIds: [willAssetId],
        })
      ).rejects.toThrow('is not in your designated network');
    });

    it('rejects allocation when assigned asset does not exist in owner vault (IDOR guard)', async () => {
      await expect(
        legacyPlanDal.upsertInstruction(ownerId, {
          beneficiaryId: childBeneficiaryId,
          assignedAssetIds: ['00000000-0000-0000-0000-000000000000'],
        })
      ).rejects.toThrow('does not exist in your vault');
    });
  });

  describe('removeInstruction', () => {
    it('removes an instruction from the working draft', async () => {
      const plan = await legacyPlanDal.upsertInstruction(ownerId, {
        beneficiaryId: childBeneficiaryId,
        assignedAssetIds: [willAssetId],
      });
      const instructionId = plan.instructions[0].id;

      const afterRemoval = await legacyPlanDal.removeInstruction(ownerId, instructionId);
      expect(afterRemoval.instructions).toHaveLength(0);
    });
  });

  describe('publishPlan & Statutory Succession Confirmation', () => {
    it('rejects publishing without legal disclaimer confirmation', async () => {
      await legacyPlanDal.upsertInstruction(ownerId, {
        beneficiaryId: spouseBeneficiaryId,
        assignedAssetIds: [willAssetId],
      });

      await expect(
        legacyPlanDal.publishPlan(ownerId, {
          acceptanceDisclaimerConfirmed: false as any,
          policyVersion: 'ke-v1.0',
        })
      ).rejects.toThrow('You must acknowledge and confirm the statutory succession terms');
    });

    it('rejects publishing an empty plan with 0 instructions', async () => {
      await expect(
        legacyPlanDal.publishPlan(ownerId, {
          acceptanceDisclaimerConfirmed: true,
          policyVersion: 'ke-v1.0',
        })
      ).rejects.toThrow('Cannot publish an empty legacy plan');
    });

    it('publishes plan version 1, sets status PUBLISHED, and initializes next working draft v2', async () => {
      await legacyPlanDal.upsertInstruction(ownerId, {
        beneficiaryId: spouseBeneficiaryId,
        assignedAssetIds: [willAssetId, deedAssetId],
        customInstructions: 'Spouse delivery note',
      });

      const published = await legacyPlanDal.publishPlan(ownerId, {
        acceptanceDisclaimerConfirmed: true,
        policyVersion: 'ke-v1.0',
      });

      expect(published.status).toBe(LegacyPlanStatus.PUBLISHED);
      expect(published.version).toBe(1);
      expect(published.acceptedAt).toBeDefined();

      // Check that a new working draft v2 was prepared
      const newDraft = await legacyPlanDal.getDraftPlan(ownerId);
      expect(newDraft.version).toBe(2);
      expect(newDraft.status).toBe(LegacyPlanStatus.DRAFT);
      expect(newDraft.instructions).toHaveLength(1); // Seeded with previous instructions
    });
  });

  describe('generateRecipientPreview Engine (POL-05)', () => {
    it('simulates the exact recipient release packages and detects unallocated items', async () => {
      // Allocate only willAssetId to spouse, leaving deedAssetId unallocated
      await legacyPlanDal.upsertInstruction(ownerId, {
        beneficiaryId: spouseBeneficiaryId,
        assignedAssetIds: [willAssetId],
        customInstructions: 'For Jane only',
      });

      const preview = await legacyPlanDal.generateRecipientPreview(ownerId);

      expect(preview.totalBeneficiariesWithAllocations).toBe(1);
      expect(preview.totalAllocatedAssets).toBe(1);
      expect(preview.recipients).toHaveLength(1);

      const spousePreview = preview.recipients[0];
      expect(spousePreview.beneficiaryName).toBe('Jane Doe Johnson');
      expect(spousePreview.allocatedAssets).toHaveLength(1);
      expect(spousePreview.allocatedAssets[0].title).toBe('Last_Will_2026.pdf');
      expect(spousePreview.customInstructions).toBe('For Jane only');

      // deedAssetId should be reported as unallocated
      expect(preview.unallocatedAssetIds).toContain(deedAssetId);
      expect(preview.unallocatedAssetIds).not.toContain(willAssetId);
    });
  });
});
