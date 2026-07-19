'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function CheckoutPendingPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const externalRef = searchParams.get('external_reference') || searchParams.get('orderNumber');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pago en proceso
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Tu pago está siendo verificado. Recibirás una confirmación cuando esté aprobado.
          </p>
          {externalRef && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Referencia</p>
              <p className="font-mono font-bold text-gray-900 dark:text-white text-sm">{externalRef}</p>
            </div>
          )}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-700 dark:text-yellow-400 mb-6 text-left">
            Si pagaste con Efecty, PSE u otro método offline, puede demorar hasta 2 días hábiles.
          </div>
          <Link
            href={`/store/${slug}`}
            className="block w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}
