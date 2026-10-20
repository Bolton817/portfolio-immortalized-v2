import {
  DeathCaseState,
  CaseHoldReasonCode,
} from '../types/enums.js';
import { UserId, CaseId } from '../types/identifiers.js';

export interface CaseTransitionContext {
  caseId: CaseId;
  actorId: UserId;
  actorRole: string;
  hasActiveHold: boolean;
  assignedReviewerId?: UserId;
  evidenceCount: number;
  requiredTrusteeQuorum: number;
  approvedTrusteeCount: number;
  ownerRespondedRecently?: boolean;
}

export type DeathCaseEvent =
  | { type: 'INACTIVITY_THRESHOLD_REACHED'; policyVersion: string }
  | { type: 'TRUSTEE_REPORT_SUBMITTED'; submitterId: UserId; reason: string }
  | { type: 'ADMIN_REPORT_SUBMITTED'; adminId: UserId; reason: string }
  | { type: 'OWNER_ACTIVITY_VERIFIED'; activityType: string }
  | { type: 'ESCALATION_WINDOW_EXPIRED' }
  | { type: 'EVIDENCE_SUBMITTED'; evidenceId: string }
  | { type: 'CHECKLIST_COMPLETED'; reviewerId: UserId }
  | { type: 'MORE_INFO_REQUESTED'; reason: string; dueDate: Date }
  | { type: 'CONFLICT_OR_DISPUTE_RAISED'; reason: string }
  | { type: 'EMERGENCY_HOLD_PLACED'; reasonCode: CaseHoldReasonCode; rationale: string }
  | { type: 'HOLD_RESOLVED'; rationale: string }
  | { type: 'REVIEW_RECOMMENDED_APPROVAL'; reviewerId: UserId; rationale: string }
  | { type: 'REVIEW_RECOMMENDED_REJECTION'; reviewerId: UserId; rationale: string }
  | { type: 'FINAL_APPROVAL_GRANTED'; approverId: UserId; rationale: string }
  | { type: 'FINAL_REJECTION_GRANTED'; approverId: UserId; rationale: string }
  | { type: 'RELEASE_PLANNING_STARTED' }
  | { type: 'ALL_GRANTS_ISSUED' }
  | { type: 'POST_RELEASE_DISPUTE'; reason: string }
  | { type: 'REOPEN_WITH_NEW_EVIDENCE'; newEvidenceId: string };

export interface TransitionResult {
  allowed: boolean;
  nextState?: DeathCaseState;
  denialReason?: string;
  requiredSideEffects?: string[];
}

/**
 * Pure state machine evaluating transitions for a DeathCase.
 * Strict adherence to Chapter 11 and Appendix C of the TDD.
 */
export function evaluateCaseTransition(
  currentState: DeathCaseState,
  event: DeathCaseEvent,
  context: CaseTransitionContext
): TransitionResult {
  // Guard 1: Emergency hold can be placed at virtually any active stage
  if (event.type === 'EMERGENCY_HOLD_PLACED') {
    if (
      currentState === DeathCaseState.NONE ||
      currentState === DeathCaseState.CLOSED_NO_EVIDENCE ||
      currentState === DeathCaseState.REJECTED
    ) {
      return { allowed: false, denialReason: `Cannot place hold on a non-active case in state ${currentState}` };
    }
    return {
      allowed: true,
      nextState: DeathCaseState.HOLD,
      requiredSideEffects: [
        'CREATE_CASE_HOLD_RECORD',
        'SUSPEND_IN_FLIGHT_RELEASE_JOBS',
        'EMIT_SECURITY_AUDIT_EVENT',
      ],
    };
  }

  // Guard 2: If an active hold is in place, no forward progression is allowed except resolving the hold
  if (context.hasActiveHold && event.type !== 'HOLD_RESOLVED') {
    return {
      allowed: false,
      denialReason: 'Case is currently on HOLD. The hold must be formally resolved before progressing.',
    };
  }

  // Guard 3: If owner responded, lock down release transitions immediately
  if (context.ownerRespondedRecently && (
    event.type === 'FINAL_APPROVAL_GRANTED' ||
    event.type === 'RELEASE_PLANNING_STARTED' ||
    event.type === 'REVIEW_RECOMMENDED_APPROVAL'
  )) {
    return {
      allowed: false,
      denialReason: 'Recent verified owner activity detected. Case must be reviewed for owner dispute.',
    };
  }

  switch (currentState) {
    case DeathCaseState.NONE: {
      if (event.type === 'INACTIVITY_THRESHOLD_REACHED') {
        return {
          allowed: true,
          nextState: DeathCaseState.INACTIVITY_REVIEW,
          requiredSideEffects: ['SEND_OWNER_INACTIVITY_NOTICE', 'EMIT_AUDIT_EVENT'],
        };
      }
      if (event.type === 'TRUSTEE_REPORT_SUBMITTED' || event.type === 'ADMIN_REPORT_SUBMITTED') {
        return {
          allowed: true,
          nextState: DeathCaseState.REPORTED,
          requiredSideEffects: ['NOTIFY_ADMIN_CASE_QUEUE', 'EMIT_AUDIT_EVENT'],
        };
      }
      return { allowed: false, denialReason: `Invalid initial event for state NONE: ${event.type}` };
    }

    case DeathCaseState.INACTIVITY_REVIEW: {
      if (event.type === 'OWNER_ACTIVITY_VERIFIED') {
        return {
          allowed: true,
          nextState: DeathCaseState.CLOSED_NO_EVIDENCE,
          requiredSideEffects: ['CANCEL_INACTIVITY_ESCALATION', 'EMIT_AUDIT_EVENT'],
        };
      }
      if (event.type === 'ESCALATION_WINDOW_EXPIRED') {
        return {
          allowed: true,
          nextState: DeathCaseState.UNDER_REVIEW,
          requiredSideEffects: ['NOTIFY_TRUSTEES_AND_ADMINS', 'EMIT_AUDIT_EVENT'],
        };
      }
      return { allowed: false, denialReason: `Invalid transition from INACTIVITY_REVIEW on ${event.type}` };
    }

    case DeathCaseState.REPORTED: {
      if (event.type === 'EVIDENCE_SUBMITTED') {
        return {
          allowed: true,
          nextState: DeathCaseState.EVIDENCE_PENDING,
          requiredSideEffects: ['REGISTER_EVIDENCE_HASH', 'QUEUE_MALWARE_SCAN'],
        };
      }
      if (event.type === 'CONFLICT_OR_DISPUTE_RAISED') {
        return {
          allowed: true,
          nextState: DeathCaseState.DISPUTED,
          requiredSideEffects: ['NOTIFY_SECURITY_ADMIN'],
        };
      }
      return { allowed: false, denialReason: `Invalid transition from REPORTED on ${event.type}` };
    }

    case DeathCaseState.EVIDENCE_PENDING: {
      if (event.type === 'CHECKLIST_COMPLETED') {
        if (context.evidenceCount < 1) {
          return { allowed: false, denialReason: 'At least one verified piece of evidence is required.' };
        }
        return {
          allowed: true,
          nextState: DeathCaseState.UNDER_REVIEW,
          requiredSideEffects: ['ASSIGN_CASE_REVIEWER', 'EMIT_AUDIT_EVENT'],
        };
      }
      if (event.type === 'MORE_INFO_REQUESTED') {
        return {
          allowed: true,
          nextState: DeathCaseState.NEEDS_MORE_INFO,
          requiredSideEffects: ['DISPATCH_EVIDENCE_REQUEST_NOTICE'],
        };
      }
      if (event.type === 'CONFLICT_OR_DISPUTE_RAISED') {
        return { allowed: true, nextState: DeathCaseState.DISPUTED };
      }
      return { allowed: false, denialReason: `Invalid transition from EVIDENCE_PENDING on ${event.type}` };
    }

    case DeathCaseState.NEEDS_MORE_INFO: {
      if (event.type === 'EVIDENCE_SUBMITTED') {
        return {
          allowed: true,
          nextState: DeathCaseState.EVIDENCE_PENDING,
          requiredSideEffects: ['REGISTER_EVIDENCE_HASH'],
        };
      }
      if (event.type === 'CONFLICT_OR_DISPUTE_RAISED') {
        return { allowed: true, nextState: DeathCaseState.DISPUTED };
      }
      return { allowed: false, denialReason: `Invalid transition from NEEDS_MORE_INFO on ${event.type}` };
    }

    case DeathCaseState.UNDER_REVIEW: {
      if (event.type === 'REVIEW_RECOMMENDED_APPROVAL') {
        if (context.approvedTrusteeCount < context.requiredTrusteeQuorum) {
          return {
            allowed: false,
            denialReason: `Trustee quorum not met. Requires ${context.requiredTrusteeQuorum}, but only ${context.approvedTrusteeCount} confirmed.`,
          };
        }
        return {
          allowed: true,
          nextState: DeathCaseState.READY_FOR_SECOND_REVIEW,
          requiredSideEffects: ['LOCK_REVIEW_DECISION', 'NOTIFY_RELEASE_APPROVER_QUEUE'],
        };
      }
      if (event.type === 'REVIEW_RECOMMENDED_REJECTION') {
        return {
          allowed: true,
          nextState: DeathCaseState.REJECTED,
          requiredSideEffects: ['RECORD_REJECTION_REASON', 'NOTIFY_SUBMITTER'],
        };
      }
      if (event.type === 'MORE_INFO_REQUESTED') {
        return { allowed: true, nextState: DeathCaseState.NEEDS_MORE_INFO };
      }
      if (event.type === 'CONFLICT_OR_DISPUTE_RAISED') {
        return { allowed: true, nextState: DeathCaseState.DISPUTED };
      }
      return { allowed: false, denialReason: `Invalid transition from UNDER_REVIEW on ${event.type}` };
    }

    case DeathCaseState.READY_FOR_SECOND_REVIEW: {
      if (event.type === 'FINAL_APPROVAL_GRANTED') {
        // Critical Invariant: Separation of Duties (Chapter 1 & Appendix C)
        // The Final Approver MUST NOT be the Case Reviewer who recommended approval!
        if (context.assignedReviewerId && event.approverId === context.assignedReviewerId) {
          return {
            allowed: false,
            denialReason: 'Separation of duties violation: Final approver cannot be the primary case reviewer.',
          };
        }
        return {
          allowed: true,
          nextState: DeathCaseState.AUTHORIZED,
          requiredSideEffects: [
            'COMMIT_IMMUTABLE_FINAL_APPROVAL',
            'TRIGGER_RELEASE_PLANNER_JOB',
            'EMIT_AUDIT_EVENT',
          ],
        };
      }
      if (event.type === 'FINAL_REJECTION_GRANTED') {
        return {
          allowed: true,
          nextState: DeathCaseState.REJECTED,
          requiredSideEffects: ['RECORD_REJECTION_REASON'],
        };
      }
      return { allowed: false, denialReason: `Invalid transition from READY_FOR_SECOND_REVIEW on ${event.type}` };
    }

    case DeathCaseState.AUTHORIZED: {
      if (event.type === 'RELEASE_PLANNING_STARTED') {
        return {
          allowed: true,
          nextState: DeathCaseState.RELEASE_IN_PROGRESS,
          requiredSideEffects: ['CREATE_BENEFICIARY_GRANTS', 'INITIATE_OUTBOX_NOTIFICATIONS'],
        };
      }
      return { allowed: false, denialReason: `Invalid transition from AUTHORIZED on ${event.type}` };
    }

    case DeathCaseState.RELEASE_IN_PROGRESS: {
      if (event.type === 'ALL_GRANTS_ISSUED') {
        return {
          allowed: true,
          nextState: DeathCaseState.RELEASED,
          requiredSideEffects: ['FINALIZE_CASE_AUDIT', 'NOTIFY_ADMIN_OPS'],
        };
      }
      return { allowed: false, denialReason: `Invalid transition from RELEASE_IN_PROGRESS on ${event.type}` };
    }

    case DeathCaseState.HOLD: {
      if (event.type === 'HOLD_RESOLVED') {
        return {
          allowed: true,
          nextState: DeathCaseState.UNDER_REVIEW,
          requiredSideEffects: ['RECORD_HOLD_LIFT_EVENT', 'RE_EVALUATE_CASE_POLICIES'],
        };
      }
      return { allowed: false, denialReason: 'Case is on HOLD. Only HOLD_RESOLVED can transition the case.' };
    }

    case DeathCaseState.DISPUTED: {
      if (event.type === 'HOLD_RESOLVED') {
        return { allowed: true, nextState: DeathCaseState.UNDER_REVIEW };
      }
      return { allowed: false, denialReason: `Case is DISPUTED and requires formal resolution before transitioning.` };
    }

    case DeathCaseState.RELEASED: {
      if (event.type === 'POST_RELEASE_DISPUTE') {
        return {
          allowed: true,
          nextState: DeathCaseState.HOLD,
          requiredSideEffects: ['REVOKE_ACTIVE_GRANTS', 'NOTIFY_LEGAL_COUNSEL'],
        };
      }
      return { allowed: false, denialReason: 'Case is already in terminal RELEASED state.' };
    }

    case DeathCaseState.REJECTED:
    case DeathCaseState.CLOSED_NO_EVIDENCE: {
      if (event.type === 'REOPEN_WITH_NEW_EVIDENCE') {
        return {
          allowed: true,
          nextState: DeathCaseState.REPORTED,
          requiredSideEffects: ['RECORD_REOPEN_EVENT', 'ATTACH_NEW_EVIDENCE'],
        };
      }
      return { allowed: false, denialReason: `Cannot transition closed case without REOPEN_WITH_NEW_EVIDENCE.` };
    }

    default:
      return { allowed: false, denialReason: `Unknown case state: ${currentState}` };
  }
}
