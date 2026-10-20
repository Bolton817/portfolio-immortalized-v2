'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function TrusteeAcceptancePage() {
  const [tokenInput, setTokenInput] = useState('');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreed) return;

    if (!tokenInput || tokenInput.length < 5) {
      setErrorMessage('Please provide a valid invitation token.');
      return;
    }

    // Successful acceptance simulation
    setIsAccepted(true);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
        {/* Header Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            TR
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Trustee Appointment</h1>
            <p className="text-xs text-slate-500">Portfolio Immortalized Custody Network</p>
          </div>
        </div>

        {isAccepted ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Appointment Confirmed</h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              You are now an active trustee. If a status investigation is ever opened, you will be notified to review evidence.
              Remember: You do not have access to browse the owner’s private vault.
            </p>
            <div className="pt-4">
              <Link
                href="/trustee/portal"
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center space-x-2"
              >
                <span>Enter Trustee Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAccept} className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2 text-xs text-emerald-950">
              <div className="flex items-center space-x-2 font-semibold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Scope of Trustee Responsibility</span>
              </div>
              <p className="leading-relaxed text-emerald-800">
                You have been invited to serve as an independent verification trustee for an account holder. 
                In the future, you may be requested to review official status reports or co-sign death evidence.
              </p>
              <p className="font-semibold text-emerald-900">
                Important: Accepting this role does NOT give you access to view or download the owner’s documents, wills, or private media.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invitation Verification Token
              </label>
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your single-use invitation token here"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm font-mono"
              />
            </div>

            <label className="flex items-start space-x-3 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>
                I agree to serve as a trustee, acknowledge the responsibilities, and confirm that I will provide honest verification if requested.
              </span>
            </label>

            <button
              type="submit"
              disabled={!hasAgreed}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Accept Trustee Appointment
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
