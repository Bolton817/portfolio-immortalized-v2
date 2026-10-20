'use client';

import { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  UploadCloud,
  Lock,
  Trash2,
  Download,
  History,
  Plus,
  Search,
  CheckCircle2,
  X,
  FileCheck,
  Sparkles,
} from 'lucide-react';


interface VaultAsset {
  id: string;
  title: string;
  assetType: 'WILL' | 'IDENTITY' | 'DOCUMENT' | 'PHOTO' | 'VIDEO' | 'AUDIO' | 'MESSAGE' | 'OTHER';
  sensitivity: string;
  currentVersion?: {
    versionNumber: number;
    sha256: string;
    committedAt: string;
  };
  versions: Array<{
    versionNumber: number;
    sha256: string;
    committedAt: string;
  }>;
  sizeBytes: number;
  updatedAt: string;
}

const INITIAL_ASSETS: VaultAsset[] = [
  {
    id: 'ast_will_001',
    title: 'Last_Will_and_Testament_2026.pdf',
    assetType: 'WILL',
    sensitivity: 'HIGH_CONFIDENTIAL',
    sizeBytes: 2450000,
    currentVersion: {
      versionNumber: 2,
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      committedAt: '2026-10-18T10:30:00Z',
    },
    versions: [
      {
        versionNumber: 2,
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        committedAt: '2026-10-18T10:30:00Z',
      },
      {
        versionNumber: 1,
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        committedAt: '2025-05-12T14:15:00Z',
      },
    ],
    updatedAt: '2026-10-18T10:30:00Z',
  },
  {
    id: 'ast_title_002',
    title: 'Title_Deed_Karen_Property.pdf',
    assetType: 'DOCUMENT',
    sensitivity: 'HIGH_CONFIDENTIAL',
    sizeBytes: 4120000,
    currentVersion: {
      versionNumber: 1,
      sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      committedAt: '2026-08-04T09:12:00Z',
    },
    versions: [
      {
        versionNumber: 1,
        sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        committedAt: '2026-08-04T09:12:00Z',
      },
    ],
    updatedAt: '2026-08-04T09:12:00Z',
  },
  {
    id: 'ast_passport_003',
    title: 'Passport_and_National_ID_Scans.pdf',
    assetType: 'IDENTITY',
    sensitivity: 'CONFIDENTIAL',
    sizeBytes: 1850000,
    currentVersion: {
      versionNumber: 1,
      sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
      committedAt: '2026-09-14T16:45:00Z',
    },
    versions: [
      {
        versionNumber: 1,
        sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        committedAt: '2026-09-14T16:45:00Z',
      },
    ],
    updatedAt: '2026-09-14T16:45:00Z',
  },
];

export default function VaultPage() {
  const [assets, setAssets] = useState<VaultAsset[]>(INITIAL_ASSETS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<VaultAsset | null>(null);

  // Upload modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newAssetType, setNewAssetType] = useState<VaultAsset['assetType']>('WILL');
  const [newSensitivity, setNewSensitivity] = useState('HIGH_CONFIDENTIAL');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessHash, setUploadSuccessHash] = useState<string | null>(null);


  // AI Classification & Scan Assistance (Stage 6, ADR-009)
  const [aiClassifying, setAiClassifying] = useState(false);
  const [aiClassificationResult, setAiClassificationResult] = useState<{
    suggestedCategory: string;
    confidence: number;
    detectedDocumentType: string;
    rationale: string;
  } | null>(null);

  const handleAiClassify = async () => {
    if (!newTitle.trim()) return;
    setAiClassifying(true);
    try {
      const res = await fetch('/api/v1/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: newTitle.includes('.') ? newTitle : `${newTitle}.pdf`,
          mimeType: 'application/pdf',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAiClassificationResult(json.data);
        if (json.data.suggestedCategory) {
          setNewAssetType(json.data.suggestedCategory);
        }
      }
    } catch (err) {
      console.error('AI classification error:', err);
    } finally {
      setAiClassifying(false);
    }
  };


  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = selectedCategory === 'ALL' || asset.assetType === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      asset.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSimulateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsUploading(true);
    setSimulatedProgress(25);

    // Simulate hashing and envelope encryption
    await new Promise((r) => setTimeout(r, 400));
    setSimulatedProgress(65);

    await new Promise((r) => setTimeout(r, 400));
    setSimulatedProgress(100);

    const generatedHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const newAsset: VaultAsset = {
      id: `ast_${Date.now()}`,
      title: newTitle.endsWith('.pdf') ? newTitle : `${newTitle}.pdf`,
      assetType: newAssetType,
      sensitivity: newSensitivity,
      sizeBytes: 1540000,
      currentVersion: {
        versionNumber: 1,
        sha256: generatedHash,
        committedAt: new Date().toISOString(),
      },
      versions: [
        {
          versionNumber: 1,
          sha256: generatedHash,
          committedAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    setUploadSuccessHash(generatedHash);
    setAssets([newAsset, ...assets]);
    setIsUploading(false);

    setTimeout(() => {
      setIsUploadModalOpen(false);
      setUploadSuccessHash(null);
      setNewTitle('');
      setSelectedFileName('');
      setSimulatedProgress(0);
    }, 2000);
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm('Are you sure you want to purge this item from your private vault?')) {
      setAssets(assets.filter((a) => a.id !== id));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header & Cryptographic Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-6 h-6 text-emerald-600" />
            Private Cryptographic Vault
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Zero-knowledge envelope storage with authenticated metadata binding (AES-256-GCM + KMS).
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Deposit New Item
        </button>
      </div>

      {/* Security Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Encryption Profile
            </div>
            <div className="text-sm font-bold text-slate-800">AES-256-GCM + AAD Binding</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Integrity Verification
            </div>
            <div className="text-sm font-bold text-slate-800">Immutable SHA-256 Hashes</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trustee Boundary (REL-04)
            </div>
            <div className="text-sm font-bold text-slate-800">Zero Trustee Access</div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {['ALL', 'WILL', 'DOCUMENT', 'IDENTITY', 'PHOTO', 'VIDEO', 'AUDIO'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Items' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map((asset) => (
          <div
            key={asset.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-md">
                  {asset.assetType}
                </span>
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  v{asset.currentVersion?.versionNumber || 1}
                </span>
              </div>

              <h3 className="font-semibold text-slate-900 mt-3 truncate flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                {asset.title}
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Size: {formatBytes(asset.sizeBytes)} • Updated:{' '}
                {new Date(asset.updatedAt).toLocaleDateString()}
              </p>

              {/* SHA-256 Badge */}
              <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-100">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  SHA-256 Hash
                </div>
                <div className="text-xs font-mono text-slate-600 truncate mt-0.5">
                  {asset.currentVersion?.sha256}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedAssetForHistory(asset)}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5" />
                History ({asset.versions.length})
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/v1/vault/assets/${asset.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-600 hover:text-emerald-600 rounded transition-colors"
                  title="Download and decrypt"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                  title="Purge asset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No vault items found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Deposit your first secure item into the vault.'}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                Deposit Item into Vault
              </h2>
              <button
                onClick={() => !isUploading && setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadSuccessHash ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-semibold text-slate-900">Item Successfully Encrypted!</h3>
                <p className="text-xs text-slate-500">
                  Ciphertext deposited with KMS key envelope and immutable SHA-256 hash.
                </p>
                <div className="p-2 bg-slate-50 rounded text-xs font-mono text-slate-700 break-all">
                  {uploadSuccessHash}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSimulateUpload} className="space-y-4 mt-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Document or Item Title
                    </label>
                    <button
                      type="button"
                      onClick={handleAiClassify}
                      disabled={aiClassifying || !newTitle.trim()}
                      className="text-[11px] text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 disabled:opacity-40"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{aiClassifying ? 'Analyzing...' : 'AI Auto-Classify'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Codicil to Will 2026"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {aiClassificationResult && (
                    <div className="mt-1.5 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-[11px] text-purple-900">
                      <span>
                        ✨ <strong>{aiClassificationResult.detectedDocumentType}</strong> ({Math.round(aiClassificationResult.confidence * 100)}% match)
                      </span>
                      <span className="text-purple-600 text-[10px]">Category set to {aiClassificationResult.suggestedCategory}</span>
                    </div>
                  )}
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newAssetType}
                      onChange={(e) => setNewAssetType(e.target.value as VaultAsset['assetType'])}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="WILL">Will & Directives</option>
                      <option value="DOCUMENT">Document</option>
                      <option value="IDENTITY">Identity Record</option>
                      <option value="PHOTO">Family Photo</option>
                      <option value="VIDEO">Video Note</option>
                      <option value="AUDIO">Audio Message</option>
                      <option value="MESSAGE">Letter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sensitivity
                    </label>
                    <select
                      value={newSensitivity}
                      onChange={(e) => setNewSensitivity(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="HIGH_CONFIDENTIAL">High Confidential</option>
                      <option value="CONFIDENTIAL">Confidential</option>
                      <option value="GENERAL_PRIVATE">General Private</option>
                    </select>
                  </div>
                </div>

                {/* File picker simulation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    File Attachment (PDF, Image, Video, Audio)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-emerald-500 transition-colors cursor-pointer bg-slate-50/50">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-medium text-slate-600 block">
                      {selectedFileName || 'Click to select file (max 500 MB)'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      id="vault-file-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFileName(file.name);
                          if (!newTitle) setNewTitle(file.name);
                        }
                      }}
                    />
                    <label
                      htmlFor="vault-file-upload"
                      className="mt-2 inline-block px-3 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 cursor-pointer shadow-sm hover:bg-slate-50"
                    >
                      Browse Device
                    </label>
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Hashing & Encrypting...</span>
                      <span>{simulatedProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${simulatedProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow disabled:opacity-50"
                  >
                    {isUploading ? 'Securing Item...' : 'Encrypt & Deposit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Version History Drawer Modal */}
      {selectedAssetForHistory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Version History</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedAssetForHistory.title}</p>
              </div>
              <button
                onClick={() => setSelectedAssetForHistory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mt-4 max-h-80 overflow-y-auto">
              {selectedAssetForHistory.versions.map((ver) => (
                <div
                  key={ver.versionNumber}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Version {ver.versionNumber}{' '}
                      {ver.versionNumber === selectedAssetForHistory.currentVersion?.versionNumber && (
                        <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                          Current
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(ver.committedAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-600 break-all">
                    SHA-256: {ver.sha256}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAssetForHistory(null)}
                className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
