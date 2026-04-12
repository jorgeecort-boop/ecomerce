'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function CheckoutSuccessPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    // MercadoPago appends: ?collection_id=...&collection_status=approved&external_reference=...
    const externalRef = searchParams.get('external_reference');
    if (externalRef) setOrderNumber(externalRef);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pago aprobado
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Tu orden fue confirmada y está siendo procesada.
          </p>
          {orderNumber && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Orden</p>
              <p className="font-mono font-bold text-gray-900 dark:text-white text-sm">{orderNumber}</p>
            </div>
          )}
          <Link
            href={`/store/${slug}`}
            className="block w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
