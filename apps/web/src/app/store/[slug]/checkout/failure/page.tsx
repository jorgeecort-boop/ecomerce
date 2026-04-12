'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function CheckoutFailurePage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const reason = searchParams.get('status_detail') || 'cc_rejected_other_reason';

  const messages: Record<string, string> = {
    cc_rejected_insufficient_amount: 'Fondos insuficientes.',
    cc_rejected_bad_filled_card_number: 'Número de tarjeta incorrecto.',
    cc_rejected_bad_filled_date: 'Fecha de vencimiento incorrecta.',
    cc_rejected_bad_filled_other: 'Datos de tarjeta incorrectos.',
    cc_rejected_call_for_authorize: 'Llama a tu banco para autorizar el pago.',
    cc_rejected_card_disabled: 'Tarjeta deshabilitada.',
    cc_rejected_duplicated_payment: 'Pago duplicado.',
  };

  const humanReason = messages[reason] || 'El pago no pudo procesarse. Intenta con otro método.';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pago rechazado
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{humanReason}</p>
          <div className="flex gap-3">
            <Link
              href={`/store/${slug}/checkout`}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </Link>
            <Link
              href={`/store/${slug}`}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Volver
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
