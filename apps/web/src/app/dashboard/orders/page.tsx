'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme-toggle';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@ecomerce/utils';

interface Order {
  id: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: any;
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
  total: number;
  currency?: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  trackingNumber?: string;
  trackingUrl?: string;
  items?: any[];
}

interface Store {
  id: string;
  name: string;
  slug: string;
}

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  SHIPPED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  DELIVERED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  PROCESSING: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  CONFIRMED: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  REFUNDED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  FAILED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});
  const { token, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setStores(Array.isArray(data) ? data : []);
        if (data.length > 0) setSelectedStore(data[0].id);
        else setIsLoading(false);
      })
      .catch((err) => { setError(err.message); setIsLoading(false); });
  }, [token]);

  useEffect(() => {
    if (!token || !selectedStore) return;
    setIsLoading(true);
    fetch(`${API_URL}/orders/store/${selectedStore}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token, selectedStore]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        setSuccess(`Order updated to ${newStatus}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddTracking = async (orderId: string) => {
    const track = trackingInput[orderId];
    if (!track) return;
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: track, status: 'SHIPPED' }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, trackingNumber: track, status: 'SHIPPED' } : o)));
        setTrackingInput((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
        setSuccess('Tracking added & order shipped!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders =
    filterStatus === 'ALL'
      ? orders
      : orders.filter((o) => o.paymentStatus === filterStatus || o.status === filterStatus);

  const allStatuses = ['ALL', ...Array.from(new Set(orders.map((o) => o.paymentStatus || o.status).filter(Boolean)))];

  const stats = {
    total: orders.length,
    revenue: orders.filter((o) => o.paymentStatus === 'PAID').reduce((s, o) => s + Number(o.total), 0),
    pending: orders.filter((o) => o.status === 'PENDING' || o.paymentStatus === 'PENDING').length,
    shipped: orders.filter((o) => o.status === 'SHIPPED').length,
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Ecomerce</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Dashboard</Link>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">Logout</button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h2>
          </div>
          {stores.length > 0 && (
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {stores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          )}
        </div>

        {/* Stats Cards */}
        {!isLoading && orders.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, icon: '📦' },
              { label: 'Revenue', value: `$${stats.revenue.toLocaleString()}`, icon: '💰' },
              { label: 'Pending', value: stats.pending, icon: '⏳' },
              { label: 'Shipped', value: stats.shipped, icon: '🚚' },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <span className="text-2xl">{s.icon}</span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">⚠️ {error}</div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-400">✅ {success}</div>
        )}

        {/* Status Filters */}
        {orders.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {allStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  filterStatus === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                {s}
                {s !== 'ALL' && <span className="ml-1 opacity-70">({orders.filter((o) => o.status === s || o.paymentStatus === s).length})</span>}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (<div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <span className="text-4xl mb-4 block">📋</span>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{filterStatus === 'ALL' ? 'No orders yet' : `No ${filterStatus} orders`}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Orders from customers will appear here</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    {['Order #', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Actions'].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredOrders.map((order) => (
                    <>
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white">
                          {order.orderNumber ?? `#${order.id.slice(0, 8).toUpperCase()}`}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 dark:text-white">{order.customerName ?? '—'}</p>
                          <p className="text-xs text-gray-400">{order.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{order.items?.length ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white text-sm">
                          ${Number(order.total).toFixed(2)} <span className="text-xs text-gray-400">{order.currency || 'USD'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded font-medium ${STATUS_COLORS[order.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>{order.paymentStatus}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <select
                            value=""
                            onChange={(e) => { if (e.target.value) handleStatusUpdate(order.id, e.target.value); }}
                            disabled={updatingId === order.id}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                          >
                            <option value="">⚡ Actions</option>
                            {order.status === 'PENDING' && <option value="CONFIRMED">✓ Confirm</option>}
                            {['PENDING', 'CONFIRMED'].includes(order.status) && <option value="PROCESSING">⚙️ Process</option>}
                            {['CONFIRMED', 'PROCESSING'].includes(order.status) && <option value="SHIPPED">🚚 Ship</option>}
                            {order.status === 'SHIPPED' && <option value="DELIVERED">📦 Deliver</option>}
                            {!['CANCELLED', 'REFUNDED'].includes(order.status) && <option value="CANCELLED">✕ Cancel</option>}
                          </select>
                        </td>
                      </tr>
                      {expandedOrder === order.id && (
                        <tr key={`${order.id}-detail`} className="bg-blue-50/30 dark:bg-blue-900/10">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-400 uppercase">Order ID</p>
                                  <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{order.id}</p>
                                </div>
                                {order.customerPhone && (
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase">Phone</p>
                                    <p className="text-gray-900 dark:text-white">{order.customerPhone}</p>
                                  </div>
                                )}
                                {order.trackingNumber ? (
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase">Tracking</p>
                                    <p className="font-mono text-xs text-blue-600 dark:text-blue-400">{order.trackingNumber}</p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <input
                                      value={trackingInput[order.id] || ''}
                                      onChange={(e) => setTrackingInput((p) => ({ ...p, [order.id]: e.target.value }))}
                                      placeholder="Tracking number..."
                                      className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 w-40"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleAddTracking(order.id); }}
                                      disabled={!trackingInput[order.id] || updatingId === order.id}
                                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      Add & Ship
                                    </button>
                                  </div>
                                )}
                              </div>
                              {/* Shipping Address */}
                              {order.shippingAddress && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase mb-1">Shipping Address</p>
                                  <div className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5">
                                    {typeof order.shippingAddress === 'object' ? (
                                      <>
                                        <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                                        <p>{order.shippingAddress.street}</p>
                                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                                        <p>{order.shippingAddress.country}</p>
                                      </>
                                    ) : (
                                      <p>{String(order.shippingAddress)}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              {/* Items */}
                              {order.items && order.items.length > 0 && (
                                <div className="col-span-full">
                                  <p className="text-xs text-gray-400 uppercase mb-2">Items ({order.items.length})</p>
                                  <div className="space-y-1">
                                    {order.items.map((item: any, i: number) => (
                                      <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-700 dark:text-gray-300">{item.quantity}x {item.title}</span>
                                        <span className="text-gray-500">${Number(item.price).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="border-t dark:border-gray-600 mt-2 pt-2 space-y-0.5">
                                    <div className="flex justify-between text-xs"><span className="text-gray-400">Subtotal</span><span>${Number(order.subtotal || order.total).toFixed(2)}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-gray-400">Shipping</span><span>${Number(order.shippingCost || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-gray-400">Tax</span><span>${Number(order.tax || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between text-sm font-bold"><span>Total</span><span>${Number(order.total).toFixed(2)} {order.currency}</span></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
