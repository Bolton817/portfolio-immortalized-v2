'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  UserX,
  UserCheck,
  KeyRound,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { UserAccountStatus } from '@portfolio-immortalized/domain';

interface MaskedUserSummary {
  id: string;
  email: string;
  maskedEmail: string;
  displayName: string;
  emailVerified: boolean;
  status: UserAccountStatus;
  roles: string[];
  activeSessionsCount: number;
  lastMeaningfulActivityAt: string;
  createdAt: string;
}

interface DeletionDryRunReport {
  userId: string;
  userEmail: string;
  canPurge: boolean;
  blockingReason?: string;
  activeHoldsCount: number;
  activeCasesCount: number;
  blockingDetails: Array<{ type: 'CASE' | 'HOLD'; id: string; description: string }>;
  impactSummary: {
    vaultAssetsCount: number;
    trusteeRelationshipsCount: number;
    beneficiaryRelationshipsCount: number;
    legacyPlansCount: number;
  };
  evaluatedAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<MaskedUserSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals state
  const [selectedUser, setSelectedUser] = useState<MaskedUserSummary | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [statusAction, setStatusAction] = useState<'ACTIVE' | 'SUSPENDED'>('SUSPENDED');
  const [statusReason, setStatusReason] = useState<string>('');
  const [submittingStatus, setSubmittingStatus] = useState<boolean>(false);

  const [showSessionModal, setShowSessionModal] = useState<boolean>(false);
  const [sessionReason, setSessionReason] = useState<string>('Compromised token reported');
  const [submittingSession, setSubmittingSession] = useState<boolean>(false);

  const [showDeletionModal, setShowDeletionModal] = useState<boolean>(false);
  const [deletionReport, setDeletionReport] = useState<DeletionDryRunReport | null>(null);
  const [loadingDryRun, setLoadingDryRun] = useState<boolean>(false);
  const [executingDeletion, setExecutingDeletion] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setUsers(json.data.users);
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser) return;
    try {
      setSubmittingStatus(true);
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusAction,
          reason: statusReason || (statusAction === 'SUSPENDED' ? 'Administrative security suspension' : 'Identity verified and restored'),
        }),
      });

      if (res.ok) {
        setShowStatusModal(false);
        setStatusReason('');
        await fetchUsers();
      } else {
        const errJson = await res.json();
        alert(`Error: ${errJson.message || errJson.error}`);
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!selectedUser) return;
    try {
      setSubmittingSession(true);
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}/revoke-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: sessionReason }),
      });

      if (res.ok) {
        const json = await res.json();
        alert(`Successfully revoked ${json.data.revokedCount} active session(s).`);
        setShowSessionModal(false);
        await fetchUsers();
      } else {
        const errJson = await res.json();
        alert(`Error: ${errJson.message || errJson.error}`);
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSubmittingSession(false);
    }
  };

  const handleOpenDeletionModal = async (u: MaskedUserSummary) => {
    setSelectedUser(u);
    setShowDeletionModal(true);
    setDeletionReport(null);
    setLoadingDryRun(true);

    try {
      const res = await fetch(`/api/v1/admin/users/${u.id}/deletion-dryrun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reasonCode: 'ADMIN_COMPLIANCE_EVALUATION' }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDeletionReport(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to run deletion dry-run:', err);
    } finally {
      setLoadingDryRun(false);
    }
  };

  const handleConfirmPurge = async () => {
    if (!selectedUser) return;
    try {
      setExecutingDeletion(true);
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}/deletion-dryrun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execute: true,
          reasonCode: 'USER_RIGHT_TO_ERASURE_APPROVED',
        }),
      });

      if (res.ok) {
        alert('Account deletion request queued. User transitioned to PURGE_PENDING.');
        setShowDeletionModal(false);
        await fetchUsers();
      } else {
        const errJson = await res.json();
        alert(`Failed: ${errJson.message || errJson.error}`);
      }
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setExecutingDeletion(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-950/60 text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">User Account Directory</h1>
              <p className="text-sm text-slate-400">
                Audited custodian view with PII masking, lifecycle controls, and legal hold barrier.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Surveillance Prevention Notice (Risk R-16) */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300">Surveillance Prevention Standard (Risk R-16): </span>
          Full plain-text passwords and cryptographic private keys are never stored or exposed.
          Emails are masked by default to uphold user privacy under the Kenya Data Protection Act 2019.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by ID, masked email, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 placeholder-slate-500"
          />
        </form>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Account Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="PURGE_PENDING">PURGE_PENDING</option>
            <option value="PURGED">PURGED</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Masked Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4">Sessions</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    <span>Loading directory...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No matching user accounts found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isActive = u.status === UserAccountStatus.ACTIVE;
                  const isSuspended = u.status === UserAccountStatus.SUSPENDED;
                  const isPurgePending = u.status === UserAccountStatus.PURGE_PENDING;

                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{u.displayName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{u.id}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {u.maskedEmail}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isActive
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                              : isSuspended
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                              : isPurgePending
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <span
                                key={r}
                                className="px-2 py-0.5 bg-purple-950/60 border border-purple-800/50 text-purple-300 rounded text-[10px] font-mono"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">End-User / Owner</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-mono text-xs ${
                            u.activeSessionsCount > 0 ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {u.activeSessionsCount} active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(u.lastMeaningfulActivityAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Suspend / Restore Toggle */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setStatusAction(isActive ? 'SUSPENDED' : 'ACTIVE');
                              setShowStatusModal(true);
                            }}
                            className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
                              isActive
                                ? 'border-rose-900/60 hover:bg-rose-950/50 text-rose-400'
                                : 'border-emerald-900/60 hover:bg-emerald-950/50 text-emerald-400'
                            }`}
                            title={isActive ? 'Suspend User Account' : 'Restore User Account'}
                          >
                            {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>

                          {/* Revoke Sessions */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowSessionModal(true);
                            }}
                            disabled={u.activeSessionsCount === 0}
                            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                            title="Revoke Remote Sessions"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Deletion Impact Evaluation */}
                          <button
                            onClick={() => handleOpenDeletionModal(u)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Evaluate Deletion & Legal Holds"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Modal (Suspend / Restore) */}
      {showStatusModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center space-x-3">
              <div
                className={`p-2.5 rounded-xl ${
                  statusAction === 'SUSPENDED' ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'
                }`}
              >
                {statusAction === 'SUSPENDED' ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {statusAction === 'SUSPENDED' ? 'Suspend Account' : 'Restore Account'}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedUser.maskedEmail}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {statusAction === 'SUSPENDED'
                ? 'Suspending this account immediately terminates all active web and mobile sessions, freezing authentication across all devices.'
                : 'Restoring this account allows the owner to log in and resume managing their secure legacy assets.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Audit Reason (min 5 characters)
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={3}
                placeholder="Reason for changing account operational status..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowStatusModal(false)}
                disabled={submittingStatus}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={submittingStatus || statusReason.trim().length < 5}
                className={`px-4 py-2 text-white rounded-xl text-sm font-semibold ${
                  statusAction === 'SUSPENDED'
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                } disabled:opacity-50`}
              >
                {submittingStatus ? 'Saving...' : `Confirm ${statusAction}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Revocation Modal */}
      {showSessionModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-purple-950 text-purple-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remote Session Invalidation</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedUser.maskedEmail}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This will revoke all <span className="text-white font-semibold">{selectedUser.activeSessionsCount}</span> active session tokens, requiring the user to re-authenticate with step-up verification.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Revocation Reason (min 5 characters)
              </label>
              <textarea
                value={sessionReason}
                onChange={(e) => setSessionReason(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowSessionModal(false)}
                disabled={submittingSession}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeSessions}
                disabled={submittingSession || sessionReason.trim().length < 5}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {submittingSession ? 'Revoking...' : 'Revoke All Sessions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Dry-Run & Legal Hold Barrier Modal */}
      {showDeletionModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-slate-300">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Account Deletion & Legal Hold Evaluation
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Target: {selectedUser.displayName} ({selectedUser.maskedEmail})
                </p>
              </div>
            </div>

            {loadingDryRun ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                <span>Evaluating legal holds & succession disputes...</span>
              </div>
            ) : deletionReport ? (
              <div className="space-y-4">
                {/* Legal Hold Barrier Banner */}
                {!deletionReport.canPurge ? (
                  <div className="bg-rose-950/70 border border-rose-800 rounded-xl p-4 flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-rose-200 uppercase tracking-wide">
                        Statutory Preservation Barrier: {deletionReport.blockingReason}
                      </div>
                      <p className="text-xs text-rose-300/90 leading-relaxed">
                        Data erasure is strictly forbidden while an active legal hold or succession verification case is in progress under the Law of Succession Act (Cap. 160) and Kenya Data Protection Act 2019 (Requirement ADM-002, Risk R-11).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-950/50 border border-emerald-800 rounded-xl p-4 flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                        Eligible for Account Closure
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        No active legal holds or investigation cases exist for this account.
                      </p>
                    </div>
                  </div>
                )}

                {/* Blocking Details if any */}
                {deletionReport.blockingDetails.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Active Restraining Matters ({deletionReport.blockingDetails.length})
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {deletionReport.blockingDetails.map((b, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start space-x-2 text-xs"
                        >
                          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-mono text-slate-300 font-semibold">{b.id}</span>
                            <span className="text-slate-400 ml-2">{b.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Impact Summary */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-400 mb-2">Estimated Deletion Scope</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-slate-400">Vault Assets to Purge:</div>
                    <div className="font-mono font-medium text-white">{deletionReport.impactSummary.vaultAssetsCount} files</div>
                    <div className="text-slate-400">Trustee Relationships:</div>
                    <div className="font-mono font-medium text-white">{deletionReport.impactSummary.trusteeRelationshipsCount} severed</div>
                    <div className="text-slate-400">Beneficiary Allocations:</div>
                    <div className="font-mono font-medium text-white">{deletionReport.impactSummary.beneficiaryRelationshipsCount} unlinked</div>
                    <div className="text-slate-400">Published Legacy Plans:</div>
                    <div className="font-mono font-medium text-white">{deletionReport.impactSummary.legacyPlansCount} archived</div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowDeletionModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-sm"
              >
                Close
              </button>
              {deletionReport?.canPurge && (
                <button
                  onClick={handleConfirmPurge}
                  disabled={executingDeletion}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {executingDeletion ? 'Queueing Purge...' : 'Queue Account Deletion'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
