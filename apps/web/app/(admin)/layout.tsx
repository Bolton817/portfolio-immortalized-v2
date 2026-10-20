import Link from 'next/link';
import { ShieldAlert, Users, FolderCheck, AlertOctagon, History, LogOut } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between">
        <div>
          <div className="h-16 px-6 flex items-center space-x-3 border-b border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs">
              AD
            </div>
            <div>
              <span className="font-semibold text-white tracking-tight">PI Admin Console</span>
              <span className="block text-[10px] text-purple-400 font-mono">SEPARATION OF DUTIES</span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            <Link
              href="/admin/dashboard"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-white"
            >
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <span>Overview</span>
            </Link>
            <Link
              href="/admin/cases"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <FolderCheck className="w-4 h-4 text-slate-500" />
              <span>Verification Cases</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>User Directory</span>
            </Link>
            <Link
              href="/admin/security"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <AlertOctagon className="w-4 h-4 text-slate-500" />
              <span>Security & Holds</span>
            </Link>
            <Link
              href="/admin/audit"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Append-Only Audit</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Console</span>
          </Link>
        </div>
      </aside>

      {/* Main Admin Workspace */}
      <main className="flex-1 overflow-y-auto bg-slate-900 p-8">{children}</main>
    </div>
  );
}
