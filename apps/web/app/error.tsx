'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Redacted server-safe client log
    console.error('Handled application error:', error.message);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold mb-4">
        !
      </div>
      <h1 className="text-2xl font-bold mb-2">Unexpected Application Error</h1>
      <p className="text-sm text-slate-600 mb-6 text-center max-w-md">
        A system safeguard prevented this request from completing. The incident has been recorded.
      </p>
      <div className="flex space-x-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
