'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  FileCheck,
  PauseCircle,
  PlayCircle,
  Users,
  AlertTriangle,
  History,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface SecurityStatusData {
  systemHold: {
    active: boolean;
    reasonCode?: string;
    rationale?: string;
    placedById?: string;
    placedAt?: string;
  };
  totalDeathCases: number;
  activeDeathCases: number;
  activeCaseHolds: number;
  kmsStatus: {
    envelopeStatus: string;
    algorithm: string;
    activeKeysRotatedAt: string;
    complianceStandard: string;
  };
}

export default function AdminDashboardPage() {
  const [statusData, setStatusData] = useState<SecurityStatusData | null>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHoldModal, setShowHoldModal] = useState<boolean>(false);
  const [holdReasonCode, setHoldReasonCode] = useState<string>('SUSPECTED_CREDENTIAL_COMPROMISE');
  const [holdRationale, setHoldRationale] = useState<string>('');
  const [submittingHold, setSubmittingHold] = useState<boolean>(false);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const [secRes, userRes] = await Promise.all([
        fetch('/api/v1/admin/security/status'),
        fetch('/api/v1/admin/users?limit=1'),
      ]);

      if (secRes.ok) {
        const secJson = await secRes.json();
        if (secJson.success) setStatusData(secJson.data);
      }

      if (userRes.ok) {
        const userJson = await userRes.json();
        if (userJson.success) setUserCount(userJson.data.total);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const handleToggleHold = async (active: boolean) => {
    try {
      setSubmittingHold(true);
      const res = await fetch('/api/v1/admin/security/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active,
          reasonCode: holdReasonCode,
          rationale: holdRationale || (active ? 'Emergency freeze triggered from dashboard' : 'Platform hold lifted following review'),
        }),
      });

      if (res.ok) {
        setShowHoldModal(false);
        setHoldRationale('');
        await fetchDashboardMetrics();
      } else {
        const errJson = await res.json();
        alert(`Error: ${errJson.error || 'Failed to toggle hold'}`);
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmittingHold(false);
    }
  };

  const isHoldActive = statusData?.systemHold?.active ?? false;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Principle Reminder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Operational Console</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time platform oversight, death investigation queues, and emergency operations.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardMetrics}
            disabled={loading}
            className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 rounded-xl transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowHoldModal(true)}
            className={`px-4 py-2 text-white rounded-xl text-sm font-semibold transition-colors flex items-center space-x-2 shadow-lg ${
              isHoldActive
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-700 hover:bg-rose-800'
            }`}
          >
            {isHoldActive ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            <span>{isHoldActive ? 'Lift Emergency Hold' : 'Emergency System Hold'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Freeze Alert Banner if Hold is active */}
      {isHoldActive && (
        <div className="bg-rose-950/70 border-2 border-rose-600 rounded-2xl p-5 flex items-start space-x-4 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-rose-200">
              PLATFORM-WIDE EMERGENCY FREEZE ACTIVE
            </h2>
            <p className="text-xs text-rose-300/90 leading-relaxed">
              All automated release grants, disbursements, and scheduled deliveries are temporarily frozen.
              Reason: <span className="font-mono font-semibold">{statusData?.systemHold?.reasonCode}</span> — {statusData?.systemHold?.rationale}
            </p>
          </div>
        </div>
      )}

      {/* Two-Person Rule Banner */}
      <div className="bg-slate-950 border border-purple-900/50 rounded-2xl p-5 flex items-start space-x-4">
        <ShieldAlert className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold text-purple-200">Mandatory Two-Person Release Governance (ADR-007)</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            The platform enforces asymmetric security: An emergency hold takes immediate effect with a single reviewer, 
            whereas releasing assets requires two distinct authorized staff members (<code className="text-purple-300">Case Reviewer != Final Approver</code>).
            AI models have zero authority to grant releases or delete accounts.
          </p>
        </div>
      </div>

      {/* High-Level Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/users" className="block group">
          <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Registered Accounts</span>
              <Users className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-white mt-2">{userCount}</div>
            <div className="text-[11px] text-emerald-400 mt-2 flex items-center space-x-1">
              <span>Managed Directory</span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link href="/admin/cases" className="block group">
          <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Active Investigation Cases</span>
              <FileCheck className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-white mt-2">{statusData?.activeDeathCases ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-1">
              <span>{statusData?.totalDeathCases ?? 0} total lifetime</span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link href="/admin/security" className="block group">
          <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Active Case Holds</span>
              <AlertTriangle className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-white mt-2">{statusData?.activeCaseHolds ?? 0}</div>
            <div className="text-[11px] text-amber-400 mt-2 flex items-center space-x-1">
              <span>{isHoldActive ? 'Platform Frozen' : 'Individual Cases'}</span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </Link>

        <Link href="/admin/audit" className="block group">
          <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>KMS & Cryptography</span>
              <Lock className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-2">
              {statusData?.kmsStatus?.envelopeStatus ?? 'HEALTHY'}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-1">
              <span>AES-256-GCM Envelope</span>
              <History className="w-3 h-3 ml-auto text-slate-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/users"
          className="p-6 bg-slate-950 border border-slate-800 hover:border-purple-600/50 rounded-2xl transition-all block group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-950/60 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">User Lifecycle Directory</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Manage user accounts, execute suspension/restoration workflows, revoke remote sessions, and run deletion impact evaluations under Cap. 160.
          </p>
        </Link>

        <Link
          href="/admin/security"
          className="p-6 bg-slate-950 border border-slate-800 hover:border-rose-600/50 rounded-2xl transition-all block group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-950/60 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Security & Hold Center</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Toggle platform-wide emergency releases freeze, inspect active case holds, and verify cryptographic envelope health.
          </p>
        </Link>

        <Link
          href="/admin/audit"
          className="p-6 bg-slate-950 border border-slate-800 hover:border-cyan-600/50 rounded-2xl transition-all block group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <History className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Append-Only Audit Trail</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Filter tamper-evident audit logs by actor, action, and target. Export cryptographic verification trails in RFC 4180 CSV format.
          </p>
        </Link>
      </div>

      {/* Verification Cases Queue Preview */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Verification Cases Needing Attention</h2>
          <Link href="/admin/cases" className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center space-x-1">
            <span>View Full Queue</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
          <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-slate-400 font-medium">Inactivity & Trustee Report Queue</p>
          <p className="text-xs text-slate-600 mt-1">
            Open cases requiring evidence verification or second-person release approval are managed in the Verification Cases workspace.
          </p>
        </div>
      </div>

      {/* Emergency Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-start space-x-3">
              <div className={`p-2.5 rounded-xl ${isHoldActive ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'}`}>
                {isHoldActive ? <PlayCircle className="w-6 h-6" /> : <PauseCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isHoldActive ? 'Lift Platform Emergency Freeze' : 'Place Platform Emergency Freeze'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isHoldActive
                    ? 'Lifting this hold re-enables release grant processing and outbox workers.'
                    : 'Placing this hold immediately stops all automated release grants and outbound disbursements across the entire platform.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason Code
                </label>
                <select
                  value={holdReasonCode}
                  onChange={(e) => setHoldReasonCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="SUSPECTED_CREDENTIAL_COMPROMISE">SUSPECTED_CREDENTIAL_COMPROMISE</option>
                  <option value="SUSPECTED_ZERO_DAY_EXPLOIT">SUSPECTED_ZERO_DAY_EXPLOIT</option>
                  <option value="CRYPTOGRAPHIC_KEY_ROTATION">CRYPTOGRAPHIC_KEY_ROTATION</option>
                  <option value="HIGH_COURT_LEGAL_INJUNCTION">HIGH_COURT_LEGAL_INJUNCTION</option>
                  <option value="ROUTINE_SECURITY_POSTURE_CHECK">ROUTINE_SECURITY_POSTURE_CHECK</option>
                  <option value="PLATFORM_MAINTENANCE">PLATFORM_MAINTENANCE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mandatory Audit Rationale (min 10 characters)
                </label>
                <textarea
                  value={holdRationale}
                  onChange={(e) => setHoldRationale(e.target.value)}
                  rows={3}
                  placeholder="Detail the operational justification and legal context for this security action..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowHoldModal(false)}
                disabled={submittingHold}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleHold(!isHoldActive)}
                disabled={submittingHold || holdRationale.trim().length < 10}
                className={`px-4 py-2 text-white rounded-xl text-sm font-semibold transition-colors ${
                  isHoldActive
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-700 hover:bg-rose-800'
                } disabled:opacity-50`}
              >
                {submittingHold ? 'Recording Audit...' : isHoldActive ? 'Confirm Lift Hold' : 'Confirm Freeze Platform'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
