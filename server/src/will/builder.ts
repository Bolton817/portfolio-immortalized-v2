import {
  WillDocument,
  AttestationClause,
} from '@portfolio-immortalized/domain';

export class StatutoryWillBuilder {
  /**
   * Generates formal statutory attestation clause per Section 11 of Cap. 160
   */
  static generateAttestationClause(testatorName: string): AttestationClause {
    return {
      jurisdiction: 'Republic of Kenya',
      statutoryReference: 'Section 11, Kenya Law of Succession Act (Cap. 160)',
      testatorSignatureBlock: `SIGNED by the Testator, [ ${testatorName.toUpperCase()} ], as and for their Last Will and Testament, in the presence of us both present at the same time, who at their request, in their presence, and in the presence of each other, have subscribed our names as attesting witnesses.`,
      witnessAttestationStatement: `We, the undersigned, hereby certify that the Testator signed this Will in our joint presence, appearing to be of sound mind, memory, and understanding, and that neither of us is a beneficiary under this Will or the spouse of any beneficiary named herein (Cap. 160 Section 13).`,
      statutoryDisqualificationsNotice: `IMPORTANT STATUTORY WARNING: Under Section 13 of the Law of Succession Act (Cap. 160), if a witness or their spouse receives any gift, bequest, or interest under this Will, that bequest is completely NULL AND VOID. Witnesses must be entirely independent.`,
    };
  }

  /**
   * Compiles the complete printable legal will text conforming to Kenyan probate practices
   */
  static compileLegalText(will: WillDocument): string {
    const lines: string[] = [];

    lines.push('================================================================================');
    lines.push(`                        LAST WILL AND TESTAMENT OF                             `);
    lines.push(`                        ${will.testatorFullName.toUpperCase()}                 `);
    lines.push('================================================================================\n');

    // 1. Declaration & Revocation Clause
    lines.push('1. DECLARATION OF TESTATOR & REVOCATION OF PRIOR WILLS');
    lines.push(`I, ${will.testatorFullName}, holder of Kenyan National Identity Card No. ${will.testatorNationalId}, residing at ${will.testatorDomicile}, being of sound mind and memory, do hereby make, publish, and declare this to be my Last Will and Testament.`);
    if (will.revocationOfPriorWills) {
      lines.push('I hereby revoke, cancel, and annul all former wills, codicils, and testamentary dispositions made by me at any time heretofore.\n');
    }

    // 2. Appointment of Executors
    lines.push('2. APPOINTMENT OF EXECUTORS & TRUSTEES');
    will.executors.forEach((e, idx) => {
      const role = e.isAlternate ? 'Alternate Executor' : 'Primary Executor';
      lines.push(`2.${idx + 1} I appoint my ${e.relationship}, ${e.fullName} (National ID: ${e.nationalIdNumber}, Address: ${e.address}), to act as ${role} and Trustee of this my Will.`);
    });
    lines.push('');

    // 3. Guardianship of Minors (if any)
    if (will.guardians && will.guardians.length > 0) {
      lines.push('3. GUARDIANSHIP OF MINOR CHILDREN');
      will.guardians.forEach((g, idx) => {
        lines.push(`3.${idx + 1} In the event that my spouse predeceases me, I appoint ${g.fullName} (National ID: ${g.nationalIdNumber}) to be the legal guardian of my minor children: ${g.minorChildrenNames.join(', ')}.`);
      });
      lines.push('');
    }

    // 4. Specific Bequests
    if (will.specificBequests && will.specificBequests.length > 0) {
      lines.push('4. SPECIFIC BEQUESTS & LEGACIES');
      will.specificBequests.forEach((b, idx) => {
        const idStr = b.identifierOrTitleNumber ? ` (Ref/Title: ${b.identifierOrTitleNumber})` : '';
        lines.push(`4.${idx + 1} [${b.category}] I give and bequeath my ${b.assetDescription}${idStr} to my ${b.relationship}, ${b.beneficiaryName}${b.beneficiaryNationalId ? ` (ID: ${b.beneficiaryNationalId})` : ''}, absolutely.`);
        if (b.conditionsOrInstructions) {
          lines.push(`     Special Condition: ${b.conditionsOrInstructions}`);
        }
      });
      lines.push('');
    }

    // 5. Digital Legacy Custody (Portfolio Immortalized Integration)
    lines.push('5. DIGITAL LEGACY & PORTFOLIO IMMORTALIZED VAULT ASSETS');
    lines.push('I direct that my private digital documents, memory recordings, letters, and estate records securely stored in my Portfolio Immortalized encrypted vault (Pie Corp Limited) shall be released strictly in accordance with my registered Legacy Plan instructions and controlled verification policies.');
    if (will.digitalVaultInstructions) {
      lines.push(`Direct Vault Instructions: ${will.digitalVaultInstructions}`);
    }
    lines.push('');

    // 6. Residuary Estate
    lines.push('6. RESIDUARY ESTATE ALLOCATION');
    lines.push('I give, devise, and bequeath all the rest, residue, and remainder of my estate, both real and personal, of whatsoever nature and wheresoever situate, as follows:');
    will.residuaryShares.forEach((r, idx) => {
      lines.push(`6.${idx + 1} ${r.sharePercentage}% to my ${r.relationship}, ${r.beneficiaryName}${r.beneficiaryNationalId ? ` (ID: ${r.beneficiaryNationalId})` : ''}.`);
    });
    lines.push('');

    // 7. Statutory Attestation Clause
    const attestation = StatutoryWillBuilder.generateAttestationClause(will.testatorFullName);
    lines.push('7. ATTESTATION & EXECUTION (SECTION 11, CAP. 160)');
    lines.push(`JURISDICTION: ${attestation.jurisdiction.toUpperCase()}`);
    lines.push(`STATUTORY REFERENCE: ${attestation.statutoryReference}\n`);
    lines.push(attestation.testatorSignatureBlock);
    lines.push('\nTESTATOR SIGNATURE: ______________________________  DATE: _______________\n');
    lines.push(attestation.witnessAttestationStatement);
    lines.push('\nWITNESS 1:                                 WITNESS 2:');
    lines.push('Name: ________________________________     Name: ________________________________');
    lines.push('ID No: _______________________________     ID No: _______________________________');
    lines.push('Address: _____________________________     Address: _____________________________');
    lines.push('Occupation: __________________________     Occupation: __________________________');
    lines.push('Signature: ___________________________     Signature: ___________________________\n');
    lines.push(attestation.statutoryDisqualificationsNotice);
    lines.push('================================================================================');

    return lines.join('\n');
  }
}
