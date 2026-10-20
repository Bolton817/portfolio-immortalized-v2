import Link from 'next/link';
import { ShieldCheck, Lock, Users, FileText, ArrowRight, UserCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
              PI
            </div>
            <span className="font-semibold text-lg tracking-tight text-slate-900">
              Portfolio Immortalized
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Owner Vault
            </Link>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              Admin Console
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cryptographically Verified Legacy Custody</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
            YOUR STORY. YOUR LEGACY. <br />
            <span className="text-slate-600 font-medium">PROTECTED FOR TOMORROW.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            A secure digital home for important documents, family videos, and personal messages — 
            with trusted people, independent oversight, and carefully controlled future access.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 text-base font-medium rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
            >
              Enter Private Vault
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/trustee/portal"
              className="inline-flex items-center px-6 py-3 text-base font-medium rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Trustee Verification
            </Link>
            <Link
              href="/beneficiary/portal"
              className="inline-flex items-center px-6 py-3 text-base font-medium rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Beneficiary Access
            </Link>
          </div>
        </section>

        {/* Four Connected Roles Grid */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-slate-900">Four Roles. One Connected Service.</h2>
              <p className="text-slate-600 mt-2">
                Every stakeholder operates within defined trust boundaries and strict least privilege.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-1">Account Holder</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Preserves wills, recordings, and vital records. Controls item-level assignments.
                  </p>
                </div>
                <Link href="/dashboard" className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center">
                  Owner Dashboard &rarr;
                </Link>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-1">Trustee</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Validates status reports, provides evidence, and co-signs case verifications.
                  </p>
                </div>
                <Link href="/trustee/portal" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center">
                  Trustee Portal &rarr;
                </Link>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-1">Beneficiary</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Receives access only to specific authorized legacy items after verified release.
                  </p>
                </div>
                <Link href="/beneficiary/portal" className="text-xs font-semibold text-amber-600 hover:underline inline-flex items-center">
                  Beneficiary Portal &rarr;
                </Link>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-1">Administrator</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Oversees case queues, enforces holds, and provides two-person release decisions.
                  </p>
                </div>
                <Link href="/admin/dashboard" className="text-xs font-semibold text-purple-600 hover:underline inline-flex items-center">
                  Admin Console &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Pie Corp Limited. All rights reserved. Portfolio Immortalized.</p>
        <p className="mt-1">
          Inactivity is an escalation signal, never proof of death. All releases require verified human authorization.
        </p>
      </footer>
    </div>
  );
}
