'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@ecomerce/utils';
import { ArrowLeft, Package, Truck, MapPin, CreditCard, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'Procesando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !params.id) return;
    fetchOrder();
  }, [token, params.id]);

  const fetchOrder = async () => {
    try {
      const data = await api.orders.getById(token!, params.id as string);
      setOrder(data);
    } catch {
      router.push('/account/orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#a8adb8] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) return null;

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-sm text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Volver a mis órdenes
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{order.orderNumber}</h1>
          <p className="text-[rgba(255,255,255,0.5)] text-sm mt-1">
            {new Date(order.createdAt).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            order.status === 'DELIVERED'
              ? 'bg-[rgba(40,167,69,0.15)] text-[#28A745]'
              : order.status === 'CANCELLED'
              ? 'bg-[rgba(220,53,69,0.15)] text-[#DC3545]'
              : 'bg-[rgba(168,173,184,0.15)] text-[#a8adb8]'
          }`}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      {/* Progress */}
      {!isCancelled && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-6">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step} className="flex flex-col items-center gap-2 flex-1 relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-[#a8adb8] text-white'
                        : 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.3)]'
                    } ${isCurrent ? 'ring-2 ring-[#a8adb8] ring-offset-2 ring-offset-[#0a0a0f]' : ''}`}
                  >
                    {i + 1}
                  </div>
                  <p
                    className={`text-xs ${
                      isCompleted ? 'text-white' : 'text-[rgba(255,255,255,0.3)]'
                    }`}
                  >
                    {STATUS_LABELS[step]}
                  </p>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className="absolute top-4 left-[60%] w-[80%] h-[2px] -translate-y-1/2"
                      style={{
                        background: isCompleted
                          ? '#a8adb8'
                          : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Package size={18} className="text-[#a8adb8]" />
          Productos
        </h2>
        <div className="space-y-3">
          {(order.items || []).map((item: any) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]"
            >
              <div className="w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.06)] overflow-hidden flex-shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-[rgba(255,255,255,0.4)]">Qty: {item.quantity}</p>
              </div>
              <p className="text-white text-sm font-semibold">
                ${Number(item.price).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)] space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-[rgba(255,255,255,0.5)]">Subtotal</span>
            <span className="text-white">${Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[rgba(255,255,255,0.5)]">Envío</span>
            <span className="text-white">${Number(order.shippingCost).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-[rgba(255,255,255,0.08)]">
            <span className="text-white">Total</span>
            <span className="text-[#a8adb8]">${Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shipping */}
      {order.shippingAddress && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Truck size={18} className="text-[#a8adb8]" />
            Envío
          </h2>
          <div className="space-y-2 text-sm">
            {order.shippingAddress.firstName && (
              <p className="text-white">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
            )}
            <p className="text-[rgba(255,255,255,0.6)]">{order.shippingAddress.address}</p>
            <p className="text-[rgba(255,255,255,0.6)]">
              {order.shippingAddress.city}, {order.shippingAddress.postalCode}
            </p>
            <p className="text-[rgba(255,255,255,0.6)]">{order.shippingAddress.country}</p>
          </div>

          {order.trackingNumber && (
            <div className="mt-4 p-3 rounded-xl bg-[rgba(168,173,184,0.08)] border border-[rgba(168,173,184,0.15)]">
              <p className="text-xs text-[rgba(255,255,255,0.4)] mb-1">Número de seguimiento</p>
              {order.trackingUrl ? (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#a8adb8] text-sm font-medium hover:underline inline-flex items-center gap-1"
                >
                  {order.trackingNumber}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <p className="text-white text-sm font-medium">{order.trackingNumber}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-[#a8adb8]" />
          Pago
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[rgba(255,255,255,0.5)]">Estado del pago</span>
          <span
            className={`text-sm font-medium ${
              order.paymentStatus === 'PAID' ? 'text-[#28A745]' : 'text-[#FFC107]'
            }`}
          >
            {order.paymentStatus === 'PAID' ? 'Pagado' : 'Pendiente'}
          </span>
        </div>
      </div>
    </div>
  );
}
