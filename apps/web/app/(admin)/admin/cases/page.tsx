'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  FileCheck,
  PauseCircle,
  Clock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface CaseItem {
  id: string;
  ownerId: string;
  state: string;
  initiationType: string;
  stateVersion: number;
  openedAt: string;
  evidence: Array<{ id: string; evidenceType: string; issuingAuthority: string }>;
  trusteeSignatures: Array<{ trusteeId: string; signedAt: string }>;
  holds: Array<{ id: string; active: boolean; reasonCode: string }>;
  requiredTrusteeQuorum: number;
}

export default function AdminCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<string>('ALL');
  const [sweepStatus, setSweepStatus] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);

  useEffect(() => {
    fetchCases();
  }, [filterState]);

  async function fetchCases() {
    setLoading(true);
    try {
      const url = filterState === 'ALL' ? '/api/v1/cases' : `/api/v1/cases?state=${filterState}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCases(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  }

  async function runInactivitySweep() {
    setSweeping(true);
    setSweepStatus('Running inactivity evaluation...');
    try {
      const res = await fetch('/api/v1/inactivity/sweep', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSweepStatus(
          `Sweep Complete: ${data.data.totalEvaluated} accounts evaluated, ${data.data.investigationsOpened} cases opened.`
        );
        fetchCases();
      } else {
        setSweepStatus(`Sweep failed: ${data.error}`);
      }
    } catch {
      setSweepStatus('Sweep trigger failed.');
    } finally {
      setSweeping(false);
    }
  }

  const stateColors: Record<string, string> = {
    REPORTED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    EVIDENCE_PENDING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    UNDER_REVIEW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    READY_FOR_SECOND_REVIEW: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    AUTHORIZED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    RELEASE_IN_PROGRESS: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    RELEASED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    HOLD: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    CLOSED_NO_EVIDENCE: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Verification & Case Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Triaging suspected death investigations, evidence reviews, and independent release authorizations.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={runInactivitySweep}
            disabled={sweeping}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sweeping ? 'animate-spin' : ''}`} />
            <span>{sweeping ? 'Sweeping...' : 'Run Inactivity Sweep'}</span>
          </button>
        </div>
      </div>

      {sweepStatus && (
        <div className="bg-slate-900 border border-slate-800 text-xs text-slate-300 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{sweepStatus}</span>
          <button onClick={() => setSweepStatus(null)} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Two-Person Rule Notice */}
      <div className="bg-slate-950 border border-purple-900/40 rounded-2xl p-4 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-purple-300">Two-Person Release Gate Active:</span> The Case Reviewer who
          recommends approval cannot be the Final Approver granting release. An emergency hold can be placed instantly by any
          security staff member.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-800 text-xs font-medium">
        {['ALL', 'REPORTED', 'UNDER_REVIEW', 'READY_FOR_SECOND_REVIEW', 'AUTHORIZED', 'HOLD', 'RELEASED'].map(
          (st) => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterState === st
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          )
        )}
      </div>

      {/* Case List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading verification cases...</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <FileCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No cases match the selected filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Suspected death investigations appear here when reported by trustees or triggered by inactivity grace periods.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => {
            const hasActiveHold = c.holds?.some((h) => h.active);
            const quorumMet = (c.trusteeSignatures?.length || 0) >= (c.requiredTrusteeQuorum || 2);

            return (
              <div
                key={c.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        stateColors[c.state] || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {c.state.replace(/_/g, ' ')}
                    </span>
                    {hasActiveHold && (
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-[10px] font-bold flex items-center space-x-1">
                        <PauseCircle className="w-3 h-3" />
                        <span>EMERGENCY HOLD</span>
                      </span>
                    )}
                    <span className="text-xs text-slate-500">Case ID: {c.id.slice(0, 8)}...</span>
                  </div>

                  <div className="text-sm font-medium text-white">Owner Account: {c.ownerId}</div>

                  <div className="flex items-center space-x-4 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Opened {new Date(c.openedAt).toLocaleDateString()}</span>
                    </span>
                    <span>•</span>
                    <span>Evidence Items: {c.evidence?.length || 0}</span>
                    <span>•</span>
                    <span className={quorumMet ? 'text-emerald-400' : 'text-amber-400'}>
                      Trustee Quorum: {c.trusteeSignatures?.length || 0} / {c.requiredTrusteeQuorum}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Link
                    href={`/admin/cases/${c.id}`}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <span>Inspect Dossier</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
