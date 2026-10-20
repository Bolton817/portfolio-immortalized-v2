import {
  UserId,
  RelationshipId,
  BeneficiaryId,
  RelationshipStatus,
  makeRelationshipId,
} from '@portfolio-immortalized/domain';
import {
  InviteTrusteeInput,
  CreateBeneficiaryInput,
} from '@portfolio-immortalized/validation';
import { generateInvitationToken, hashToken, isTokenExpired } from '../notifications/token.js';
import { assertOwnerAccess, DalAuthorizationError } from './tenancy.js';
import { AuditService } from '../audit/logger.js';

export interface TrusteeRelationshipRecord {
  id: RelationshipId;
  ownerId: UserId;
  personUserId: UserId | null;
  nameSnapshot: string;
  emailSnapshot: string;
  phoneSnapshot: string | null;
  relationshipType: string;
  status: RelationshipStatus;
  invitationTokenHash: string | null;
  expiresAt: Date | null;
  acceptedAt: Date | null;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BeneficiaryRelationshipRecord {
  id: BeneficiaryId;
  ownerId: UserId;
  personUserId: UserId | null;
  nameSnapshot: string;
  emailSnapshot: string;
  phoneSnapshot: string | null;
  relationshipType: string;
  personalNote: string | null;
  status: RelationshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class RelationshipDal {
  private trustees: Map<string, TrusteeRelationshipRecord> = new Map();
  private beneficiaries: Map<string, BeneficiaryRelationshipRecord> = new Map();
  private auditService: AuditService;

  constructor(auditService: AuditService = new AuditService()) {
    this.auditService = auditService;
  }

  // ============================================================================
  // Trustees
  // ============================================================================

  async listTrusteesByOwner(ownerId: UserId): Promise<TrusteeRelationshipRecord[]> {
    const list: TrusteeRelationshipRecord[] = [];
    for (const record of this.trustees.values()) {
      if (record.ownerId === ownerId && record.status !== RelationshipStatus.REMOVED) {
        // Redact invitationTokenHash from client listing
        list.push({ ...record, invitationTokenHash: null });
      }
    }
    return list;
  }

  async inviteTrustee(
    ownerId: UserId,
    input: InviteTrusteeInput,
    actorUserId?: UserId
  ): Promise<{ relationship: TrusteeRelationshipRecord; rawInvitationToken: string }> {
    return this.createTrusteeInvitation(ownerId, input, actorUserId ?? ownerId);
  }

  async createTrusteeInvitation(
    ownerId: UserId,
    input: InviteTrusteeInput,
    actorUserId?: UserId
  ): Promise<{ relationship: TrusteeRelationshipRecord; rawInvitationToken: string }> {
    assertOwnerAccess(actorUserId ?? ownerId, ownerId);

    const { rawToken, tokenHash, expiresAt } = generateInvitationToken(7);
    const relationshipId = makeRelationshipId(`rel_trs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    const record: TrusteeRelationshipRecord = {
      id: relationshipId,
      ownerId,
      personUserId: null,
      nameSnapshot: input.name,
      emailSnapshot: input.email.toLowerCase(),
      phoneSnapshot: input.phone || null,
      relationshipType: input.relationshipType,
      status: RelationshipStatus.INVITED,
      invitationTokenHash: tokenHash,
      expiresAt,
      acceptedAt: null,
      removedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.trustees.set(relationshipId, record);

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'trustee.invitation.created',
      targetType: 'TrusteeRelationship',
      targetId: relationshipId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: { recipientEmail: input.email, relationshipType: input.relationshipType },
    });

    return {
      relationship: { ...record, invitationTokenHash: null },
      rawInvitationToken: rawToken,
    };
  }

  async acceptTrusteeInvitation(
    rawTokenOrUser: string | UserId,
    acceptingUserIdOrToken: UserId | string
  ): Promise<TrusteeRelationshipRecord> {
    const isFirstParamUser = typeof rawTokenOrUser === 'string' && rawTokenOrUser.startsWith('usr_');
    const rawToken = isFirstParamUser ? (acceptingUserIdOrToken as string) : (rawTokenOrUser as string);
    const acceptingUserId = isFirstParamUser ? (rawTokenOrUser as UserId) : (acceptingUserIdOrToken as UserId);
    const tokenHash = hashToken(rawToken);

    let matchingRecord: TrusteeRelationshipRecord | null = null;
    for (const record of this.trustees.values()) {
      if (record.invitationTokenHash === tokenHash) {
        matchingRecord = record;
        break;
      }
    }

    if (!matchingRecord) {
      throw new DalAuthorizationError(
        'INVALID_INVITATION_TOKEN',
        'The invitation token is invalid or has already been used.',
        400
      );
    }

    if (matchingRecord.status === RelationshipStatus.ACCEPTED) {
      throw new DalAuthorizationError(
        'TOKEN_ALREADY_USED',
        'This invitation has already been accepted.',
        400
      );
    }

    if (matchingRecord.expiresAt && isTokenExpired(matchingRecord.expiresAt)) {
      throw new DalAuthorizationError(
        'TOKEN_EXPIRED',
        'This invitation has expired. Please ask the account owner to resend the invitation.',
        410
      );
    }

    // Atomically consume token and bind trustee identity
    const updated: TrusteeRelationshipRecord = {
      ...matchingRecord,
      personUserId: acceptingUserId,
      status: RelationshipStatus.ACCEPTED,
      invitationTokenHash: null, // Single-use consumption
      acceptedAt: new Date(),
      updatedAt: new Date(),
    };

    this.trustees.set(matchingRecord.id, updated);

    await this.auditService.record({
      actorType: 'TRUSTEE',
      actorId: acceptingUserId,
      action: 'trustee.invitation.accepted',
      targetType: 'TrusteeRelationship',
      targetId: matchingRecord.id,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
    });

    return { ...updated, invitationTokenHash: null };
  }

  async removeTrustee(
    ownerId: UserId,
    relationshipId: RelationshipId,
    actorUserId: UserId,
    rationale: string = 'Removed by owner'
  ): Promise<{ relationship: TrusteeRelationshipRecord; quorumWarning: boolean }> {
    assertOwnerAccess(actorUserId, ownerId);

    const current = this.trustees.get(relationshipId);
    if (!current || current.ownerId !== ownerId) {
      throw new DalAuthorizationError('NOT_FOUND', 'Trustee relationship not found.', 404);
    }

    const updated: TrusteeRelationshipRecord = {
      ...current,
      status: RelationshipStatus.REMOVED,
      removedAt: new Date(),
      invitationTokenHash: null,
      updatedAt: new Date(),
    };

    this.trustees.set(relationshipId, updated);

    // Calculate remaining active trustees
    const remainingActive = (await this.listTrusteesByOwner(ownerId)).filter(
      (t) => t.status === RelationshipStatus.ACCEPTED
    ).length;

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'trustee.removed',
      targetType: 'TrusteeRelationship',
      targetId: relationshipId,
      outcome: 'SUCCESS',
      reasonCode: 'OWNER_REMOVED',
      requestId: `req_${Date.now()}`,
      metadata: { rationale, remainingActiveTrustees: remainingActive },
    });

    return {
      relationship: updated,
      quorumWarning: remainingActive < 2,
    };
  }

  // ============================================================================
  // Beneficiaries
  // ============================================================================

  async listBeneficiariesByOwner(ownerId: UserId): Promise<BeneficiaryRelationshipRecord[]> {
    const list: BeneficiaryRelationshipRecord[] = [];
    for (const record of this.beneficiaries.values()) {
      if (record.ownerId === ownerId && record.status !== RelationshipStatus.REMOVED) {
        list.push(record);
      }
    }
    return list;
  }

  async createBeneficiary(
    ownerId: UserId,
    input: CreateBeneficiaryInput,
    actorUserId?: UserId
  ): Promise<BeneficiaryRelationshipRecord> {
    assertOwnerAccess(actorUserId ?? ownerId, ownerId);

    const beneficiaryId = `ben_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` as BeneficiaryId;

    const record: BeneficiaryRelationshipRecord = {
      id: beneficiaryId,
      ownerId,
      personUserId: null,
      nameSnapshot: input.name,
      emailSnapshot: input.email.toLowerCase(),
      phoneSnapshot: input.phone || null,
      relationshipType: input.relationshipType,
      personalNote: input.personalNote || null,
      status: RelationshipStatus.ACCEPTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.beneficiaries.set(beneficiaryId, record);

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'beneficiary.created',
      targetType: 'BeneficiaryRelationship',
      targetId: beneficiaryId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
    });

    return record;
  }

  async updateBeneficiary(
    ownerId: UserId,
    beneficiaryId: BeneficiaryId,
    input: Partial<CreateBeneficiaryInput>,
    actorUserId: UserId
  ): Promise<BeneficiaryRelationshipRecord> {
    assertOwnerAccess(actorUserId, ownerId);

    const current = this.beneficiaries.get(beneficiaryId);
    if (!current || current.ownerId !== ownerId) {
      throw new DalAuthorizationError('NOT_FOUND', 'Beneficiary not found.', 404);
    }

    const updated: BeneficiaryRelationshipRecord = {
      ...current,
      nameSnapshot: input.name ?? current.nameSnapshot,
      emailSnapshot: input.email ? input.email.toLowerCase() : current.emailSnapshot,
      phoneSnapshot: input.phone !== undefined ? input.phone : current.phoneSnapshot,
      relationshipType: input.relationshipType ?? current.relationshipType,
      personalNote: input.personalNote !== undefined ? input.personalNote : current.personalNote,
      updatedAt: new Date(),
    };

    this.beneficiaries.set(beneficiaryId, updated);

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'beneficiary.updated',
      targetType: 'BeneficiaryRelationship',
      targetId: beneficiaryId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
    });

    return updated;
  }

  async removeBeneficiary(
    ownerId: UserId,
    beneficiaryId: BeneficiaryId,
    actorUserId: UserId
  ): Promise<void> {
    assertOwnerAccess(actorUserId, ownerId);

    const current = this.beneficiaries.get(beneficiaryId);
    if (!current || current.ownerId !== ownerId) {
      throw new DalAuthorizationError('NOT_FOUND', 'Beneficiary not found.', 404);
    }

    const updated: BeneficiaryRelationshipRecord = {
      ...current,
      status: RelationshipStatus.REMOVED,
      updatedAt: new Date(),
    };

    this.beneficiaries.set(beneficiaryId, updated);

    await this.auditService.record({
      actorType: 'USER',
      actorId: ownerId,
      action: 'beneficiary.removed',
      targetType: 'BeneficiaryRelationship',
      targetId: beneficiaryId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
    });
  }

  // ============================================================================
  // Non-Negotiable Security Invariant: REL-04
  // ============================================================================

  /**
   * Proves that a trustee relationship NEVER confers implicit access to the owner's vault.
   */
  assertTrusteeCannotAccessVault(trusteeUserId: UserId, ownerId: UserId): void {
    // If the caller is not the owner themselves, vault access is unconditionally rejected
    if (trusteeUserId !== ownerId) {
      throw new DalAuthorizationError(
        'ACCESS_DENIED',
        'Trustees do not have permission to browse or access the private vault.',
        403
      );
    }
  }
}
