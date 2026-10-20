import { ShieldCheck, FileText, Users, Clock, Upload } from 'lucide-react';

export default function OwnerDashboardPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Banner / Status Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">Vault Protected</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Your story is secure. Envelope encryption enabled with per-asset keys.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
            <Upload className="w-4 h-4" />
            <span>Preserve New Item</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">Secure Items</span>
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-slate-900">0</div>
          <p className="text-xs text-slate-500 mt-2">Wills, scans, videos, and private notes</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">Trusted Network</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-slate-900">0</div>
          <p className="text-xs text-slate-500 mt-2">Active trustees and designated beneficiaries</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-sm font-medium">Setup Tasks</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900">3</div>
          <p className="text-xs text-slate-500 mt-2">Recommended steps to solidify your legacy</p>
        </div>
      </div>

      {/* Guided Setup Checklist */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Complete Your Plan</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs text-slate-400">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Upload your signed Will or primary document</p>
                <p className="text-xs text-slate-500">Encrypted with dedicated keys before cloud storage</p>
              </div>
            </div>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">Upload &rarr;</button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs text-slate-400">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Appoint at least two trusted Trustees</p>
                <p className="text-xs text-slate-500">Trustees assist in future verification but cannot browse your vault</p>
              </div>
            </div>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">Invite &rarr;</button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs text-slate-400">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Assign item-level access to Beneficiaries</p>
                <p className="text-xs text-slate-500">Each beneficiary only receives specifically assigned materials</p>
              </div>
            </div>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">Assign &rarr;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
