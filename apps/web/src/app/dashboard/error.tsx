'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard Error
        </h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-red-400 mt-2">Digest: {error.digest}</p>
          )}
          {error.stack && (
            <details className="mt-2">
              <summary className="text-xs text-red-400 cursor-pointer">Stack trace</summary>
              <pre className="text-xs text-red-500 mt-1 overflow-auto max-h-40">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <a
            href="/login"
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
          >
            Go to login
          </a>
        </div>
      </div>
    </div>
  );
}