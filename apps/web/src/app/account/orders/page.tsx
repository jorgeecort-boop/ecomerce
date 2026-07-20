'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@ecomerce/utils';
import { Package, ChevronRight, ShoppingBag } from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'rgba(255,193,7,0.15)', text: '#FFC107' },
  CONFIRMED: { bg: 'rgba(168,173,184,0.15)', text: '#a8adb8' },
  PROCESSING: { bg: 'rgba(144,224,239,0.15)', text: '#d0d5dc' },
  SHIPPED: { bg: 'rgba(40,167,69,0.15)', text: '#28A745' },
  DELIVERED: { bg: 'rgba(40,167,69,0.15)', text: '#28A745' },
  CANCELLED: { bg: 'rgba(220,53,69,0.15)', text: '#DC3545' },
  REFUNDED: { bg: 'rgba(108,117,125,0.15)', text: '#6C757D' },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'Procesando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

export default function MyOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchOrders = async () => {
      try {
        const data = await api.orders.myOrders(token!);
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#a8adb8] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Mis Órdenes</h1>
        <p className="text-[rgba(255,255,255,0.5)] text-sm mt-1">
          Historial de tus compras
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={48} className="text-[rgba(255,255,255,0.15)] mx-auto mb-4" />
          <p className="text-white text-lg font-medium mb-1">No tienes órdenes aún</p>
          <p className="text-[rgba(255,255,255,0.5)] text-sm">
            Tus compras aparecerán aquí después de realizar un pedido
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const style = STATUS_STYLES[order.status] || STATUS_STYLES.PENDING;
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-5 hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
                      <Package size={20} className="text-[#a8adb8]" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-[rgba(255,255,255,0.4)]">
                        {new Date(order.createdAt).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        ${Number(order.total).toFixed(2)}
                      </p>
                      <span
                        className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-[rgba(255,255,255,0.3)]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
