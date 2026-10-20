'use client';

import { useState } from 'react';
import {
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  FileCheck,
  Scale,
  Sparkles,
} from 'lucide-react';
import { EstateGuidanceOutput } from '@portfolio-immortalized/validation';



interface Beneficiary {
  id: string;
  name: string;
  email: string;
  relationshipType: string;
}

interface VaultAssetItem {
  id: string;
  title: string;
  assetType: string;
  sizeMb: string;
}

interface Instruction {
  id: string;
  beneficiaryId: string;
  assignedAssetIds: string[];
  customInstructions: string;
  deliveryDelayDays: number;
}

const SAMPLE_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben_001',
    name: 'Jane Doe Johnson',
    email: 'jane.johnson@example.com',
    relationshipType: 'SPOUSE',
  },
  {
    id: 'ben_002',
    name: 'Timothy Johnson',
    email: 'timothy.johnson@example.com',
    relationshipType: 'CHILD',
  },
];

const SAMPLE_VAULT_ASSETS: VaultAssetItem[] = [
  {
    id: 'ast_001',
    title: 'Last_Will_and_Testament_2026.pdf',
    assetType: 'WILL',
    sizeMb: '2.4 MB',
  },
  {
    id: 'ast_002',
    title: 'Title_Deed_Karen_Property.pdf',
    assetType: 'DOCUMENT',
    sizeMb: '4.1 MB',
  },
  {
    id: 'ast_003',
    title: 'Passport_and_National_ID_Scans.pdf',
    assetType: 'IDENTITY',
    sizeMb: '1.8 MB',
  },
  {
    id: 'ast_004',
    title: 'Personal_Letter_To_My_Family.pdf',
    assetType: 'MESSAGE',
    sizeMb: '0.4 MB',
  },
];

export default function LegacyPage() {
  const [instructions, setInstructions] = useState<Instruction[]>([
    {
      id: 'inst_01',
      beneficiaryId: 'ben_001',
      assignedAssetIds: ['ast_001', 'ast_002'],
      customInstructions: 'Please consult attorney Mwangi & Associates regarding the estate transfer and title deed.',
      deliveryDelayDays: 0,
    },
    {
      id: 'inst_02',
      beneficiaryId: 'ben_002',
      assignedAssetIds: ['ast_003', 'ast_004'],
      customInstructions: 'Keep your identity documents safe. Read the personal letter carefully.',
      deliveryDelayDays: 14,
    },
  ]);

  const [planStatus, setPlanStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [planVersion, setPlanVersion] = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [disclaimerConfirmed, setDisclaimerConfirmed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Edit guidance modal
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);
  const [editedNote, setEditedNote] = useState('');
  const [editedDelay, setEditedDelay] = useState(0);

  // AI Estate Advisor Drawer (Stage 6, ADR-009)
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('How should I distribute land title deeds under Kenyan succession law?');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<EstateGuidanceOutput | null>(null);


  const handleAskAi = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/v1/ai/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: aiQuestion,
          currentReadinessScore: 65,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAiResponse(json.data);
      }
    } catch (err) {
      console.error('Error asking AI guidance:', err);
    } finally {
      setAiLoading(false);
    }
  };


  const toggleAssetAssignment = (beneficiaryId: string, assetId: string) => {
    setInstructions((prev) => {
      const existing = prev.find((i) => i.beneficiaryId === beneficiaryId);
      if (existing) {
        const assigned = new Set(existing.assignedAssetIds);
        if (assigned.has(assetId)) {
          assigned.delete(assetId);
        } else {
          assigned.add(assetId);
        }
        return prev.map((i) =>
          i.beneficiaryId === beneficiaryId
            ? { ...i, assignedAssetIds: Array.from(assigned) }
            : i
        );
      } else {
        return [
          ...prev,
          {
            id: `inst_${Date.now()}`,
            beneficiaryId,
            assignedAssetIds: [assetId],
            customInstructions: '',
            deliveryDelayDays: 0,
          },
        ];
      }
    });
  };

  const handleSaveGuidance = () => {
    if (!editingInstruction) return;
    setInstructions((prev) =>
      prev.map((i) =>
        i.id === editingInstruction.id
          ? {
              ...i,
              customInstructions: editedNote,
              deliveryDelayDays: editedDelay,
            }
          : i
      )
    );
    setEditingInstruction(null);
  };

  const handlePublishPlan = async () => {
    if (!disclaimerConfirmed) return;
    setIsPublishing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setPlanStatus('PUBLISHED');
    setPlanVersion((v) => v + 1);
    setIsPublishing(false);
    setPublishSuccess(true);
    setTimeout(() => {
      setPublishSuccess(false);
      setIsPublishModalOpen(false);
      setDisclaimerConfirmed(false);
    }, 2000);
  };

  // Find all unallocated assets
  const allocatedAssetIds = new Set(instructions.flatMap((i) => i.assignedAssetIds));
  const unallocatedAssets = SAMPLE_VAULT_ASSETS.filter((a) => !allocatedAssetIds.has(a.id));

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-6 h-6 text-emerald-600" />
              Legacy Plan & Delivery Matrix
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                planStatus === 'PUBLISHED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {planStatus} v{planVersion}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Map preserved vault items to designated beneficiaries with personalized release conditions and instructions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-semibold text-sm rounded-lg shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI Estate Advisor
          </button>

          <button
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            Simulate Recipient Delivery
          </button>

          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow transition-colors"
          >
            <Send className="w-4 h-4" />
            Publish Plan
          </button>
        </div>

      </div>

      {/* Statutory Notice Banner (Kenya Succession Act) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <Scale className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-800">Statutory Notice (Cap. 160 & ODPC):</strong> Portfolio Immortalized executes cryptographic delivery of preserved digital assets. This platform facilitates intended succession transfers but does not replace formal probate or grant of representation issued by a court of competent jurisdiction.
        </div>
      </div>

      {/* Unallocated Items Warning */}
      {unallocatedAssets.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <strong>{unallocatedAssets.length} unassigned vault items:</strong>{' '}
              {unallocatedAssets.map((a) => a.title).join(', ')}
            </div>
          </div>
          <span className="text-xs text-amber-700 font-medium">Assign below</span>
        </div>
      )}

      {/* Beneficiary Allocation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {SAMPLE_BENEFICIARIES.map((ben) => {
          const instruction = instructions.find((i) => i.beneficiaryId === ben.id);
          const assignedIds = new Set(instruction?.assignedAssetIds || []);

          return (
            <div
              key={ben.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between"
            >
              <div>
                {/* Beneficiary Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                      {ben.relationshipType}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{ben.name}</h3>
                    <p className="text-xs text-slate-500">{ben.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      if (instruction) {
                        setEditingInstruction(instruction);
                        setEditedNote(instruction.customInstructions || '');
                        setEditedDelay(instruction.deliveryDelayDays || 0);
                      }
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                  >
                    Edit Guidance
                  </button>
                </div>

                {/* Assigned Assets Selector */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Allocated Vault Items ({assignedIds.size})</span>
                    <span className="text-[11px] text-slate-400">Click to assign/unassign</span>
                  </div>

                  <div className="space-y-2">
                    {SAMPLE_VAULT_ASSETS.map((asset) => {
                      const isAssigned = assignedIds.has(asset.id);
                      return (
                        <div
                          key={asset.id}
                          onClick={() => toggleAssetAssignment(ben.id, asset.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isAssigned
                              ? 'bg-emerald-50/60 border-emerald-300 text-slate-900'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => {}}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-medium">{asset.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{asset.sizeMb}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Notes Preview */}
                {instruction?.customInstructions && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Personal Message & Guidance
                    </div>
                    <p className="text-xs text-slate-700 italic">
                      &quot;{instruction.customInstructions}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Delivery Timing Badge */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {instruction?.deliveryDelayDays === 0
                    ? 'Immediate upon release authorization'
                    : `Delivered ${instruction?.deliveryDelayDays} days after release`}
                </span>
                <span className="font-medium text-emerald-600">{assignedIds.size} items protected</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipient Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-600" />
                  Simulate Recipient Delivery
                </h2>
                <p className="text-xs text-slate-500">
                  This is the exact view each beneficiary receives after two-person release authorization.
                </p>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 mt-6">
              {SAMPLE_BENEFICIARIES.map((ben) => {
                const instruction = instructions.find((i) => i.beneficiaryId === ben.id);
                const assignedAssets = SAMPLE_VAULT_ASSETS.filter((a) =>
                  instruction?.assignedAssetIds.includes(a.id)
                );

                return (
                  <div key={ben.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{ben.name}</span>
                        <span className="text-xs text-slate-500 ml-2">({ben.relationshipType})</span>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                        {assignedAssets.length} Documents Granted
                      </span>
                    </div>

                    {instruction?.customInstructions && (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 italic">
                        &quot;{instruction.customInstructions}&quot;
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {assignedAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100 text-xs"
                        >
                          <span className="font-medium text-slate-800 flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            {asset.title}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">Decryption Ready</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium"
              >
                Done Previewing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Guidance Modal */}
      {editingInstruction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Personal Delivery Instructions</h2>
              <button onClick={() => setEditingInstruction(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Personal Message / Guidance for Recipient
                </label>
                <textarea
                  rows={4}
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  placeholder="Share executor details, legal context, or personal words for this beneficiary..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Delay (Days after two-person authorization)
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={editedDelay}
                  onChange={(e) => setEditedDelay(parseInt(e.target.value || '0', 10))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Set to 0 for immediate release upon authorization.
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingInstruction(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGuidance}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
              >
                Save Guidance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Plan Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                Publish Legacy Plan Version {planVersion + 1}
              </h2>
              <button
                onClick={() => !isPublishing && setIsPublishModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {publishSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-semibold text-slate-900">Legacy Plan Published!</h3>
                <p className="text-xs text-slate-500">
                  Version {planVersion} committed with statutory succession acknowledgement.
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-700" />
                    Kenya Statutory Succession Acknowledgement
                  </div>
                  <p className="leading-relaxed">
                    By publishing this plan, you certify that the asset mappings and release directives represent your intended digital distribution. You acknowledge that in accordance with the Kenya Law of Succession Act (Cap. 160), this platform executes digital transmission upon verified two-person authorization but does not replace court-ordered probate proceedings.
                  </p>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={disclaimerConfirmed}
                    onChange={(e) => setDisclaimerConfirmed(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    I have reviewed the recipient allocations and confirm this legacy directive.
                  </span>
                </label>

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    disabled={isPublishing}
                    onClick={() => setIsPublishModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!disclaimerConfirmed || isPublishing}
                    onClick={handlePublishPlan}
                    className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow disabled:opacity-50"
                  >
                    {isPublishing ? 'Publishing...' : 'Commit & Publish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Estate Advisor Modal (Stage 6, ADR-009) */}

      {isAiDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">
                  AI Estate Advisor & Succession Guidance
                </h3>
              </div>
              <button
                onClick={() => setIsAiDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ask about allocation, trustees, or Kenya Cap. 160 compliance:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="e.g. How do I allocate real estate versus personal letters?"
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAskAi}
                    disabled={aiLoading || !aiQuestion.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiLoading ? 'Thinking...' : 'Ask AI'}</span>
                  </button>
                </div>
              </div>

              {aiResponse ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-purple-900">Guidance Summary:</span>
                    <p className="text-purple-950 leading-relaxed">{aiResponse.answer}</p>
                    {aiResponse.successionContextKenya && (
                      <div className="pt-2 border-t border-purple-200 text-[11px] text-purple-900/90 font-medium">
                        ⚖️ Statutory Context: {aiResponse.successionContextKenya}
                      </div>
                    )}
                  </div>

                  {aiResponse.suggestedActions?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Recommended Next Steps:
                      </span>
                      {aiResponse.suggestedActions.map((act, i: number) => (
                        <div

                          key={i}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{act.title}: </span>
                            <span className="text-slate-600">{act.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 leading-snug">
                    ⚠️ <strong>Notice:</strong> {aiResponse.disclaimer}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">
                  Get instant suggestions on structuring your beneficiary directives, appointing trustees, and adhering to Kenyan succession best practices.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsAiDrawerOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
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

