import {
  DeathCaseDal,
  InactivitySweepService,
  ReleaseService,
  AuditService,
  makeUserId,
  CaseInitiationType,
} from '@portfolio-immortalized/server';
import { vaultDal, defaultVaultOwnerId } from '../vault/vault-instance';
import { legacyPlanDal } from '../legacy/legacy-instance';

export const caseAuditService = new AuditService();
export const deathCaseDal = new DeathCaseDal(caseAuditService);
export const inactivityService = new InactivitySweepService(deathCaseDal, caseAuditService);
export const releaseService = new ReleaseService(
  deathCaseDal,
  legacyPlanDal,
  vaultDal,
  caseAuditService
);

export const defaultOwnerId = defaultVaultOwnerId || makeUserId('usr_owner_demo');
export const demoTrustee1Id = makeUserId('usr_trustee_demo_1');
export const demoTrustee2Id = makeUserId('usr_trustee_demo_2');
export const demoReviewerId = makeUserId('usr_admin_reviewer_demo');
export const demoApproverId = makeUserId('usr_admin_approver_demo');
export const demoSecurityAdminId = makeUserId('usr_admin_security_demo');

// Register owner with inactivity service and seed initial demo death case
(async () => {
  try {
    inactivityService.registerOwner(defaultOwnerId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    // Seed a demonstration reported death case
    const demoCase = await deathCaseDal.initiateCase(
      defaultOwnerId,
      CaseInitiationType.TRUSTEE_REPORT,
      demoTrustee1Id,
      {
        statement: 'Formal notification received from Karen Hospital regarding owner.',
        relationshipType: 'PRIMARY_TRUSTEE',
      }
    );

    // Seed initial evidence
    await deathCaseDal.submitEvidence(demoCase.id, demoTrustee1Id, {
      caseId: demoCase.id,
      uploadId: '00000000-0000-0000-0000-000000000099',
      evidenceType: 'BURIAL_PERMIT',
      issuingAuthority: 'Nairobi City County Public Health Department',
      issuingCountry: 'KE',
      issueDate: '2026-03-20',
      submitterDeclarationAccepted: true,
      notes: 'Serial Number BP-2026-09418 certified and verified.',
    });

    // Trustee 1 co-signs
    await deathCaseDal.recordTrusteeCoSign(demoCase.id, demoTrustee1Id, {
      caseId: demoCase.id,
      attestationConfirmed: true,
      rationale: 'I attended the verification and attest to the authenticity of the permit.',
    });
  } catch (err) {
    console.warn('Case instance seeding skipped:', err);
  }
})();
