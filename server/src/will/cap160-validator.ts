import { WillDocument } from '@portfolio-immortalized/domain';

export interface Cap160ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  statutoryChecklist: {
    section11WitnessQuorumMet: boolean; // At least two competent adult witnesses
    section13NoBeneficiaryWitnessConflict: boolean; // No witness is a beneficiary
    section21ExecutorsNominated: boolean; // At least one primary executor
    residuaryEstate100Percent: boolean; // Shares sum to 100%
  };
}

export class Cap160WillValidator {
  /**
   * Validates a draft will against Kenya Law of Succession Act (Cap. 160)
   */
  static validate(will: Omit<WillDocument, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'status'>): Cap160ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Cap. 160 Section 21: Executor Nomination
    const hasPrimaryExecutor = will.executors && will.executors.some((e) => !e.isAlternate);
    if (!hasPrimaryExecutor) {
      errors.push('Section 21 Cap. 160: At least one primary Executor must be appointed to administer the estate.');
    }

    // 2. Residuary Estate Allocation must sum to 100%
    const totalShare = will.residuaryShares.reduce((sum, s) => sum + s.sharePercentage, 0);
    const residuary100 = Math.abs(totalShare - 100) < 0.01;
    if (!residuary100) {
      errors.push(`Residuary estate shares must total exactly 100% (current total is ${totalShare}%).`);
    }

    // 3. Collect all beneficiary names and IDs across specific bequests and residuary shares
    const beneficiaryNames = new Set<string>();
    const beneficiaryIds = new Set<string>();

    for (const b of will.specificBequests) {
      beneficiaryNames.add(b.beneficiaryName.toLowerCase().trim());
      if (b.beneficiaryNationalId) {
        beneficiaryIds.add(b.beneficiaryNationalId.trim());
      }
    }

    for (const r of will.residuaryShares) {
      beneficiaryNames.add(r.beneficiaryName.toLowerCase().trim());
      if (r.beneficiaryNationalId) {
        beneficiaryIds.add(r.beneficiaryNationalId.trim());
      }
    }

    // 4. Cap. 160 Section 13: Witness Forfeiture Rule
    // "A bequest to an attesting witness or spouse of an attesting witness is VOID."
    let hasConflict = false;
    for (const witness of will.witnesses || []) {
      const witnessName = witness.fullName.toLowerCase().trim();
      const witnessId = witness.nationalIdNumber?.trim();

      if (beneficiaryNames.has(witnessName) || (witnessId && beneficiaryIds.has(witnessId))) {
        hasConflict = true;
        errors.push(
          `Section 13 Cap. 160 Statutory Conflict: Witness '${witness.fullName}' is also named as an estate beneficiary. Under Section 13, attesting witnesses forfeit their testamentary gifts. Appoint an independent non-beneficiary witness.`
        );
      }
    }

    // 5. Cap. 160 Section 11: Witness Quorum
    // Must have at least two competent witnesses for physical execution
    const witnessCount = will.witnesses ? will.witnesses.length : 0;
    const quorumMet = witnessCount >= 2;
    if (witnessCount > 0 && witnessCount < 2) {
      errors.push('Section 11 Cap. 160: Kenyan law strictly requires at least two competent adult witnesses present simultaneously at signing.');
    } else if (witnessCount === 0) {
      warnings.push('Draft currently has zero designated witnesses. Before signing, two independent witnesses must be appointed.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statutoryChecklist: {
        section11WitnessQuorumMet: quorumMet,
        section13NoBeneficiaryWitnessConflict: !hasConflict,
        section21ExecutorsNominated: hasPrimaryExecutor,
        residuaryEstate100Percent: residuary100,
      },
    };
  }
}
