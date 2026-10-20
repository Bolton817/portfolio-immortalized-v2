import {
  LegacyPlanDal,
  RelationshipDal,
  makeUserId,
} from '@portfolio-immortalized/server';
import { vaultDal, defaultVaultOwnerId } from '../vault/vault-instance';

export const sharedRelationshipDal = new RelationshipDal();
export const legacyPlanDal = new LegacyPlanDal({
  vaultDal,
  relationshipDal: sharedRelationshipDal,
});

export const defaultOwnerId = defaultVaultOwnerId || makeUserId('usr_owner_demo');

// Seed demonstration beneficiaries and initial allocation instruction
(async () => {
  try {
    const spouse = await sharedRelationshipDal.createBeneficiary(
      defaultOwnerId,
      {
        name: 'Jane Doe Johnson',
        email: 'jane.johnson@example.com',
        phone: '+254712345678',
        relationshipType: 'SPOUSE',
        personalNote: 'Primary beneficiary for legal & estate assets',
      },
      defaultOwnerId
    );

    const child = await sharedRelationshipDal.createBeneficiary(
      defaultOwnerId,
      {
        name: 'Timothy Johnson',
        email: 'timothy.johnson@example.com',
        phone: '+254722334455',
        relationshipType: 'CHILD',
        personalNote: 'Secondary beneficiary for memorabilia & education trust',
      },
      defaultOwnerId
    );

    // Fetch existing vault assets to seed instructions
    const vaultAssets = await vaultDal.listAssets(defaultOwnerId);
    if (vaultAssets.length > 0) {
      await legacyPlanDal.upsertInstruction(defaultOwnerId, {
        beneficiaryId: spouse.id,
        assignedAssetIds: [vaultAssets[0].id],
        customInstructions: 'Please consult Mwangi & Associates regarding the estate transfer.',
        deliveryDelayDays: 0,
      });

      if (vaultAssets.length > 1) {
        await legacyPlanDal.upsertInstruction(defaultOwnerId, {
          beneficiaryId: child.id,
          assignedAssetIds: [vaultAssets[1].id],
          customInstructions: 'Keep your identity and education records safe.',
          deliveryDelayDays: 14,
        });
      }
    }
  } catch {
    // Gracefully handle duplicate seed runs during hot reload
  }
})();
