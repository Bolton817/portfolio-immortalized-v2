'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

export default function BeneficiaryVerifyPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [nationalIdLast4, setNationalIdLast4] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/beneficiary/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          email: email.trim().toLowerCase(),
          nationalIdLast4: nationalIdLast4.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Verification failed. Please check your credentials.');
      }

      // Store beneficiary session token in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('beneficiary_session_token', json.data.sessionGrantToken);
        sessionStorage.setItem('beneficiary_name', json.data.beneficiary.name);
        sessionStorage.setItem('beneficiary_email', json.data.beneficiary.email);
      }

      router.push('/beneficiary/portal');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Header Shield Card */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-emerald-400 mb-2 shadow-lg shadow-emerald-500/10">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Beneficiary Identity Verification</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Authorized legacy materials are accessible only following cryptographic credential challenge and multi-party estate verification.
          </p>
        </div>

        {/* Verification Form */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/5 p-8">
          <form onSubmit={handleVerify} className="space-y-5">
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Release Action Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the single-use token from your notification email"
                required
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Sent to you via secure notification upon formal estate authorization.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Beneficiary Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                National ID / Passport Last 4 Digits <span className="text-slate-600 normal-case font-normal">(Optional step-up)</span>
              </label>
              <input
                type="text"
                maxLength={4}
                value={nationalIdLast4}
                onChange={(e) => setNationalIdLast4(e.target.value.toUpperCase())}
                placeholder="e.g. 123A"
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white tracking-widest font-mono text-center"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token || !email}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium text-sm rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md shadow-slate-900/10 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Access Authorized Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Legal & Security Compliance Footer */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
          <div className="flex items-center space-x-2 font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Forensic Delivery Compliance (Cap. 160 & OD-19)</span>
          </div>
          <p className="leading-relaxed">
            All released materials are dynamically watermarked with your verified identity, timestamp, and grant ID.
            Original custody ciphertext stored at rest remains immutable and untampered.
          </p>
        </div>
      </div>
    </div>
  );
}
