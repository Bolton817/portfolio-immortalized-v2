'use client';

import { useState } from 'react';
import { ShieldCheck, Save, Check } from 'lucide-react';

export default function ProfileSettingsPage() {
  const [displayName, setDisplayName] = useState('Alex Johnson');
  const [legalName, setLegalName] = useState('Alexander Patrick Johnson');
  const [dateOfBirth, setDateOfBirth] = useState('1985-05-15');
  const [nationality, setNationality] = useState('KE');
  const [residenceCountry, setResidenceCountry] = useState('KE');
  const [isSaved, setIsSaved] = useState(false);
  const [profileVersion, setProfileVersion] = useState(1);

  // Compute readiness score (TDD Chapter 6 & 7)
  const isLegalIdentityComplete = !!(legalName && dateOfBirth && residenceCountry);
  const readinessPercent = isLegalIdentityComplete ? 80 : 40; // 80% once legal fields complete, reaches 100% when quorum satisfied

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setProfileVersion(profileVersion + 1);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Personal & Legal Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Progressively complete your identity records to establish clear lineage for future estate verification.
        </p>
      </div>

      {/* Readiness Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-900">Profile Readiness</span>
          <span className="font-bold text-slate-900">{readinessPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-900 rounded-full transition-all duration-500"
            style={{ width: `${readinessPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          {readinessPercent < 100
            ? 'Complete legal identity fields and assign trustees to maximize readiness.'
            : 'Your legal profile is complete and fully verified.'}
        </p>
      </div>

      {/* Kenya Jurisdiction Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 flex items-start space-x-3 text-xs text-slate-700">
        <ShieldCheck className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Kenya Legal Compliance (Law of Succession Act, Cap. 160):</span>
          <p className="mt-0.5 text-slate-500">
            Legal names and official birth dates are matched against national Civil Registration records during estate verification.
            Information is strictly encrypted at rest and never shared with commercial third parties.
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Display Name (Preferred)</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Legal Name (As on ID / Passport)</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Official full legal name"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nationality</label>
              <select
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
              >
                <option value="KE">Kenya (KE)</option>
                <option value="UG">Uganda (UG)</option>
                <option value="TZ">Tanzania (TZ)</option>
                <option value="RW">Rwanda (RW)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="US">United States (US)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Country of Primary Residence</label>
              <select
                value={residenceCountry}
                onChange={(e) => setResidenceCountry(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
              >
                <option value="KE">Kenya</option>
                <option value="UG">Uganda</option>
                <option value="TZ">Tanzania</option>
                <option value="RW">Rwanda</option>
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Optimistic Version Tag</label>
              <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono text-xs">
                Version #{profileVersion} (Concurrency Protected)
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {isSaved ? (
              <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Profile updated successfully</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400">All edits are version-locked</span>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
