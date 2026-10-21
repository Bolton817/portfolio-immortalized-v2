'use client';

import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertTriangle, Printer, Plus, Trash2, ShieldCheck, MapPin } from 'lucide-react';

interface Executor {
  fullName: string;
  nationalIdNumber: string;
  relationship: string;
  phoneNumber: string;
  address: string;
  isAlternate: boolean;
}

interface SpecificBequest {
  category: string;
  assetDescription: string;
  identifierOrTitleNumber: string;
  beneficiaryName: string;
  beneficiaryNationalId: string;
  relationship: string;
}

interface ResiduaryShare {
  beneficiaryName: string;
  beneficiaryNationalId: string;
  relationship: string;
  sharePercentage: number;
}

interface Witness {
  fullName: string;
  nationalIdNumber: string;
  address: string;
  occupation: string;
}

export default function WillBuilderPage() {
  const [step, setStep] = useState(1);
  const [testatorName, setTestatorName] = useState('David Mwangi Mutua');
  const [nationalId, setNationalId] = useState('28491029');
  const [domicile, setDomicile] = useState('Lavington, Nairobi, Kenya');
  const [maritalStatus, setMaritalStatus] = useState('MARRIED');
  const [revocation, setRevocation] = useState(true);

  const [executors, setExecutors] = useState<Executor[]>([
    {
      fullName: 'Faith Wanjiku Mutua',
      nationalIdNumber: '29481920',
      relationship: 'Spouse',
      phoneNumber: '+254722000001',
      address: 'P.O. Box 40291-00100 Nairobi',
      isAlternate: false,
    },
  ]);

  const [bequests, setBequests] = useState<SpecificBequest[]>([
    {
      category: 'REAL_ESTATE',
      assetDescription: 'Residential property at Karen Miotoni',
      identifierOrTitleNumber: 'Title No. NAIROBI/BLOCK 104/KE',
      beneficiaryName: 'Maya Mutua',
      beneficiaryNationalId: '39481029',
      relationship: 'Daughter',
    },
  ]);

  const [residuary, setResiduary] = useState<ResiduaryShare[]>([
    {
      beneficiaryName: 'Faith Wanjiku Mutua',
      beneficiaryNationalId: '29481920',
      relationship: 'Spouse',
      sharePercentage: 100,
    },
  ]);

  const [witnesses, setWitnesses] = useState<Witness[]>([
    {
      fullName: 'Peter Kamau Ochieng',
      nationalIdNumber: '19482019',
      address: 'Upper Hill, Nairobi',
      occupation: 'Chartered Accountant',
    },
    {
      fullName: 'Dr. Jane Njeri',
      nationalIdNumber: '21948192',
      address: 'Westlands, Nairobi',
      occupation: 'Medical Doctor',
    },
  ]);

  const [legalText, setLegalText] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check Section 13 Witness Beneficiary Conflict in real-time
  const beneficiaryNames = [
    ...bequests.map((b) => b.beneficiaryName.toLowerCase().trim()),
    ...residuary.map((r) => r.beneficiaryName.toLowerCase().trim()),
  ];

  const conflictWitness = witnesses.find((w) =>
    beneficiaryNames.includes(w.fullName.toLowerCase().trim())
  );

  const handleSaveAndValidate = async () => {
    setSaving(true);
    setValidationErrors([]);
    try {
      const payload = {
        testatorFullName: testatorName,
        testatorNationalId: nationalId,
        testatorDomicile: domicile,
        maritalStatus,
        revocationOfPriorWills: revocation,
        executors,
        specificBequests: bequests,
        residuaryShares: residuary,
        digitalVaultInstructions: 'Refer to my Portfolio Immortalized encrypted legacy allocation plan.',
        witnesses,
      };

      const res = await fetch('/api/v1/will', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.data) {
        if (!data.data.validation.isValid) {
          setValidationErrors(data.data.validation.errors);
          setValidationSuccess(false);
        } else {
          setValidationSuccess(true);
          // Fetch compiled legal text
          const textRes = await fetch('/api/v1/will/legal-text');
          const textData = await textRes.json();
          if (textData.success) {
            setLegalText(textData.data.legalText);
          }
        }
      }
    } catch (e: unknown) {
      setValidationErrors([(e as Error).message]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
            Cap. 160 Compliance
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Interactive Statutory Will Builder</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Guided testamentary interview strictly adhering to Section 11 & Section 13 of the Kenya Law of Succession Act.
        </p>
      </div>

      {/* Statutory Section 13 Warning Banner if Conflict Detected */}
      {conflictWitness && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="font-bold">Cap. 160 Section 13 Statutory Disqualification Warning:</strong>
            <p className="mt-0.5">
              Witness <strong>{conflictWitness.fullName}</strong> is also named as an estate beneficiary. Under Kenyan succession law, any gift to an attesting witness is completely <strong>void</strong>. Please designate an independent witness.
            </p>
          </div>
        </div>
      )}

      {/* Wizard Progress Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          '1. Testator Details',
          '2. Executors (Sec 21)',
          '3. Specific Bequests',
          '4. Residuary Estate',
          '5. Attestation (Sec 11)',
        ].map((title, idx) => (
          <button
            key={idx}
            onClick={() => setStep(idx + 1)}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              step === idx + 1
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {title}
          </button>
        ))}
      </div>

      {/* Step 1: Testator Details */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Step 1: Personal Particulars & Revocation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block">Testator Full Legal Name</label>
              <input
                type="text"
                value={testatorName}
                onChange={(e) => setTestatorName(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block">National ID / Passport Number</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block">Permanent Domicile & Residence</label>
              <input
                type="text"
                value={domicile}
                onChange={(e) => setDomicile(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block">Marital Status</label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="WIDOWED">Widowed</option>
                <option value="DIVORCED">Divorced</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="revocation"
              checked={revocation}
              onChange={(e) => setRevocation(e.target.checked)}
              className="rounded border-slate-300 text-slate-900"
            />
            <label htmlFor="revocation" className="text-xs text-slate-700 font-medium">
              Expressly revoke and annul all prior wills, codicils, and testamentary writings.
            </label>
          </div>
        </div>
      )}

      {/* Step 2: Executors */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 2: Appointment of Executors (Section 21)</h2>
              <p className="text-xs text-slate-500">Executors carry out your testamentary instructions and petition for Grant of Probate.</p>
            </div>
          </div>
          {executors.map((e, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block">Full Legal Name</label>
                  <input
                    type="text"
                    value={e.fullName}
                    onChange={(ev) => {
                      const updated = [...executors];
                      updated[idx].fullName = ev.target.value;
                      setExecutors(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block">National ID Number</label>
                  <input
                    type="text"
                    value={e.nationalIdNumber}
                    onChange={(ev) => {
                      const updated = [...executors];
                      updated[idx].nationalIdNumber = ev.target.value;
                      setExecutors(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block">Relationship to Testator</label>
                  <input
                    type="text"
                    value={e.relationship}
                    onChange={(ev) => {
                      const updated = [...executors];
                      updated[idx].relationship = ev.target.value;
                      setExecutors(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Specific Bequests */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Step 3: Specific Bequests & Legacies</h2>
          {bequests.map((b, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block">Asset Description</label>
                  <input
                    type="text"
                    value={b.assetDescription}
                    onChange={(ev) => {
                      const updated = [...bequests];
                      updated[idx].assetDescription = ev.target.value;
                      setBequests(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block">Identifier / Title Deed No.</label>
                  <input
                    type="text"
                    value={b.identifierOrTitleNumber}
                    onChange={(ev) => {
                      const updated = [...bequests];
                      updated[idx].identifierOrTitleNumber = ev.target.value;
                      setBequests(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block">Beneficiary Name</label>
                  <input
                    type="text"
                    value={b.beneficiaryName}
                    onChange={(ev) => {
                      const updated = [...bequests];
                      updated[idx].beneficiaryName = ev.target.value;
                      setBequests(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block">Relationship</label>
                  <input
                    type="text"
                    value={b.relationship}
                    onChange={(ev) => {
                      const updated = [...bequests];
                      updated[idx].relationship = ev.target.value;
                      setBequests(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Residuary Estate */}
      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Step 4: Residuary Estate (Must total 100%)</h2>
          {residuary.map((r, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
              <div className="flex-1">
                <span className="text-xs text-slate-500 block">Beneficiary</span>
                <span className="text-sm font-bold text-slate-900">{r.beneficiaryName} ({r.relationship})</span>
              </div>
              <div className="w-32">
                <label className="text-xs text-slate-500 block">Share %</label>
                <input
                  type="number"
                  value={r.sharePercentage}
                  onChange={(ev) => {
                    const updated = [...residuary];
                    updated[idx].sharePercentage = Number(ev.target.value);
                    setResiduary(updated);
                  }}
                  className="mt-1 w-full px-2 py-1 border border-slate-300 rounded text-sm bg-white"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 5: Attestation & Witnesses */}
      {step === 5 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 5: Witness Attestation (Section 11)</h2>
            <p className="text-xs text-slate-500">
              Kenyan law requires two adult competent witnesses who are <strong>NOT beneficiaries</strong>.
            </p>
          </div>
          {witnesses.map((w, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block">Witness Full Name</label>
                  <input
                    type="text"
                    value={w.fullName}
                    onChange={(ev) => {
                      const updated = [...witnesses];
                      updated[idx].fullName = ev.target.value;
                      setWitnesses(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block">National ID Number</label>
                  <input
                    type="text"
                    value={w.nationalIdNumber}
                    onChange={(ev) => {
                      const updated = [...witnesses];
                      updated[idx].nationalIdNumber = ev.target.value;
                      setWitnesses(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block">Address</label>
                  <input
                    type="text"
                    value={w.address}
                    onChange={(ev) => {
                      const updated = [...witnesses];
                      updated[idx].address = ev.target.value;
                      setWitnesses(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block">Occupation</label>
                  <input
                    type="text"
                    value={w.occupation}
                    onChange={(ev) => {
                      const updated = [...witnesses];
                      updated[idx].occupation = ev.target.value;
                      setWitnesses(updated);
                    }}
                    className="mt-1 w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation Feedback */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Statutory Validation Errors:</span>
          </div>
          {validationErrors.map((err, i) => (
            <p key={i} className="pl-6 text-xs">{err}</p>
          ))}
        </div>
      )}

      {validationSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Will draft satisfies all statutory requirements of Cap. 160 Section 11 & Section 21. Ready for execution!</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-40"
        >
          Previous Step
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleSaveAndValidate}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{saving ? 'Validating...' : 'Validate & Save Draft'}</span>
          </button>
          {step < 5 && (
            <button
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Next Step
            </button>
          )}
        </div>
      </div>

      {/* Printable Legal Text Modal / Preview */}
      {legalText && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base">Compiled Legal Will Document</h3>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Execution Copy</span>
            </button>
          </div>
          <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto p-4 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
            {legalText}
          </pre>
        </div>
      )}
    </div>
  );
}
