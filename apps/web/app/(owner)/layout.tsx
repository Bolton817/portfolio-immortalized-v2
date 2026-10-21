import Link from 'next/link';
import { Shield, Folder, Users, BookOpen, Settings, LogOut, FileText, CreditCard } from 'lucide-react';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between">
        <div>
          <div className="h-16 px-6 flex items-center space-x-3 border-b border-slate-200">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
              PI
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">Owner Vault</span>
          </div>

          <nav className="p-4 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-900"
            >
              <Shield className="w-4 h-4 text-slate-700" />
              <span>Overview</span>
            </Link>
            <Link
              href="/vault"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Folder className="w-4 h-4 text-slate-500" />
              <span>Vault & Items</span>
            </Link>
            <Link
              href="/people"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Trustees & Beneficiaries</span>
            </Link>
            <Link
              href="/legacy"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>Legacy Plan</span>
            </Link>
            <Link
              href="/will-builder"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Will Builder (Cap. 160)</span>
            </Link>
            <Link
              href="/billing"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>Billing & Subscription</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Settings & Recovery</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200">
          <Link
            href="/"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Return to Portal</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
