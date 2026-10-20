import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold mb-4">
        404
      </div>
      <h1 className="text-2xl font-bold mb-2">Resource Not Found</h1>
      <p className="text-sm text-slate-600 mb-6 text-center max-w-md">
        The requested vault item, case, or portal page does not exist or access has not been granted.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
      >
        Return to Home
      </Link>
    </div>
  );
}
