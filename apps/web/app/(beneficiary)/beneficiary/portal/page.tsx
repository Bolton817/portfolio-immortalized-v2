'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  FileText,
  Clock,
  ShieldCheck,
  AlertCircle,
  Eye,
  LogIn,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface GrantAsset {
  id: string;
  assetId: string;
  title: string;
  assetType: string;
  fileSizeBytes: number;
  mimeType: string;
}

interface BeneficiaryGrant {
  id: string;
  caseId: string;
  status: string;
  expiresAt: string;
  ownerName: string;
  assets: GrantAsset[];
}

export default function BeneficiaryPortalPage() {
  const [grants, setGrants] = useState<BeneficiaryGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('beneficiary_session_token');
      const name = sessionStorage.getItem('beneficiary_name') || 'Beneficiary';
      setSessionToken(token);
      setBeneficiaryName(name);

      if (token) {
        fetchGrants(token);
      } else {
        setLoading(false);
      }
    }
  }, []);

  async function fetchGrants(token: string) {
    setLoading(true);
    setDownloadError(null);
    try {
      const res = await fetch('/api/v1/beneficiary/grants', {
        headers: {
          'X-Beneficiary-Token': token,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setGrants(json.data.grants || []);
      } else {
        throw new Error(json.message || 'Unable to load authorized release grants.');
      }
    } catch (err: unknown) {
      console.error('Error fetching beneficiary grants:', err);
      setDownloadError(err instanceof Error ? err.message : 'Failed to load grants.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadAsset(grantId: string, assetId: string, assetTitle: string) {
    if (!sessionToken) return;
    setDownloadingId(assetId);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/v1/beneficiary/grants/${grantId}/assets/${assetId}/view`, {
        headers: {
          'X-Beneficiary-Token': sessionToken,
        },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `Download failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${assetTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_watermarked.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function getDaysRemaining(expiresAtIso: string): number {
    const diffMs = new Date(expiresAtIso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Policy and Watermarking Compliance Header */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start space-x-3">
          <ShieldCheck className="w-6 h-6 text-emerald-800 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h1 className="text-base font-bold text-emerald-950">
              Confidential Legacy Delivery Portal {beneficiaryName ? `— Welcome, ${beneficiaryName}` : ''}
            </h1>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Materials shown below have completed dual-role administrative verification and release authorization under
              strict recipient partitioning (<span className="font-semibold">POL-01</span>). In accordance with Open
              Decision <span className="font-semibold">OD-19</span> and Hong Kong Evidence Ordinance (Cap. 160), all
              viewed or downloaded derivatives are stamped with dynamic forensic recipient authentication.
            </p>
          </div>
        </div>
      </div>

      {downloadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Unauthenticated / Verification Prompt */}
      {!sessionToken && !loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-700">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Identity Verification Required</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Please verify your single-use notification action token to view and retrieve your designated legacy assets.
          </p>
          <div>
            <Link
              href="/beneficiary/verify"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-slate-900/10"
            >
              <span>Verify Recipient Identity</span>
            </Link>
          </div>
        </div>
      )}

      {/* Active Grants List */}
      {sessionToken && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Authorized Release Grants ({grants.length})
            </h2>
            <button
              onClick={() => sessionToken && fetchGrants(sessionToken)}
              disabled={loading}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Refresh Grants
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              Retrieving authorized estate materials...
            </div>
          ) : grants.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-600 text-sm">
              No active release grants found for your verified recipient identity.
            </div>
          ) : (
            grants.map((grant) => {
              const daysRemaining = getDaysRemaining(grant.expiresAt);
              const isUrgent = daysRemaining <= 14;

              return (
                <div
                  key={grant.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-semibold">
                          Grant: {grant.id.slice(0, 16)}...
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {grant.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">{grant.ownerName}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isUrgent ? (
                        <div className="flex items-center space-x-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Expires in {daysRemaining} days</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                          <Clock className="w-4 h-4 text-slate-500" />
                          <span>Valid for {daysRemaining} days</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Allocated Assets Table */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Allocated Materials ({grant.assets.length})
                    </p>

                    {grant.assets.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">No assets allocated under this grant.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {grant.assets.map((asset) => (
                          <div
                            key={asset.assetId}
                            className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900">{asset.title}</h4>
                                <p className="text-xs text-slate-500">
                                  {asset.assetType} • {formatBytes(asset.fileSizeBytes)} • {asset.mimeType}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/beneficiary/assets/${asset.assetId}/view?grantId=${grant.id}`}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </Link>

                              <button
                                onClick={() => handleDownloadAsset(grant.id, asset.assetId, asset.title)}
                                disabled={downloadingId === asset.assetId}
                                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{downloadingId === asset.assetId ? 'Watermarking...' : 'Download'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
