'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Info,
} from 'lucide-react';

export default function TrusteeConflictReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading conflict report form...</div>}>
      <TrusteeConflictReportContent />
    </Suspense>
  );
}

function TrusteeConflictReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCaseId = searchParams.get('caseId') || '';

  const [caseId, setCaseId] = useState(initialCaseId);
  const [conflictType, setConflictType] = useState<
    'FRAUD_SUSPECTED' | 'DISPUTED_ESTATE' | 'INCORRECT_OWNER_INFO' | 'DECLINED_TRUSTEE'
  >('FRAUD_SUSPECTED');
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedHold, setSubmittedHold] = useState<{
    caseId: string;
    holdId: string;
    state: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/trustee/conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseId.trim(),
          conflictType,
          narrative: narrative.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Failed to submit conflict report');
      }

      setSubmittedHold(json.data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error submitting dispute');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <Link
        href="/trustee/portal"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Trustee Dashboard</span>
      </Link>

      {/* Critical Safety Freeze Notice (CASE-03, OD-18) */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-start space-x-3">
          <ShieldAlert className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h1 className="text-base font-bold text-amber-950">
              Immediate Case Freeze Protocol (OD-18 & CASE-03)
            </h1>
            <p className="text-xs text-amber-900 leading-relaxed">
              Filing this report invokes an <strong>immediate, asymmetric emergency freeze</strong> on the estate case.
              All pending asset releases, beneficiary grant notifications, and administrative approvals will be halted
              instantly into <span className="font-semibold text-red-700">HOLD</span> status. Unfreezing requires formal
              legal review and second-person administrative consensus.
            </p>
          </div>
        </div>
      </div>

      {submittedHold ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-5">
          <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Emergency Hold Placed Successfully</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Case <span className="font-mono font-semibold text-slate-800">{submittedHold.caseId}</span> is now frozen
              in <span className="font-semibold text-red-600 font-mono">HOLD</span> state under reference{' '}
              <span className="font-mono text-xs">{submittedHold.holdId}</span>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-left text-slate-600 space-y-1.5">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Next Operational Actions:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Security operations and platform legal reviewers have been notified.</li>
              <li>No beneficiary delivery or grant redemptions will proceed while hold is active.</li>
              <li>A case investigator may contact you regarding supporting documentation.</li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={() => router.push('/trustee/portal')}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all"
            >
              Back to Trustee Portal
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Estate Case ID
              </label>
              <input
                type="text"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                required
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Reason / Conflict Category
              </label>
              <select
                value={conflictType}
                onChange={(e) => setConflictType(e.target.value as typeof conflictType)}
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              >
                <option value="FRAUD_SUSPECTED">Suspected Fraudulent Documentation / Coercion</option>
                <option value="DISPUTED_ESTATE">Family Dispute / Conflicting Estate Information</option>
                <option value="INCORRECT_OWNER_INFO">Incorrect Owner Vital Information or Mistaken Identity</option>
                <option value="DECLINED_TRUSTEE">Trustee Conflict of Interest / Resignation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Factual Narrative & Details
              </label>
              <textarea
                rows={5}
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="Describe why this case must be held. Minimum 20 characters required. Include any relevant evidence or concerns."
                required
                minLength={20}
                maxLength={3000}
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white leading-relaxed"
              />
              <p className="text-xs text-slate-500 mt-1 text-right">
                {narrative.length} / 3000 characters (minimum 20)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !caseId || narrative.trim().length < 20}
              className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md shadow-red-600/20 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Freezing Case...</span>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Submit Dispute & Halt Estate Release</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
