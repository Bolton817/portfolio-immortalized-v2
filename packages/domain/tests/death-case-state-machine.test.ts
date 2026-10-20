import { describe, it, expect } from 'vitest';
import {
  DeathCaseState,
  evaluateCaseTransition,
  CaseTransitionContext,
  CaseHoldReasonCode,
  makeCaseId,
  makeUserId,
  evaluateInactivityStatus,
  isMeaningfulActivity,
} from '../src/index.js';

describe('DeathCaseStateMachine (TDD Chapter 11 & Appendix C)', () => {
  const baseContext: CaseTransitionContext = {
    caseId: makeCaseId('case-uuid-1'),
    actorId: makeUserId('admin-reviewer-1'),
    actorRole: 'CASE_REVIEWER',
    hasActiveHold: false,
    assignedReviewerId: makeUserId('admin-reviewer-1'),
    evidenceCount: 2,
    requiredTrusteeQuorum: 2,
    approvedTrusteeCount: 2,
    ownerRespondedRecently: false,
  };

  it('CASE-01: Inactivity threshold reaches INACTIVITY_REVIEW, never direct release', () => {
    const result = evaluateCaseTransition(
      DeathCaseState.NONE,
      { type: 'INACTIVITY_THRESHOLD_REACHED', policyVersion: 'v1' },
      baseContext
    );

    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe(DeathCaseState.INACTIVITY_REVIEW);
    expect(result.requiredSideEffects).toContain('SEND_OWNER_INACTIVITY_NOTICE');
  });

  it('CASE-08: Verified owner meaningful activity immediately closes inactivity review', () => {
    const result = evaluateCaseTransition(
      DeathCaseState.INACTIVITY_REVIEW,
      { type: 'OWNER_ACTIVITY_VERIFIED', activityType: 'AUTH_PASSKEY_VERIFIED' },
      baseContext
    );

    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe(DeathCaseState.CLOSED_NO_EVIDENCE);
    expect(result.requiredSideEffects).toContain('CANCEL_INACTIVITY_ESCALATION');
  });

  it('Quorum Guard: Case cannot be recommended for approval if trustee quorum is not met', () => {
    const contextUnderQuorum: CaseTransitionContext = {
      ...baseContext,
      approvedTrusteeCount: 1, // Quorum is 2
    };

    const result = evaluateCaseTransition(
      DeathCaseState.UNDER_REVIEW,
      {
        type: 'REVIEW_RECOMMENDED_APPROVAL',
        reviewerId: makeUserId('admin-reviewer-1'),
        rationale: 'Evidence looks genuine',
      },
      contextUnderQuorum
    );

    expect(result.allowed).toBe(false);
    expect(result.denialReason).toContain('Trustee quorum not met');
  });

  it('CASE-10: Separation of Duties — Reviewer CANNOT final-approve their own recommendation', () => {
    const result = evaluateCaseTransition(
      DeathCaseState.READY_FOR_SECOND_REVIEW,
      {
        type: 'FINAL_APPROVAL_GRANTED',
        approverId: makeUserId('admin-reviewer-1'), // Same ID as assignedReviewerId
        rationale: 'Approving my own recommendation',
      },
      baseContext
    );

    expect(result.allowed).toBe(false);
    expect(result.denialReason).toContain('Separation of duties violation');
  });

  it('Distinct Approver: Independent final approver successfully authorizes release', () => {
    const independentApproverId = makeUserId('admin-approver-2');
    const result = evaluateCaseTransition(
      DeathCaseState.READY_FOR_SECOND_REVIEW,
      {
        type: 'FINAL_APPROVAL_GRANTED',
        approverId: independentApproverId, // Distinct from reviewer-1
        rationale: 'Independent verification completed',
      },
      baseContext
    );

    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe(DeathCaseState.AUTHORIZED);
    expect(result.requiredSideEffects).toContain('COMMIT_IMMUTABLE_FINAL_APPROVAL');
  });

  it('CASE-12: Emergency hold immediately freezes an active case', () => {
    const result = evaluateCaseTransition(
      DeathCaseState.UNDER_REVIEW,
      {
        type: 'EMERGENCY_HOLD_PLACED',
        reasonCode: CaseHoldReasonCode.SUSPECTED_FRAUD,
        rationale: 'Trustee phone reported compromised',
      },
      baseContext
    );

    expect(result.allowed).toBe(true);
    expect(result.nextState).toBe(DeathCaseState.HOLD);
    expect(result.requiredSideEffects).toContain('SUSPEND_IN_FLIGHT_RELEASE_JOBS');
  });

  it('Hold Guard: When case is on hold, transitions are blocked until hold is resolved', () => {
    const contextOnHold: CaseTransitionContext = {
      ...baseContext,
      hasActiveHold: true,
    };

    const result = evaluateCaseTransition(
      DeathCaseState.HOLD,
      {
        type: 'REVIEW_RECOMMENDED_APPROVAL',
        reviewerId: makeUserId('admin-reviewer-1'),
        rationale: 'Trying to proceed while on hold',
      },
      contextOnHold
    );

    expect(result.allowed).toBe(false);
    expect(result.denialReason).toContain('Case is currently on HOLD');
  });

  it('Owner Veto Guard: Verified owner activity blocks final release approval', () => {
    const contextWithOwnerResponse: CaseTransitionContext = {
      ...baseContext,
      ownerRespondedRecently: true,
    };

    const result = evaluateCaseTransition(
      DeathCaseState.READY_FOR_SECOND_REVIEW,
      {
        type: 'FINAL_APPROVAL_GRANTED',
        approverId: makeUserId('admin-approver-2'),
        rationale: 'Attempting release despite owner dispute',
      },
      contextWithOwnerResponse
    );

    expect(result.allowed).toBe(false);
    expect(result.denialReason).toContain('Recent verified owner activity detected');
  });
});

describe('Inactivity Policy & Meaningful Activity (Chapter 11)', () => {
  it('Accepts only meaningful authenticated activities', () => {
    expect(isMeaningfulActivity('AUTH_PASSKEY_VERIFIED')).toBe(true);
    expect(isMeaningfulActivity('VAULT_UPLOAD_COMMITTED')).toBe(true);
    expect(isMeaningfulActivity('LEGACY_PLAN_CONFIRMED')).toBe(true);

    // Passive telemetry must be rejected
    expect(isMeaningfulActivity('EMAIL_OPEN_TRACKER')).toBe(false);
    expect(isMeaningfulActivity('BACKGROUND_TOKEN_REFRESH')).toBe(false);
    expect(isMeaningfulActivity('APP_LAUNCH_PASSIVE')).toBe(false);
  });

  it('Calculates inactivity correctly across thresholds', () => {
    const now = new Date('2026-10-20T00:00:00Z');

    // 10 days inactive -> ACTIVE
    const activeDate = new Date('2026-10-10T00:00:00Z');
    expect(evaluateInactivityStatus(activeDate, now).status).toBe('ACTIVE');

    // 80 days inactive -> REMINDER_DUE
    const reminderDate = new Date('2026-08-01T00:00:00Z');
    expect(evaluateInactivityStatus(reminderDate, now).status).toBe('REMINDER_DUE');

    // 95 days inactive -> THRESHOLD_REACHED
    const thresholdDate = new Date('2026-07-15T00:00:00Z');
    expect(evaluateInactivityStatus(thresholdDate, now).status).toBe('THRESHOLD_REACHED');

    // 110 days inactive -> GRACE_PERIOD_EXPIRED (triggers investigation, never auto-release)
    const expiredDate = new Date('2026-06-25T00:00:00Z');
    const expiredStatus = evaluateInactivityStatus(expiredDate, now);
    expect(expiredStatus.status).toBe('GRACE_PERIOD_EXPIRED');
    expect(expiredStatus.shouldOpenInvestigation).toBe(true);
  });
});
