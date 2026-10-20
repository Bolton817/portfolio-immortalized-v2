import Link from 'next/link';
import { LogOut } from 'lucide-react';

export default function TrusteeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-xs">
            TR
          </div>
          <div>
            <span className="font-semibold text-slate-900 tracking-tight">Trustee Workspace</span>
            <span className="ml-2 text-xs text-slate-500 font-mono">ROLE: TRUSTEE</span>
          </div>
        </div>
        <Link
          href="/"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Workspace</span>
        </Link>
      </header>
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}
