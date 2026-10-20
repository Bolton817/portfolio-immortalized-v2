'use client';

import { useState, useEffect } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface AuditEventItem {
  id: string;
  occurredAt: string;
  actorType: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED' | 'PENDING';
  reasonCode?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [actionQuery, setActionQuery] = useState<string>('');
  const [actorType, setActorType] = useState<string>('');
  const [outcome, setOutcome] = useState<string>('');
  const [targetType, setTargetType] = useState<string>('');

  // Selected event for detail inspection
  const [selectedEvent, setSelectedEvent] = useState<AuditEventItem | null>(null);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);

  const fetchAuditEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (actionQuery) params.set('action', actionQuery);
      if (actorType) params.set('actorType', actorType);
      if (outcome) params.set('outcome', outcome);
      if (targetType) params.set('targetType', targetType);
      params.set('limit', '50');

      const res = await fetch(`/api/v1/admin/audit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setEvents(json.data.events);
          setTotal(json.data.total);
        }
      }
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [actorType, outcome, targetType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditEvents();
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const params = new URLSearchParams();
      if (actionQuery) params.set('action', actionQuery);
      if (actorType) params.set('actorType', actorType);
      if (outcome) params.set('outcome', outcome);

      const res = await fetch(`/api/v1/admin/audit/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to generate CSV export.');
      }
    } catch (err) {
      alert(`Export error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-950/60 text-cyan-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Append-Only Audit Trail</h1>
            <p className="text-sm text-slate-400">
              Cryptographically timestamped, tamper-evident record of all platform interactions ({total} events logged, ADR-010).
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            onClick={fetchAuditEvents}
            disabled={loading}
            className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 rounded-xl transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center space-x-2 shadow-lg disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exportingCsv ? 'Exporting...' : 'Export CSV (RFC 4180)'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search action or keywords..."
            value={actionQuery}
            onChange={(e) => setActionQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={actorType}
              onChange={(e) => setActorType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Actors</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="TRUSTEE">TRUSTEE</option>
              <option value="BENEFICIARY">BENEFICIARY</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="DENIED">DENIED</option>
            <option value="FAILED">FAILED</option>
            <option value="PENDING">PENDING</option>
          </select>

          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Target Types</option>
            <option value="DeathCase">DeathCase</option>
            <option value="Asset">Asset</option>
            <option value="User">User</option>
            <option value="System">System</option>
            <option value="KeyManagement">KeyManagement</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Occurred At</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Outcome</th>
                <th className="px-6 py-4">Trace ID</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No matching audit entries found.
                  </td>
                </tr>
              ) : (
                events.map((e) => {
                  const isSuccess = e.outcome === 'SUCCESS';
                  const isDenied = e.outcome === 'DENIED';

                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedEvent(e)}
                      className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(e.occurredAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {e.actorType}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            {e.actorId ? e.actorId.slice(0, 14) : 'SYSTEM'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-cyan-300 font-semibold">{e.action}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs">
                          <span className="text-slate-400">{e.targetType}: </span>
                          <span className="font-mono text-slate-200">{e.targetId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isSuccess
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                              : isDenied
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{e.outcome}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                        {e.requestId.slice(0, 16)}...
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-600 inline-block" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">{selectedEvent.action}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{selectedEvent.id}</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  selectedEvent.outcome === 'SUCCESS'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {selectedEvent.outcome}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Occurred At</span>
                  <span className="text-slate-200 font-mono">
                    {new Date(selectedEvent.occurredAt).toISOString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Request / Trace ID</span>
                  <span className="text-slate-200 font-mono">{selectedEvent.requestId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Actor</span>
                  <span className="text-slate-200 font-mono">
                    {selectedEvent.actorType} ({selectedEvent.actorId || 'N/A'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Target</span>
                  <span className="text-slate-200 font-mono">
                    {selectedEvent.targetType}:{selectedEvent.targetId}
                  </span>
                </div>
              </div>

              {selectedEvent.reasonCode && (
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-500 block mb-1">Reason Code</span>
                  <span className="text-purple-300 font-mono font-semibold">
                    {selectedEvent.reasonCode}
                  </span>
                </div>
              )}

              {selectedEvent.metadata && (
                <div>
                  <span className="text-slate-500 block mb-1">Sanitized Metadata (Secrets Redacted)</span>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-sm"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
