'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowLeft,
  Download,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function BeneficiaryAssetViewPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading watermarked document viewer...</div>}>
      <BeneficiaryAssetViewContent params={params} />
    </Suspense>
  );
}

function BeneficiaryAssetViewContent({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grantId = searchParams.get('grantId');
  const assetId = params.id;

  const [textContent, setTextContent] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('application/octet-stream');
  const [forensicHash, setForensicHash] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('beneficiary_session_token');
      const email = sessionStorage.getItem('beneficiary_email') || 'authorized-recipient@example.com';
      setRecipientEmail(email);

      if (!token || !grantId) {
        router.push('/beneficiary/verify');
        return;
      }

      fetchWatermarkedAsset(token, grantId, assetId);
    }
  }, [grantId, assetId, router]);

  async function fetchWatermarkedAsset(token: string, gId: string, aId: string) {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/beneficiary/grants/${gId}/assets/${aId}/view`, {
        headers: {
          'X-Beneficiary-Token': token,
        },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `Failed to fetch asset with status ${res.status}`);
      }

      const hash = res.headers.get('X-Forensic-Trace-Hash') || 'unverified_hash';
      const cType = res.headers.get('Content-Type') || 'application/octet-stream';
      setForensicHash(hash);
      setMimeType(cType);

      const text = await res.text();
      setTextContent(text);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error loading asset');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!textContent) return;
    const blob = new Blob([textContent], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watermarked_asset_${assetId.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/beneficiary/portal"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Authorized Grants</span>
        </Link>

        {textContent && (
          <button
            onClick={handleDownload}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Derivative</span>
          </button>
        )}
      </div>

      {/* Forensic Watermark Badge (OD-19 Compliance) */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-sm font-bold tracking-tight">Cap. 160 Authenticated Forensic Derivative</h1>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Watermark Active (OD-19)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block mb-0.5">Authorized Recipient:</span>
            <span className="font-medium text-slate-100">{recipientEmail}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Forensic Trace Hash:</span>
            <span className="font-mono text-emerald-400 text-[11px] break-all">{forensicHash || 'Computing...'}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-600 text-sm">
          Decrypting vault record and applying dynamic recipient watermarking...
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <span className="font-semibold text-slate-700">Document Stream</span>
              <span>•</span>
              <span>{mimeType}</span>
            </div>
            <span className="font-mono text-[11px]">Vault Ciphertext at rest untouched</span>
          </div>

          <div className="p-6">
            <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-6 rounded-xl border border-slate-100 overflow-x-auto">
              {textContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
