'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  KeyRound,
  RefreshCw,
  FolderLock,
} from 'lucide-react';

interface SecurityStatusData {
  systemHold: {
    active: boolean;
    reasonCode?: string;
    rationale?: string;
    placedById?: string;
    placedAt?: string;
    liftedById?: string;
    liftedRationale?: string;
    liftedAt?: string;
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

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Hold Modal
  const [showHoldModal, setShowHoldModal] = useState<boolean>(false);
  const [holdReasonCode, setHoldReasonCode] = useState<string>('SUSPECTED_ZERO_DAY_EXPLOIT');
  const [holdRationale, setHoldRationale] = useState<string>('');
  const [submittingHold, setSubmittingHold] = useState<boolean>(false);

  const fetchSecurityStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/security/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load security status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
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
          rationale: holdRationale,
        }),
      });

      if (res.ok) {
        setShowHoldModal(false);
        setHoldRationale('');
        await fetchSecurityStatus();
      } else {
        const errJson = await res.json();
        alert(`Error: ${errJson.error || 'Failed to toggle hold'}`);
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSubmittingHold(false);
    }
  };

  const isHoldActive = data?.systemHold?.active ?? false;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Security & Incident Center</h1>
            <p className="text-sm text-slate-400">
              Platform emergency controls, cryptographic key health, and active succession legal holds.
            </p>
          </div>
        </div>
        <button
          onClick={fetchSecurityStatus}
          disabled={loading}
          className="px-4 py-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Emergency Platform Hold Card */}
      <div
        className={`border-2 rounded-2xl p-6 transition-all ${
          isHoldActive
            ? 'bg-rose-950/40 border-rose-600'
            : 'bg-slate-950 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isHoldActive
                    ? 'bg-rose-900 text-rose-200 border border-rose-500 animate-pulse'
                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                }`}
              >
                {isHoldActive ? 'EMERGENCY PLATFORM FREEZE ACTIVE' : 'DISBURSEMENTS OPERATIONAL'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {isHoldActive ? 'All Release Grants Temporarily Frozen' : 'System-Wide Emergency Hold'}
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              In accordance with <span className="text-slate-200 font-semibold">ADR-006 (Asymmetric Emergency Freeze)</span>,
              any authorized security administrator can unilaterally freeze all asset releases and outbox deliveries
              with a single command if suspicious activity or credential leakage is detected.
            </p>
          </div>

          <button
            onClick={() => setShowHoldModal(true)}
            className={`px-5 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-colors flex items-center space-x-2 self-start sm:self-auto flex-shrink-0 ${
              isHoldActive
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-rose-700 hover:bg-rose-800'
            }`}
          >
            {isHoldActive ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
            <span>{isHoldActive ? 'Lift Platform Freeze' : 'Activate Platform Freeze'}</span>
          </button>
        </div>

        {isHoldActive && data?.systemHold && (
          <div className="mt-6 pt-6 border-t border-rose-900/40 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <span className="text-rose-400 font-medium block">Reason Code:</span>
              <span className="text-white">{data.systemHold.reasonCode}</span>
            </div>
            <div>
              <span className="text-rose-400 font-medium block">Enacted By:</span>
              <span className="text-white">{data.systemHold.placedById}</span>
            </div>
            <div>
              <span className="text-rose-400 font-medium block">Timestamp:</span>
              <span className="text-white">
                {data.systemHold.placedAt ? new Date(data.systemHold.placedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className="md:col-span-3">
              <span className="text-rose-400 font-medium block">Documented Rationale:</span>
              <span className="text-rose-200 font-sans">{data.systemHold.rationale}</span>
            </div>
          </div>
        )}
      </div>

      {/* Security Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cryptographic Key Health */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Envelope Cryptography Health</h3>
              <p className="text-xs text-slate-400 font-mono">ADR-003 / FIPS 140-3 Key Vault</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Envelope Status</span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{data?.kmsStatus.envelopeStatus ?? 'HEALTHY'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Authenticated Cipher</span>
              <span className="font-mono text-slate-200">{data?.kmsStatus.algorithm ?? 'AES-256-GCM'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Compliance Standard</span>
              <span className="font-mono text-purple-300">{data?.kmsStatus.complianceStandard ?? 'FIPS-140-3'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">Master Key Rotation</span>
              <span className="text-slate-300">
                {data?.kmsStatus.activeKeysRotatedAt
                  ? new Date(data.kmsStatus.activeKeysRotatedAt).toLocaleDateString()
                  : 'Current'}
              </span>
            </div>
          </div>
        </div>

        {/* Legal Holds Overview */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Active Restraining Matters</h3>
              <p className="text-xs text-slate-400">Cap. 160 & Court Disputed Estates</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Total Investigation Cases</div>
              <div className="text-2xl font-bold text-white mt-1">{data?.totalDeathCases ?? 0}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Active Case Holds</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{data?.activeCaseHolds ?? 0}</div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed pt-2">
            Accounts under active case holds or open succession investigations cannot be purged from the platform.
            All legal holds require dual-role consensus and court clearance before releases or account erasures can proceed.
          </p>
        </div>
      </div>

      {/* Emergency Hold Toggle Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-start space-x-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isHoldActive ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'
                }`}
              >
                {isHoldActive ? <PlayCircle className="w-6 h-6" /> : <PauseCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isHoldActive ? 'Lift Platform-Wide Freeze' : 'Activate Emergency Platform Freeze'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isHoldActive
                    ? 'Resumes automated release execution across all authorized death cases.'
                    : 'Immediately pauses all background release workers, grant generation, and outbox emails.'}
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
                  <option value="SUSPECTED_ZERO_DAY_EXPLOIT">SUSPECTED_ZERO_DAY_EXPLOIT</option>
                  <option value="SUSPECTED_CREDENTIAL_COMPROMISE">SUSPECTED_CREDENTIAL_COMPROMISE</option>
                  <option value="CRYPTOGRAPHIC_KEY_ROTATION">CRYPTOGRAPHIC_KEY_ROTATION</option>
                  <option value="HIGH_COURT_LEGAL_INJUNCTION">HIGH_COURT_LEGAL_INJUNCTION</option>
                  <option value="SECURITY_INCIDENT_INVESTIGATION">SECURITY_INCIDENT_INVESTIGATION</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mandatory Operational Rationale (min 10 characters)
                </label>
                <textarea
                  value={holdRationale}
                  onChange={(e) => setHoldRationale(e.target.value)}
                  rows={3}
                  placeholder="Provide detailed incident findings and cryptographic justification..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowHoldModal(false)}
                disabled={submittingHold}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleHold(!isHoldActive)}
                disabled={submittingHold || holdRationale.trim().length < 10}
                className={`px-4 py-2 text-white rounded-xl text-sm font-semibold ${
                  isHoldActive
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-700 hover:bg-rose-800'
                } disabled:opacity-50`}
              >
                {submittingHold ? 'Recording Audit...' : isHoldActive ? 'Confirm Lift Freeze' : 'Confirm Freeze Platform'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
