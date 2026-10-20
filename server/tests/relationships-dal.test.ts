import { describe, it, expect, beforeEach } from 'vitest';
import {
  RelationshipDal,
  AuditService,
  MemoryAuditSink,
} from '../src/index.js';
import {
  makeUserId,
  RelationshipStatus,
} from '@portfolio-immortalized/domain';

describe('RelationshipDal & Network Safeguards (TDD Chapter 10 & 22)', () => {
  let relationshipDal: RelationshipDal;
  let auditSink: MemoryAuditSink;

  const ownerId = makeUserId('owner-usr-1');
  const trusteeUserId = makeUserId('trustee-usr-2');
  const attackerId = makeUserId('attacker-usr-99');

  beforeEach(() => {
    auditSink = new MemoryAuditSink();
    relationshipDal = new RelationshipDal(new AuditService(auditSink));
  });

  describe('Trustee Invitation Lifecycle', () => {
    it('REL-01: Creates trustee invitation with hashed token and records audit event', async () => {
      const result = await relationshipDal.createTrusteeInvitation(
        ownerId,
        {
          name: 'Sarah Mwangi',
          email: 'sarah@example.com',
          relationshipType: 'PROFESSIONAL',
          message: 'Please act as my trustee.',
        },
        ownerId
      );

      expect(result.relationship.status).toBe(RelationshipStatus.INVITED);
      expect(result.relationship.nameSnapshot).toBe('Sarah Mwangi');
      expect(result.rawInvitationToken).toBeTruthy();
      expect(result.relationship.invitationTokenHash).toBeNull(); // Redacted in return

      // Verify audit event
      const inviteAudit = auditSink.events.find((e) => e.action === 'trustee.invitation.created');
      expect(inviteAudit).toBeTruthy();
      expect(inviteAudit?.actorId).toBe(ownerId);
      expect(inviteAudit?.outcome).toBe('SUCCESS');
    });

    it('REL-02: Trustee accepts invitation, binds identity, and token cannot be replayed', async () => {
      const { rawInvitationToken } = await relationshipDal.createTrusteeInvitation(
        ownerId,
        {
          name: 'James Otieno',
          email: 'james@example.com',
          relationshipType: 'FAMILY',
        },
        ownerId
      );

      // First acceptance succeeds
      const accepted = await relationshipDal.acceptTrusteeInvitation(
        rawInvitationToken,
        trusteeUserId
      );

      expect(accepted.status).toBe(RelationshipStatus.ACCEPTED);
      expect(accepted.personUserId).toBe(trusteeUserId);
      expect(accepted.acceptedAt).not.toBeNull();

      // REL-02: Second acceptance attempt fails with TOKEN_ALREADY_USED
      await expect(
        relationshipDal.acceptTrusteeInvitation(rawInvitationToken, trusteeUserId)
      ).rejects.toThrow('The invitation token is invalid or has already been used.');
    });

    it('REL-03: Rejects invalid or forged token', async () => {
      await expect(
        relationshipDal.acceptTrusteeInvitation('forged-token-xyz', trusteeUserId)
      ).rejects.toThrow('The invitation token is invalid or has already been used.');
    });

    it('REL-05: Removing trustee below quorum of 2 raises quorum warning', async () => {
      // Create and accept 2 trustees
      const t1 = await relationshipDal.createTrusteeInvitation(
        ownerId,
        { name: 'Trustee 1', email: 't1@example.com', relationshipType: 'FRIEND' },
        ownerId
      );
      await relationshipDal.acceptTrusteeInvitation(t1.rawInvitationToken, makeUserId('t1-user'));

      const t2 = await relationshipDal.createTrusteeInvitation(
        ownerId,
        { name: 'Trustee 2', email: 't2@example.com', relationshipType: 'FRIEND' },
        ownerId
      );
      await relationshipDal.acceptTrusteeInvitation(t2.rawInvitationToken, makeUserId('t2-user'));

      // Remove Trustee 1 -> Remaining is 1 (less than 2) -> quorumWarning must be true
      const removalResult = await relationshipDal.removeTrustee(
        ownerId,
        t1.relationship.id,
        ownerId,
        'No longer in contact'
      );

      expect(removalResult.quorumWarning).toBe(true);
      expect(removalResult.relationship.status).toBe(RelationshipStatus.REMOVED);
    });
  });

  describe('Non-Negotiable Isolation Invariant: REL-04', () => {
    it('REL-04: Trustee CANNOT access the owner vault, even when invitation is accepted', async () => {
      const { rawInvitationToken } = await relationshipDal.createTrusteeInvitation(
        ownerId,
        { name: 'Trustee Mwangi', email: 'mwangi@example.com', relationshipType: 'PROFESSIONAL' },
        ownerId
      );
      await relationshipDal.acceptTrusteeInvitation(rawInvitationToken, trusteeUserId);

      // Verified active trustee attempts to read vault
      expect(() =>
        relationshipDal.assertTrusteeCannotAccessVault(trusteeUserId, ownerId)
      ).toThrow('Trustees do not have permission to browse or access the private vault.');
    });
  });

  describe('Beneficiary Directory & Tenancy', () => {
    it('REL-06: Creates and updates beneficiaries with audit logs', async () => {
      const beneficiary = await relationshipDal.createBeneficiary(
        ownerId,
        {
          name: 'Maya Mutua',
          email: 'maya@example.com',
          relationshipType: 'CHILD',
          personalNote: 'For university records',
        },
        ownerId
      );

      expect(beneficiary.nameSnapshot).toBe('Maya Mutua');
      expect(beneficiary.relationshipType).toBe('CHILD');

      // Update beneficiary
      const updated = await relationshipDal.updateBeneficiary(
        ownerId,
        beneficiary.id,
        { personalNote: 'Updated personal note' },
        ownerId
      );

      expect(updated.personalNote).toBe('Updated personal note');
    });

    it('Cross-tenant IDOR protection: Attacker cannot manage victim owner relationships', async () => {
      const beneficiary = await relationshipDal.createBeneficiary(
        ownerId,
        { name: 'Victim Beneficiary', email: 'vic@example.com', relationshipType: 'SPOUSE' },
        ownerId
      );

      // Attacker attempts to update beneficiary
      await expect(
        relationshipDal.updateBeneficiary(
          ownerId,
          beneficiary.id,
          { name: 'Hacked Name' },
          attackerId // Different actor!
        )
      ).rejects.toThrow('You do not have permission to view or modify this resource.');
    });
  });
});
