'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Upload,
  UserCheck,
  ShieldCheck,
  Plus,
} from 'lucide-react';

interface TrusteeCase {
  id: string;
  ownerId: string;
  state: string;
  openedAt: string;
  evidence: Array<{ id: string; evidenceType: string; issuingAuthority: string }>;
  trusteeSignatures: Array<{ trusteeId: string; signedAt: string }>;
}

export default function TrusteePortalPage() {
  const [cases, setCases] = useState<TrusteeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Report death form
  const [statement, setStatement] = useState('');
  const [evidenceType, setEvidenceType] = useState('BURIAL_PERMIT');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [issuingCountry, setIssuingCountry] = useState('KE');
  const [issueDate, setIssueDate] = useState('2026-03-20');
  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Co-sign form
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [coSignRationale, setCoSignRationale] = useState('');
  const [coSigning, setCoSigning] = useState(false);

  useEffect(() => {
    fetchTrusteeCases();
  }, []);

  async function fetchTrusteeCases() {
    try {
      const res = await fetch('/api/v1/cases');
      const json = await res.json();
      if (json.success) {
        setCases(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load trustee cases:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReportDeath(e: React.FormEvent) {
    e.preventDefault();
    if (!certified) {
      setError('You must certify that the report and documentation are genuine.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      // 1. Initiate case
      const res1 = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: '00000000-0000-0000-0000-000000000001',
          informantStatement: statement || 'Formal notification of owner passing.',
          relationshipType: 'PRIMARY_TRUSTEE',
        }),
      });
      const data1 = await res1.json();
      if (!data1.success) throw new Error(data1.message || data1.error);

      const caseId = data1.data.id;

      // 2. Submit evidence
      const res2 = await fetch(`/api/v1/cases/${caseId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: '00000000-0000-0000-0000-000000000088',
          evidenceType,
          issuingAuthority: issuingAuthority || 'Civil Registration Department',
          issuingCountry,
          issueDate,
          submitterDeclarationAccepted: true,
          notes: statement,
        }),
      });
      const data2 = await res2.json();
      if (!data2.success) throw new Error(data2.message || data2.error);

      // 3. Auto co-sign
      await fetch(`/api/v1/cases/${caseId}/co-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attestationConfirmed: true,
          rationale: 'I submitted the verified evidence and attest to the report.',
        }),
      });

      setMessage('Death report and evidence submitted successfully. Administrators will review the submission.');
      setShowReportModal(false);
      fetchTrusteeCases();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCoSignCase(caseId: string) {
    setCoSigning(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/co-sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'usr_trustee_demo_2',
        },
        body: JSON.stringify({
          attestationConfirmed: true,
          rationale: coSignRationale || 'I independently verified and co-sign this case.',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage('Trustee co-signature attested successfully!');
        setSelectedCaseId(null);
        fetchTrusteeCases();
      } else {
        setError(json.message || json.error);
      }
    } catch {
      setError('Failed to co-sign case.');
    } finally {
      setCoSigning(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Scope Disclaimer */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <ShieldCheck className="w-6 h-6 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-base font-bold text-emerald-950 mb-1">Your Trustee Responsibilities & Zero Vault Access</h1>
            <p className="text-xs text-emerald-800 leading-relaxed">
              As an appointed trustee, you assist in attesting status reports and submitting official documentation when needed.
              Under strict security invariant <span className="font-semibold">REL-04</span>, trustees do not possess access
              to browse, download, or inspect the owner’s private vault or legal documents.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Active Trustee Inquiries</h2>
          <p className="text-xs text-slate-500">Cases requiring your attestation or evidence submission.</p>
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Report Passing & Submit Evidence</span>
        </button>
      </div>

      {/* Cases Needing Trustee Attention */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No pending trustee actions</div>
            <p className="text-xs text-slate-500">
              When an investigation is opened for an account you protect, you will be notified here to co-sign.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((c) => (
              <div
                key={c.id}
                className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">Case ID: {c.id.slice(0, 8)}...</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full font-semibold text-[10px]">
                      {c.state.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-slate-600">Owner Account: {c.ownerId}</div>
                  <div className="flex items-center space-x-3 text-slate-500 text-[11px]">
                    <span>Evidence Attached: {c.evidence?.length || 0}</span>
                    <span>•</span>
                    <span>Signatures: {c.trusteeSignatures?.length || 0} / 2</span>
                  </div>
                </div>

                <div>
                  {selectedCaseId === c.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Attestation statement..."
                        value={coSignRationale}
                        onChange={(e) => setCoSignRationale(e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg p-2 w-64 block"
                      />
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCoSignCase(c.id)}
                          disabled={coSigning}
                          className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Confirm Co-Sign
                        </button>
                        <button
                          onClick={() => setSelectedCaseId(null)}
                          className="px-2 py-1.5 text-xs text-slate-600 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedCaseId(c.id)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Co-Sign / Attest</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Death Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Upload className="w-5 h-5 text-emerald-700" />
              <span>Report Passing & Submit Official Evidence</span>
            </h3>

            <form onSubmit={handleReportDeath} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Evidence Document Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                >
                  <option value="BURIAL_PERMIT">Burial Permit</option>
                  <option value="DEATH_CERTIFICATE">Death Certificate</option>
                  <option value="MEDICAL_EXAMINER_REPORT">Medical Examiner Report</option>
                  <option value="COURT_ORDER">Court Order / Letters of Administration</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Issuing Authority</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Civil Registration Department / Nairobi City County"
                  value={issuingAuthority}
                  onChange={(e) => setIssuingAuthority(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Issuing Country (ISO-2)</label>
                  <input
                    type="text"
                    required
                    value={issuingCountry}
                    onChange={(e) => setIssuingCountry(e.target.value.toUpperCase())}
                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Date of Issue</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Trustee Statement / Notes</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide context regarding the reported passing..."
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={certified}
                    onChange={(e) => setCertified(e.target.checked)}
                    className="rounded text-emerald-700 mt-0.5"
                  />
                  <span>
                    I solemnly certify that the information and documents provided are authentic, unmodified, and submitted in good faith under penalty of law.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !certified}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg font-semibold"
                >
                  {submitting ? 'Submitting...' : 'Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
