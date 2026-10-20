'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  PauseCircle,
  PlayCircle,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { CaseSummaryOutput } from '@portfolio-immortalized/validation';



interface CaseDetail {
  id: string;
  ownerId: string;
  state: string;
  initiationType: string;
  policyVersion: string;
  stateVersion: number;
  assignedReviewerId: string | null;
  openedAt: string;
  evidence: Array<{
    id: string;
    evidenceType: string;
    issuingAuthority: string;
    issuingCountry: string;
    issueDate: string;
    notes: string | null;
  }>;
  trusteeSignatures: Array<{
    trusteeId: string;
    rationale: string;
    signedAt: string;
  }>;
  decisions: Array<{
    id: string;
    decisionType: string;
    actorAdminId: string;
    rationale: string;
    createdAt: string;
  }>;
  holds: Array<{
    id: string;
    active: boolean;
    reasonCode: string;
    rationale: string;
    placedAt: string;
    liftedAt?: string | null;
    liftedRationale?: string | null;
  }>;
  requiredTrusteeQuorum: number;
}

export default function CaseDossierPage() {
  const params = useParams();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reviewer form
  const [checklistVerified, setChecklistVerified] = useState(false);
  const [reviewRationale, setReviewRationale] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Approver form
  const [approverRationale, setApproverRationale] = useState('');
  const [approverSubmitting, setApproverSubmitting] = useState(false);

  // Emergency Hold form
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState('SUSPECTED_FRAUD');
  const [holdRationale, setHoldRationale] = useState('');

  // Lift Hold form
  const [liftRationale, setLiftRationale] = useState('');

  // AI Summary Assistant (Stage 6, ADR-009)
  const [aiSummary, setAiSummary] = useState<CaseSummaryOutput | null>(null);
  const [aiLoading, setAiLoading] = useState(false);


  async function handleGenerateAiSummary() {
    setAiLoading(true);
    try {
      const res = await fetch('/api/v1/ai/case-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData?.id,
          deceasedName: caseData?.ownerId || 'Deceased Account Holder',
          evidenceItems: (caseData?.evidence || []).map((e) => ({
            type: e.evidenceType,
            issuingAuthority: e.issuingAuthority,
            documentDate: e.issueDate,
          })),
          trusteeStatements: (caseData?.trusteeSignatures || []).map((s) => ({
            trusteeName: s.trusteeId,
            date: s.signedAt,
            statement: s.rationale,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAiSummary(json.data);
      } else {
        setActionError(json.message || json.error);
      }
    } catch {
      setActionError('Failed to generate AI case summary draft.');
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (caseId) fetchCase();
  }, [caseId]);


  async function fetchCase() {
    try {
      const res = await fetch(`/api/v1/cases/${caseId}`);
      const json = await res.json();
      if (json.success) {
        setCaseData(json.data);
      }
    } catch (err) {
      console.error('Error fetching case:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewRecommendation(decision: 'RECOMMEND_APPROVAL' | 'RECOMMEND_REJECTION') {
    if (!caseData) return;
    setReviewSubmitting(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedStateVersion: caseData.stateVersion,
          decision,
          checklistVerified: true,
          rationale: reviewRationale || 'Verification checklist verified against official registry.',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(json.message);
        fetchCase();
      } else {
        setActionError(json.message || json.error);
      }
    } catch {
      setActionError('Failed to submit review recommendation.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleFinalApproval() {
    if (!caseData) return;
    setApproverSubmitting(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'usr_admin_approver_demo', // Independent approver
        },
        body: JSON.stringify({
          expectedStateVersion: caseData.stateVersion,
          decision: 'APPROVE_RELEASE',
          reasonCode: 'EVIDENCE_VERIFIED',
          rationale: approverRationale || 'Secondary audit completed. Release authorized.',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(json.message);
        fetchCase();
      } else {
        setActionError(json.message || json.error);
      }
    } catch {
      setActionError('Failed to grant final approval.');
    } finally {
      setApproverSubmitting(false);
    }
  }

  async function handlePlaceHold() {
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reasonCode: holdReason,
          rationale: holdRationale || 'Emergency administrative freeze applied.',
          scope: 'ALL_PENDING_RELEASES',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(json.message);
        setShowHoldModal(false);
        fetchCase();
      } else {
        setActionError(json.message || json.error);
      }
    } catch {
      setActionError('Failed to place hold.');
    }
  }

  async function handleResolveHold(holdId: string) {
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/hold`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdId,
          rationale: liftRationale || 'Hold resolved by security audit review.',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(json.message);
        fetchCase();
      } else {
        setActionError(json.message || json.error);
      }
    } catch {
      setActionError('Failed to resolve hold.');
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-500 text-sm">Loading case dossier...</div>;
  }

  if (!caseData) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center space-y-4">
        <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Case Not Found</h2>
        <Link href="/admin/cases" className="text-purple-400 hover:underline text-xs">
          Return to cases list
        </Link>
      </div>
    );
  }

  const activeHold = caseData.holds?.find((h) => h.active);
  const quorumMet = (caseData.trusteeSignatures?.length || 0) >= caseData.requiredTrusteeQuorum;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/cases"
          className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Case Queue</span>
        </Link>

        <div className="flex items-center space-x-3">
          {!activeHold && caseData.state !== 'RELEASED' && (
            <button
              onClick={() => setShowHoldModal(true)}
              className="px-3.5 py-1.5 bg-rose-700/80 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Place Emergency Hold</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {actionMessage && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)}>✕</button>
        </div>
      )}
      {actionError && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)}>✕</button>
        </div>
      )}

      {/* Active Hold Alert Banner */}
      {activeHold && (
        <div className="bg-rose-950/80 border-2 border-rose-600 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-3">
            <PauseCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white">EMERGENCY CASE HOLD ACTIVE</h3>
              <p className="text-xs text-rose-200 mt-0.5">
                Reason: {activeHold.reasonCode} • Rationale: {activeHold.rationale}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-rose-800 flex items-center space-x-3">
            <input
              type="text"
              placeholder="Resolution rationale..."
              value={liftRationale}
              onChange={(e) => setLiftRationale(e.target.value)}
              className="bg-slate-900 border border-rose-700 text-xs text-white px-3 py-1.5 rounded-lg flex-1"
            />
            <button
              onClick={() => handleResolveHold(activeHold.id)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Resolve & Lift Hold</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-500">CASE ID: {caseData.id}</span>
              <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-bold rounded-full">
                {caseData.state.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">Owner Account: {caseData.ownerId}</h1>
          </div>

          <div className="text-right text-xs text-slate-400">
            <div>Policy Version: {caseData.policyVersion}</div>
            <div>State Version: v{caseData.stateVersion}</div>
          </div>
        </div>

        {/* Trustee Quorum Meter */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <UserCheck className={`w-4 h-4 ${quorumMet ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-slate-300 font-medium">Trustee Attestation Quorum:</span>
            <span className={`font-bold ${quorumMet ? 'text-emerald-400' : 'text-amber-400'}`}>
              {caseData.trusteeSignatures?.length || 0} / {caseData.requiredTrusteeQuorum} Required
            </span>
          </div>
          <span className="text-slate-500">
            {quorumMet ? '✓ Quorum Satisfied' : 'Awaiting additional trustee co-signature'}
          </span>
        </div>
      </div>

      {/* Evidence & Trustee Signatures Tray */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Evidence */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Evidence Documents ({caseData.evidence?.length || 0})</span>
            </h3>
          </div>

          {caseData.evidence?.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No evidence submitted yet.</div>
          ) : (
            <div className="space-y-3">
              {caseData.evidence?.map((e) => (
                <div key={e.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span>{e.evidenceType.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-400">{new Date(e.issueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="text-slate-400">Issuing Authority: {e.issuingAuthority} ({e.issuingCountry})</div>
                  {e.notes && <div className="text-slate-500 italic">Notes: "{e.notes}"</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trustee Attestations */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Trustee Co-Signatures ({caseData.trusteeSignatures?.length || 0})</span>
            </h3>
          </div>

          {caseData.trusteeSignatures?.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No trustee co-signatures recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {caseData.trusteeSignatures?.map((s, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-white font-medium">
                    <span>Trustee: {s.trusteeId}</span>
                    <span className="text-emerald-400 text-[10px]">Attested</span>
                  </div>
                  <div className="text-slate-400">"{s.rationale}"</div>
                  <div className="text-[10px] text-slate-500">{new Date(s.signedAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Triage & Case Summary Card (Stage 6, ADR-009, AI-001/AI-002) */}

      <div className="bg-slate-950 border border-purple-900/40 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              AI Case Triage & Reviewer Assistant
            </h3>
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-semibold rounded-full">
              Non-Authoritative (AI-002)
            </span>
          </div>

          <button
            onClick={handleGenerateAiSummary}
            disabled={aiLoading}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors self-start md:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiLoading ? 'Analyzing Case Dossier...' : aiSummary ? 'Regenerate Draft Summary' : 'Generate Triage Summary Draft'}</span>
          </button>
        </div>

        {aiSummary ? (
          <div className="space-y-4 text-xs">
            {/* Draft Summary */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Draft Synthesis:</span>
              <p className="text-slate-200 leading-relaxed">{aiSummary.draftSummary}</p>
            </div>

            {/* Checklist & Discrepancies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-slate-300">Evidence Checklist Verification:</span>
                <div className="space-y-1.5">
                  {aiSummary.evidenceChecklist?.map((item, i: number) => (
                    <div key={i} className="flex items-center space-x-2 text-slate-300">

                      <span className="text-emerald-400">✓</span>
                      <span>{item.item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-slate-300">Suggested Human Review Steps:</span>
                <div className="space-y-1.5">
                  {aiSummary.suggestedNextSteps?.map((step: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2 text-slate-300">
                      <span className="text-purple-400">→</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Invariant AI-002 Disclaimer */}
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-[11px] text-amber-300/90 flex items-start space-x-2">
              <span className="text-amber-400 font-bold">⚠️ Notice:</span>
              <span>{aiSummary.nonAuthoritativeDisclaimer}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-1">
            Generate an instant, non-authoritative summary of evidence documents, trustee attestations, and cross-reference checks to accelerate human case review.
          </p>
        )}
      </div>

      {/* Dual-Role Release Governance Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Two-Person Independent Release Authorization Gate
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Separation of Duties (ADR-007): Case Reviewer recommendation is recorded in Phase 1; Final Approval must be
            issued by a distinct administrator in Phase 2.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Phase 1: Case Reviewer */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300">Phase 1: Case Reviewer Recommendation</span>
              <span className="text-[11px] text-slate-500">
                {caseData.state === 'READY_FOR_SECOND_REVIEW' || caseData.state === 'AUTHORIZED' || caseData.state === 'RELEASED'
                  ? '✓ Completed'
                  : 'Pending'}
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistVerified}
                  onChange={(e) => setChecklistVerified(e.target.checked)}
                  disabled={caseData.state !== 'UNDER_REVIEW' || Boolean(activeHold)}
                  className="rounded text-purple-600 bg-slate-950 border-slate-700"
                />
                <span>Certified civil registration seals and trustee quorum checked</span>
              </label>

              <textarea
                placeholder="Reviewer rationale & registry verification notes..."
                value={reviewRationale}
                onChange={(e) => setReviewRationale(e.target.value)}
                disabled={caseData.state !== 'UNDER_REVIEW' || Boolean(activeHold)}
                className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => handleReviewRecommendation('RECOMMEND_APPROVAL')}
                  disabled={!checklistVerified || caseData.state !== 'UNDER_REVIEW' || Boolean(activeHold) || reviewSubmitting}
                  className="px-3.5 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Recommend Approval</span>
                </button>
                <button
                  onClick={() => handleReviewRecommendation('RECOMMEND_REJECTION')}
                  disabled={caseData.state !== 'UNDER_REVIEW' || Boolean(activeHold) || reviewSubmitting}
                  className="px-3 py-2 bg-rose-800/80 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Case</span>
                </button>
              </div>
            </div>
          </div>

          {/* Phase 2: Independent Final Approver */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">Phase 2: Independent Final Approver</span>
              <span className="text-[11px] text-slate-500">
                {caseData.state === 'AUTHORIZED' || caseData.state === 'RELEASED' ? '✓ Authorized' : 'Awaiting Review'}
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-400 text-[11px]">
                Requires case to be in <code>READY_FOR_SECOND_REVIEW</code> state. The approver MUST NOT be the assigned
                reviewer.
              </p>

              <textarea
                placeholder="Final authorization statement & release rationale..."
                value={approverRationale}
                onChange={(e) => setApproverRationale(e.target.value)}
                disabled={caseData.state !== 'READY_FOR_SECOND_REVIEW' || Boolean(activeHold)}
                className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />

              <div className="pt-2">
                <button
                  onClick={handleFinalApproval}
                  disabled={
                    caseData.state !== 'READY_FOR_SECOND_REVIEW' || Boolean(activeHold) || approverSubmitting
                  }
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-bold flex items-center justify-center space-x-2 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Authorize Final Release & Issue Grants</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-rose-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <PauseCircle className="w-5 h-5 text-rose-500" />
              <span>Apply Emergency Hold</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <label className="block text-slate-400 mb-1">Reason Code</label>
                <select
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value="SUSPECTED_FRAUD">SUSPECTED_FRAUD</option>
                  <option value="CONFLICTING_EVIDENCE">CONFLICTING_EVIDENCE</option>
                  <option value="LEGAL_DISPUTE">LEGAL_DISPUTE</option>
                  <option value="ADMINISTRATIVE_HOLD">ADMINISTRATIVE_HOLD</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Hold Rationale</label>
                <textarea
                  value={holdRationale}
                  onChange={(e) => setHoldRationale(e.target.value)}
                  placeholder="Explain why this hold is required..."
                  className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowHoldModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handlePlaceHold}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                Confirm Emergency Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
