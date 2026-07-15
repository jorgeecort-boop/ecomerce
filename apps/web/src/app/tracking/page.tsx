'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@ecomerce/utils';
import { Package, Truck, CheckCircle, Clock, XCircle, Search, ExternalLink } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'Procesando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-5 h-5 text-amber-500" />,
  CONFIRMED: <CheckCircle className="w-5 h-5 text-blue-500" />,
  PROCESSING: <Package className="w-5 h-5 text-purple-500" />,
  SHIPPED: <Truck className="w-5 h-5 text-green-500" />,
  DELIVERED: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  CANCELLED: <XCircle className="w-5 h-5 text-red-500" />,
  REFUNDED: <XCircle className="w-5 h-5 text-red-500" />,
};

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

interface OrderData {
  orderNumber: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  items: Array<{ title: string; quantity: number; price: number }>;
  trackingNumber?: string;
  trackingUrl?: string;
}

function formatCOP(amount: number) {
  return `$${Math.round(amount).toLocaleString('es-CO')}`;
}

export default function TrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch(
        `${API_URL}/orders/track/${encodeURIComponent(orderNumber.trim())}?email=${encodeURIComponent(email.trim())}`,
        { cache: 'no-store' },
      );

      if (!res.ok) {
        if (res.status === 404) {
          setError('No encontramos un pedido con esos datos. Verifica el número y el email.');
        } else {
          setError('Error al consultar el pedido. Intenta de nuevo.');
        }
        return;
      }

      const json = await res.json();
      setOrder(json.data || json);
    } catch {
      setError('No pudimos conectar con el servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-[rgba(255,255,255,0.12)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/store/saratech" className="text-sm text-[#a8adb8] hover:text-white transition-colors">
            ← Volver a la tienda
          </Link>
          <h1 className="text-lg font-semibold">Rastrear Pedido</h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12">
        <form onSubmit={handleLookup} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.12)] rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-[#a8adb8]" />
            Consulta tu pedido
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Número de orden *</label>
              <input
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="Ej: SARATECH-000001"
                className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.15)] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#a8adb8] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email usado en la compra *</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.15)] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#a8adb8] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !orderNumber.trim() || !email.trim()}
            className="w-full mt-5 py-3 bg-[#a8adb8] text-[#0a0a0f] rounded-xl font-medium hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" />
                Buscando...
              </>
            ) : (
              'Consultar pedido'
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}
        </form>

        {order && (
          <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.12)] rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Orden</p>
                <p className="font-mono font-bold text-lg">{order.orderNumber}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {STATUS_ICONS[order.status]}
                <span className="font-medium">{order.statusLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((step, i) => {
                const isActive = i <= currentStepIndex;
                const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
                return (
                  <div key={step} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-3 h-3 rounded-full mb-1 ${
                          isCancelled
                            ? 'bg-red-500'
                            : isActive
                              ? 'bg-emerald-500'
                              : 'bg-gray-600'
                        }`}
                      />
                      <span className="text-[10px] text-gray-500 text-center leading-tight">
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={`h-px flex-1 -mt-3 ${
                          isActive && !isCancelled ? 'bg-emerald-500' : 'bg-gray-600'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[rgba(255,255,255,0.08)] pt-4">
              <h3 className="font-medium text-sm text-gray-300 mb-3">Productos</h3>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400 line-clamp-1 flex-1 mr-4">
                      {item.title} ×{item.quantity}
                    </span>
                    <span className="text-white font-medium">
                      {formatCOP(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 flex justify-between">
              <span className="font-medium text-gray-300">Total</span>
              <span className="font-bold text-lg">{formatCOP(order.total)}</span>
            </div>

            {order.trackingNumber && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Número de guía</p>
                <p className="font-mono font-bold text-emerald-400">{order.trackingNumber}</p>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Rastrear envío
                  </a>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 text-center pt-2">
              Pedido realizado el {new Date(order.createdAt).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
