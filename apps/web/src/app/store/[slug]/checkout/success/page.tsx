'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_URL } from '@ecomerce/utils';

export default function CheckoutSuccessPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'checking' | 'synced' | 'timeout'>('checking');

  useEffect(() => {
    const externalRef = searchParams.get('external_reference');
    if (!externalRef) return;

    setOrderNumber(externalRef);

    let attempts = 0;
    const maxAttempts = 12;

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/payments/status/${externalRef}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;

        const data = await res.json();
        const unwrapped = data.data || data;

        if (unwrapped.paymentStatus === 'PAID' || unwrapped.synced) {
          setSyncStatus('synced');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setSyncStatus('timeout');
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setSyncStatus('timeout');
        }
      }
    };

    poll();
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
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Tu orden fue confirmada y está siendo procesada.
          </p>
          {syncStatus === 'checking' && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 animate-pulse">
              Verificando estado del pago...
            </p>
          )}
          {syncStatus === 'synced' && (
            <p className="text-xs text-green-500 dark:text-green-400 mb-4">
              Confirmación recibida
            </p>
          )}
          {syncStatus === 'timeout' && (
            <p className="text-xs text-amber-500 dark:text-amber-400 mb-4">
              La confirmación puede tardar unos minutos. Te notificaremos por email.
            </p>
          )}
          {orderNumber && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4 text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Orden</p>
              <p className="font-mono font-bold text-gray-900 dark:text-white text-sm">{orderNumber}</p>
            </div>
          )}
          <div className="space-y-2">
            <Link
              href={`/store/${slug}`}
              className="block w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Seguir comprando
            </Link>
            {orderNumber && (
              <Link
                href="/tracking"
                className="block w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Rastrear pedido
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
