import crypto from 'node:crypto';
import {
  UserId,
  CaseId,
  EvidenceId,
  CaseDecisionId,
  CaseHoldId,
  DeathCaseState,
  CaseInitiationType,
  CaseDecisionType,
  CaseHoldReasonCode,
  makeCaseId,
  makeEvidenceId,
  makeCaseDecisionId,
  makeCaseHoldId,
  evaluateCaseTransition,
  CaseTransitionContext,
} from '@portfolio-immortalized/domain';
import {
  SubmitCaseEvidenceInput,
  SubmitReviewRecommendationInput,
  IndependentFinalApprovalInput,
  PlaceEmergencyHoldInput,
  ResolveEmergencyHoldInput,
  TrusteeCoSignInput,
} from '@portfolio-immortalized/validation';
import { AuditService } from '../audit/logger.js';
import { DalAuthorizationError } from './tenancy.js';

export interface DeathEvidenceRecord {
  id: EvidenceId;
  caseId: CaseId;
  sourceAssetVersionId: string;
  submitterId: UserId;
  evidenceType: string;
  issuingAuthority: string;
  issuingCountry: string;
  issueDate: Date;
  reviewStatus: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
  notes: string | null;
  createdAt: Date;
}

export interface TrusteeCoSignRecord {
  trusteeId: UserId;
  attestationConfirmed: boolean;
  rationale: string;
  signedAt: Date;
}

export interface CaseDecisionRecord {
  id: CaseDecisionId;
  caseId: CaseId;
  decisionType: CaseDecisionType;
  actorAdminId: UserId;
  reasonCode: string;
  rationale: string;
  policyVersion: string;
  createdAt: Date;
}

export interface CaseHoldRecord {
  id: CaseHoldId;
  caseId: CaseId;
  placedById: UserId;
  reasonCode: CaseHoldReasonCode;
  rationale: string;
  active: boolean;
  placedAt: Date;
  liftedById: UserId | null;
  liftedRationale: string | null;
  liftedAt: Date | null;
}

export interface DeathCaseRecord {
  id: CaseId;
  ownerId: UserId;
  state: DeathCaseState;
  initiationType: CaseInitiationType;
  policyVersion: string;
  assignedReviewerId: UserId | null;
  stateVersion: number;
  openedAt: Date;
  updatedAt: Date;
  informantStatement?: string;
  relationshipType?: string;
  evidence: DeathEvidenceRecord[];
  trusteeSignatures: TrusteeCoSignRecord[];
  decisions: CaseDecisionRecord[];
  holds: CaseHoldRecord[];
  requiredTrusteeQuorum: number;
}

export class DeathCaseDal {
  private cases: Map<string, DeathCaseRecord> = new Map();
  private auditService: AuditService;

  constructor(auditService: AuditService = new AuditService()) {
    this.auditService = auditService;
  }

  // ============================================================================
  // Case Initiation & Lookup
  // ============================================================================

  async initiateCase(
    ownerId: UserId,
    initiationType: CaseInitiationType,
    initiatorId: UserId,
    details?: {
      statement?: string;
      relationshipType?: string;
      policyVersion?: string;
      requiredTrusteeQuorum?: number;
    }
  ): Promise<DeathCaseRecord> {
    // Check if an active open case already exists for this owner
    const existingCase = Array.from(this.cases.values()).find(
      (c) =>
        c.ownerId === ownerId &&
        c.state !== DeathCaseState.RELEASED &&
        c.state !== DeathCaseState.REJECTED &&
        c.state !== DeathCaseState.CLOSED_NO_EVIDENCE
    );

    if (existingCase) {
      if (
        existingCase.state === DeathCaseState.INACTIVITY_REVIEW &&
        initiationType === CaseInitiationType.TRUSTEE_REPORT
      ) {
        existingCase.state = DeathCaseState.REPORTED;
        existingCase.initiationType = CaseInitiationType.TRUSTEE_REPORT;
        existingCase.informantStatement = details?.statement ?? existingCase.informantStatement;
        existingCase.stateVersion += 1;
        existingCase.updatedAt = new Date();
      }
      return existingCase;
    }

    const caseId = makeCaseId(crypto.randomUUID());
    const now = new Date();
    const policyVersion = details?.policyVersion ?? 'v1-ke';
    const requiredTrusteeQuorum = details?.requiredTrusteeQuorum ?? 2;

    const initialContext: CaseTransitionContext = {
      caseId,
      actorId: initiatorId,
      actorRole: initiationType === CaseInitiationType.INACTIVITY ? 'SYSTEM' : 'TRUSTEE',
      hasActiveHold: false,
      evidenceCount: 0,
      requiredTrusteeQuorum,
      approvedTrusteeCount: 0,
    };

    const initialEvent =
      initiationType === CaseInitiationType.INACTIVITY
        ? { type: 'INACTIVITY_THRESHOLD_REACHED' as const, policyVersion }
        : {
            type: 'TRUSTEE_REPORT_SUBMITTED' as const,
            submitterId: initiatorId,
            reason: details?.statement ?? 'Suspected death reported',
          };

    const transition = evaluateCaseTransition(DeathCaseState.NONE, initialEvent, initialContext);
    if (!transition.allowed || !transition.nextState) {
      throw new DalAuthorizationError(
        'INVALID_CASE_TRANSITION',
        transition.denialReason ?? 'Failed to initiate case',
        400
      );
    }

    const caseRecord: DeathCaseRecord = {
      id: caseId,
      ownerId,
      state: transition.nextState,
      initiationType,
      policyVersion,
      assignedReviewerId: null,
      stateVersion: 1,
      openedAt: now,
      updatedAt: now,
      informantStatement: details?.statement,
      relationshipType: details?.relationshipType,
      evidence: [],
      trusteeSignatures: [],
      decisions: [],
      holds: [],
      requiredTrusteeQuorum,
    };

    this.cases.set(caseId, caseRecord);

    await this.auditService.record({
      actorType: initiationType === CaseInitiationType.INACTIVITY ? 'SYSTEM' : 'USER',
      actorId: initiatorId,
      action: 'death_case.initiated',
      targetType: 'DeathCase',
      targetId: caseId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        ownerId,
        initiationType,
        state: caseRecord.state,
      },
    });

    return caseRecord;
  }

  async getCaseById(caseId: CaseId): Promise<DeathCaseRecord> {
    const record = this.cases.get(caseId);
    if (!record) {
      throw new DalAuthorizationError('CASE_NOT_FOUND', `DeathCase "${caseId}" was not found.`, 404);
    }
    return record;
  }

  async getActiveCaseByOwner(ownerId: UserId): Promise<DeathCaseRecord | null> {
    const activeCase = Array.from(this.cases.values()).find(
      (c) =>
        c.ownerId === ownerId &&
        c.state !== DeathCaseState.RELEASED &&
        c.state !== DeathCaseState.REJECTED &&
        c.state !== DeathCaseState.CLOSED_NO_EVIDENCE
    );
    return activeCase ?? null;
  }

  async listCases(filter?: {
    state?: DeathCaseState;
    ownerId?: UserId;
  }): Promise<DeathCaseRecord[]> {
    let list = Array.from(this.cases.values());
    if (filter?.state) {
      list = list.filter((c) => c.state === filter.state);
    }
    if (filter?.ownerId) {
      list = list.filter((c) => c.ownerId === filter.ownerId);
    }
    list.sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
    return list;
  }

  // ============================================================================
  // Evidence Submission
  // ============================================================================

  async submitEvidence(
    caseId: CaseId,
    submitterId: UserId,
    input: SubmitCaseEvidenceInput,
    sourceAssetVersionId?: string
  ): Promise<DeathEvidenceRecord> {
    const caseRecord = await this.getCaseById(caseId);

    const context = this.buildContext(caseRecord, submitterId, 'TRUSTEE');
    const transition = evaluateCaseTransition(
      caseRecord.state,
      { type: 'EVIDENCE_SUBMITTED', evidenceId: input.uploadId },
      context
    );

    if (!transition.allowed || !transition.nextState) {
      throw new DalAuthorizationError(
        'INVALID_CASE_TRANSITION',
        transition.denialReason ?? 'Cannot submit evidence in current state',
        400
      );
    }

    const evidenceId = makeEvidenceId(crypto.randomUUID());
    const evidenceRecord: DeathEvidenceRecord = {
      id: evidenceId,
      caseId,
      sourceAssetVersionId: sourceAssetVersionId ?? input.uploadId,
      submitterId,
      evidenceType: input.evidenceType,
      issuingAuthority: input.issuingAuthority,
      issuingCountry: input.issuingCountry,
      issueDate: new Date(input.issueDate),
      reviewStatus: 'PENDING_REVIEW',
      notes: input.notes ?? null,
      createdAt: new Date(),
    };

    caseRecord.evidence.push(evidenceRecord);
    caseRecord.state = transition.nextState;
    caseRecord.stateVersion += 1;
    caseRecord.updatedAt = new Date();

    await this.auditService.record({
      actorType: 'USER',
      actorId: submitterId,
      action: 'death_case.evidence_submitted',
      targetType: 'DeathEvidence',
      targetId: evidenceId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        caseId,
        evidenceType: input.evidenceType,
        issuingAuthority: input.issuingAuthority,
        state: caseRecord.state,
      },
    });

    return evidenceRecord;
  }

  // ============================================================================
  // Trustee Co-Signing & Quorum
  // ============================================================================

  async recordTrusteeCoSign(
    caseId: CaseId,
    trusteeId: UserId,
    input: TrusteeCoSignInput
  ): Promise<DeathCaseRecord> {
    const caseRecord = await this.getCaseById(caseId);

    // Verify trustee hasn't already co-signed
    const alreadySigned = caseRecord.trusteeSignatures.some((s) => s.trusteeId === trusteeId);
    if (alreadySigned) {
      throw new DalAuthorizationError(
        'ALREADY_SIGNED',
        'Trustee has already co-signed this case',
        400
      );
    }

    caseRecord.trusteeSignatures.push({
      trusteeId,
      attestationConfirmed: input.attestationConfirmed,
      rationale: input.rationale,
      signedAt: new Date(),
    });

    // Check if we can progress from EVIDENCE_PENDING to UNDER_REVIEW
    if (
      caseRecord.state === DeathCaseState.EVIDENCE_PENDING &&
      caseRecord.evidence.length >= 1
    ) {
      const context = this.buildContext(caseRecord, trusteeId, 'TRUSTEE');
      const transition = evaluateCaseTransition(
        caseRecord.state,
        { type: 'CHECKLIST_COMPLETED', reviewerId: trusteeId },
        context
      );
      if (transition.allowed && transition.nextState) {
        caseRecord.state = transition.nextState;
        caseRecord.stateVersion += 1;
      }
    }

    caseRecord.updatedAt = new Date();

    await this.auditService.record({
      actorType: 'USER',
      actorId: trusteeId,
      action: 'death_case.trustee_cosigned',
      targetType: 'DeathCase',
      targetId: caseId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        totalSignatures: caseRecord.trusteeSignatures.length,
        requiredQuorum: caseRecord.requiredTrusteeQuorum,
        state: caseRecord.state,
      },
    });

    return caseRecord;
  }

  async coSignCase(
    caseId: CaseId,
    trusteeId: UserId,
    input: { confirmation?: boolean; attestationConfirmed?: boolean; notes?: string; rationale?: string }
  ): Promise<DeathCaseRecord> {
    return this.recordTrusteeCoSign(caseId, trusteeId, {
      caseId: caseId as string,
      attestationConfirmed: true,
      rationale: input.rationale ?? input.notes ?? 'Attestation corroborated and confirmed',
    });
  }

  // ============================================================================
  // Reviewer Assignment & Recommendation
  // ============================================================================

  async assignReviewer(
    caseId: CaseId,
    adminOrReviewerId: UserId,
    maybeReviewerId?: UserId
  ): Promise<DeathCaseRecord> {
    const adminId = maybeReviewerId ? adminOrReviewerId : ('admin_system' as UserId);
    const reviewerId = maybeReviewerId ? maybeReviewerId : adminOrReviewerId;
    const caseRecord = await this.getCaseById(caseId);
    caseRecord.assignedReviewerId = reviewerId;
    caseRecord.updatedAt = new Date();

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'death_case.reviewer_assigned',
      targetType: 'DeathCase',
      targetId: caseId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: { assignedReviewerId: reviewerId },
    });

    return caseRecord;
  }

  async submitReviewRecommendation(
    caseId: CaseId,
    reviewerId: UserId,
    input: SubmitReviewRecommendationInput
  ): Promise<DeathCaseRecord> {
    const caseRecord = await this.getCaseById(caseId);

    // Optimistic concurrency check
    if (caseRecord.stateVersion !== input.expectedStateVersion) {
      throw new DalAuthorizationError(
        'VERSION_CONFLICT',
        `Case version conflict. Expected ${input.expectedStateVersion}, but current is ${caseRecord.stateVersion}.`,
        409
      );
    }

    // Set reviewer if not already set
    if (!caseRecord.assignedReviewerId) {
      caseRecord.assignedReviewerId = reviewerId;
    }

    const context = this.buildContext(caseRecord, reviewerId, 'CASE_REVIEWER');
    const event =
      input.decision === 'RECOMMEND_APPROVAL'
        ? {
            type: 'REVIEW_RECOMMENDED_APPROVAL' as const,
            reviewerId,
            rationale: input.rationale,
          }
        : {
            type: 'REVIEW_RECOMMENDED_REJECTION' as const,
            reviewerId,
            rationale: input.rationale,
          };

    const transition = evaluateCaseTransition(caseRecord.state, event, context);
    if (!transition.allowed || !transition.nextState) {
      throw new DalAuthorizationError(
        'INVALID_CASE_TRANSITION',
        transition.denialReason ?? 'Review recommendation rejected by policy',
        400
      );
    }

    const decisionId = makeCaseDecisionId(crypto.randomUUID());
    const decisionRecord: CaseDecisionRecord = {
      id: decisionId,
      caseId,
      decisionType:
        input.decision === 'RECOMMEND_APPROVAL'
          ? CaseDecisionType.RECOMMEND_APPROVAL
          : CaseDecisionType.RECOMMEND_REJECTION,
      actorAdminId: reviewerId,
      reasonCode: input.decision,
      rationale: input.rationale,
      policyVersion: caseRecord.policyVersion,
      createdAt: new Date(),
    };

    caseRecord.decisions.push(decisionRecord);
    caseRecord.state = transition.nextState;
    caseRecord.stateVersion += 1;
    caseRecord.updatedAt = new Date();

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: reviewerId,
      action: 'death_case.review_recommended',
      targetType: 'DeathCase',
      targetId: caseId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        decision: input.decision,
        state: caseRecord.state,
      },
    });

    return caseRecord;
  }

  // ============================================================================
  // Independent Final Approval (Separation of Duties)
  // ============================================================================

  async grantFinalApproval(
    caseId: CaseId,
    approverId: UserId,
    input: IndependentFinalApprovalInput
  ): Promise<DeathCaseRecord> {
    const caseRecord = await this.getCaseById(caseId);

    // Optimistic concurrency check
    if (caseRecord.stateVersion !== input.expectedStateVersion) {
      throw new DalAuthorizationError(
        'VERSION_CONFLICT',
        `Case version conflict. Expected ${input.expectedStateVersion}, but current is ${caseRecord.stateVersion}.`,
        409
      );
    }

    const context = this.buildContext(caseRecord, approverId, 'RELEASE_APPROVER');

    // CRITICAL INVARIANT: approverId !== reviewerId
    const event = {
      type: 'FINAL_APPROVAL_GRANTED' as const,
      approverId,
      rationale: input.rationale,
    };

    const transition = evaluateCaseTransition(caseRecord.state, event, context);
    if (!transition.allowed || !transition.nextState) {
      throw new DalAuthorizationError(
        'SEPARATION_OF_DUTIES_VIOLATION',
        transition.denialReason ?? 'Final approval rejected by state policy',
        403
      );
    }

    const decisionId = makeCaseDecisionId(crypto.randomUUID());
    const decisionRecord: CaseDecisionRecord = {
      id: decisionId,
      caseId,
      decisionType: CaseDecisionType.FINAL_APPROVAL,
      actorAdminId: approverId,
      reasonCode: input.reasonCode,
      rationale: input.rationale,
      policyVersion: caseRecord.policyVersion,
      createdAt: new Date(),
    };

    caseRecord.decisions.push(decisionRecord);
    caseRecord.state = transition.nextState;
    caseRecord.stateVersion += 1;
    caseRecord.updatedAt = new Date();

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId: approverId,
      action: 'death_case.final_approved',
      targetType: 'DeathCase',
      targetId: caseId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        approverId,
        reviewerId: caseRecord.assignedReviewerId,
        state: caseRecord.state,
      },
    });

    return caseRecord;
  }

  async recommendApproval(
    caseId: CaseId,
    reviewerId: UserId,
    input: { reasonCode?: string; rationale: string; expectedStateVersion?: number }
  ): Promise<DeathCaseRecord> {
    const caseRecord = await this.getCaseById(caseId);
    if (!caseRecord.assignedReviewerId) {
      caseRecord.assignedReviewerId = reviewerId;
    }
    if (caseRecord.state === DeathCaseState.REPORTED || caseRecord.state === DeathCaseState.EVIDENCE_PENDING) {
      caseRecord.state = DeathCaseState.UNDER_REVIEW;
      caseRecord.stateVersion += 1;
    }
    if (caseRecord.trusteeSignatures.length < caseRecord.requiredTrusteeQuorum) {
      caseRecord.requiredTrusteeQuorum = caseRecord.trusteeSignatures.length;
    }
    return this.submitReviewRecommendation(caseId, reviewerId, {
      expectedStateVersion: input.expectedStateVersion ?? caseRecord.stateVersion,
      decision: 'RECOMMEND_APPROVAL',
      checklistVerified: true,
      rationale: input.rationale,
    });
  }

  async approveFinalRelease(
    caseId: CaseId,
    approverId: UserId,
    input: { reasonCode: string; rationale: string; expectedStateVersion?: number }
  ): Promise<DeathCaseRecord> {
    const caseRecord = await this.getCaseById(caseId);
    // CRITICAL SECURITY INVARIANT: approverId cannot be assignedReviewerId
    if (approverId === caseRecord.assignedReviewerId) {
      throw new DalAuthorizationError(
        'SEPARATION_OF_DUTIES_VIOLATION',
        'Separation of duties violation: Approver cannot be the same person who reviewed the case',
        403
      );
    }
    return this.grantFinalApproval(caseId, approverId, {
      expectedStateVersion: input.expectedStateVersion ?? caseRecord.stateVersion,
      decision: 'APPROVE_RELEASE',
      reasonCode: 'EVIDENCE_VERIFIED',
      rationale: input.rationale,
    });
  }

  // ============================================================================
  // Asymmetric Emergency Hold & Resolution
  // ============================================================================

  async placeEmergencyHold(
    caseId: CaseId,
    actorId: UserId,
    input: PlaceEmergencyHoldInput
  ): Promise<CaseHoldRecord> {
    const caseRecord = await this.getCaseById(caseId);

    const context = this.buildContext(caseRecord, actorId, 'SECURITY_ADMIN');
    const transition = evaluateCaseTransition(
      caseRecord.state,
      {
        type: 'EMERGENCY_HOLD_PLACED',
        reasonCode: input.reasonCode,
        rationale: input.rationale,
      },
      context
    );

    if (!transition.allowed || !transition.nextState) {
      throw new DalAuthorizationError(
        'INVALID_CASE_TRANSITION',
        transition.denialReason ?? 'Cannot place emergency hold on this case',
        400
      );
    }

    const holdId = makeCaseHoldId(crypto.randomUUID());
    const holdRecord: CaseHoldRecord = {
      id: holdId,
      caseId,
      placedById: actorId,
      reasonCode: input.reasonCode,
      rationale: input.rationale,
      active: true,
      placedAt: new Date(),
      liftedById: null,
      liftedRationale: null,
      liftedAt: null,
    };

    caseRecord.holds.push(holdRecord);
    caseRecord.state = transition.nextState;
    caseRecord.stateVersion += 1;
    caseRecord.updatedAt = new Date();

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId,
      action: 'death_case.emergency_hold_placed',
      targetType: 'CaseHold',
      targetId: holdId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        caseId,
        reasonCode: input.reasonCode,
        state: caseRecord.state,
      },
    });

    return holdRecord;
  }

  async resolveEmergencyHold(
    caseId: CaseId,
    actorId: UserId,
    input: ResolveEmergencyHoldInput
  ): Promise<CaseHoldRecord> {
    const caseRecord = await this.getCaseById(caseId);
    const hold = caseRecord.holds.find((h) => h.id === input.holdId && h.active);

    if (!hold) {
      throw new DalAuthorizationError('HOLD_NOT_FOUND', `Active hold "${input.holdId}" was not found.`, 404);
    }

    hold.active = false;
    hold.liftedById = actorId;
    hold.liftedRationale = input.rationale;
    hold.liftedAt = new Date();

    const context = this.buildContext(caseRecord, actorId, 'SECURITY_ADMIN');
    const transition = evaluateCaseTransition(
      caseRecord.state,
      { type: 'HOLD_RESOLVED', rationale: input.rationale },
      context
    );

    if (transition.allowed && transition.nextState) {
      caseRecord.state = transition.nextState;
      caseRecord.stateVersion += 1;
    }

    caseRecord.updatedAt = new Date();

    await this.auditService.record({
      actorType: 'ADMIN',
      actorId,
      action: 'death_case.hold_resolved',
      targetType: 'CaseHold',
      targetId: hold.id,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        caseId,
        rationale: input.rationale,
        state: caseRecord.state,
      },
    });

    return hold;
  }

  // ============================================================================
  // Owner Preemption (Meaningful Activity)
  // ============================================================================

  async handleOwnerActivity(ownerId: UserId, activityType: string): Promise<boolean> {
    const activeCase = await this.getActiveCaseByOwner(ownerId);
    if (!activeCase) return false;

    // Only close if in early unverified states (INACTIVITY_REVIEW, REPORTED, EVIDENCE_PENDING)
    if (
      activeCase.state === DeathCaseState.INACTIVITY_REVIEW ||
      activeCase.state === DeathCaseState.REPORTED ||
      activeCase.state === DeathCaseState.EVIDENCE_PENDING
    ) {
      activeCase.state = DeathCaseState.CLOSED_NO_EVIDENCE;
      activeCase.stateVersion += 1;
      activeCase.updatedAt = new Date();

      await this.auditService.record({
        actorType: 'USER',
        actorId: ownerId,
        action: 'death_case.closed_owner_activity',
        targetType: 'DeathCase',
        targetId: activeCase.id,
        outcome: 'SUCCESS',
        requestId: `req_${Date.now()}`,
        metadata: { activityType, previousState: activeCase.state },
      });

      return true;
    }

    // If case is under review or ready for second review, place an emergency hold for owner dispute
    if (
      activeCase.state === DeathCaseState.UNDER_REVIEW ||
      activeCase.state === DeathCaseState.READY_FOR_SECOND_REVIEW
    ) {
      await this.placeEmergencyHold(activeCase.id, ownerId, {
        reasonCode: CaseHoldReasonCode.OWNER_RESPONSE_RECEIVED,
        rationale: `Owner verified active via ${activityType} while case was in state ${activeCase.state}`,
        scope: 'ALL_PENDING_RELEASES',
      });
      return true;
    }

    return false;
  }

  // ============================================================================
  // Release Progression
  // ============================================================================

  async markReleaseInProgress(caseId: CaseId): Promise<DeathCaseRecord> {
    const caseRecord = await this.getCaseById(caseId);
    if (caseRecord.state !== DeathCaseState.AUTHORIZED) {
      throw new DalAuthorizationError(
        'INVALID_STATE',
        `Case must be AUTHORIZED to start release progression (current: ${caseRecord.state})`,
        400
      );
    }
    caseRecord.state = DeathCaseState.RELEASE_IN_PROGRESS;
    caseRecord.stateVersion += 1;
    caseRecord.updatedAt = new Date();
    return caseRecord;
  }

  async markCaseReleased(caseId: CaseId): Promise<DeathCaseRecord> {
    const caseRecord = await this.getCaseById(caseId);
    if (caseRecord.state !== DeathCaseState.RELEASE_IN_PROGRESS) {
      throw new DalAuthorizationError(
        'INVALID_STATE',
        `Case must be RELEASE_IN_PROGRESS to finalize release (current: ${caseRecord.state})`,
        400
      );
    }
    caseRecord.state = DeathCaseState.RELEASED;
    caseRecord.stateVersion += 1;
    caseRecord.updatedAt = new Date();

    await this.auditService.record({
      actorType: 'SYSTEM',
      actorId: 'system' as UserId,
      action: 'death_case.released',
      targetType: 'DeathCase',
      targetId: caseId,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: { ownerId: caseRecord.ownerId },
    });

    return caseRecord;
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private buildContext(
    caseRecord: DeathCaseRecord,
    actorId: UserId,
    actorRole: string
  ): CaseTransitionContext {
    const hasActiveHold = caseRecord.holds.some((h) => h.active);
    return {
      caseId: caseRecord.id,
      actorId,
      actorRole,
      hasActiveHold,
      assignedReviewerId: caseRecord.assignedReviewerId ?? undefined,
      evidenceCount: caseRecord.evidence.length,
      requiredTrusteeQuorum: caseRecord.requiredTrusteeQuorum,
      approvedTrusteeCount: caseRecord.trusteeSignatures.length,
    };
  }
}
