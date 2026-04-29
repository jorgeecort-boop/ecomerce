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
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  trackingNumber?: string;
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
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const { token, logout } = useAuth();
  const router = useRouter();

  // Load user stores
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setStores(data);
        if (data.length > 0) setSelectedStore(data[0].id);
        else setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [token]);

  // Load orders for selected store
  useEffect(() => {
    if (!token || !selectedStore) return;
    setIsLoading(true);
    fetch(`${API_URL}/orders/store/${selectedStore}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token, selectedStore]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const filteredOrders =
    filterStatus === 'ALL'
      ? orders
      : orders.filter((o) => o.paymentStatus === filterStatus || o.status === filterStatus);

  const allStatuses = [
    'ALL',
    ...Array.from(new Set(orders.map((o) => o.paymentStatus || o.status).filter(Boolean))),
  ];

  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 transition-colors">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Ecomerce</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h2>
            {!isLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {orders.length} total · ${totalRevenue.toFixed(2)} revenue (paid)
              </p>
            )}
          </div>
          {stores.length > 1 && (
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* Status filter pills */}
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
                {s !== 'ALL' && (
                  <span className="ml-1 opacity-70">
                    ({orders.filter((o) => o.paymentStatus === s || o.status === s).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4 transition-colors">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center transition-colors">
            <span className="text-4xl mb-4 block">📋</span>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              {filterStatus === 'ALL' ? 'No orders yet' : `No ${filterStatus} orders`}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {filterStatus === 'ALL'
                ? 'When customers place orders, they will appear here'
                : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    {['Order #', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredOrders.map((order) => (
                    <>
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedOrder(expandedOrder === order.id ? null : order.id)
                        }
                      >
                        <td className="px-6 py-4 font-mono text-xs font-medium text-gray-900 dark:text-white">
                          {order.orderNumber ?? `#${order.id.slice(0, 8).toUpperCase()}`}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {order.customerName ?? '—'}
                          </p>
                          <p className="text-xs text-gray-400">{order.customerEmail}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {order.items?.length ?? '—'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-sm">
                          ${Number(order.total).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs rounded font-medium ${STATUS_COLORS[order.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs rounded font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-xs text-blue-500">
                          {expandedOrder === order.id ? '▲' : '▼'}
                        </td>
                      </tr>
                      {expandedOrder === order.id && (
                        <tr
                          key={`${order.id}-detail`}
                          className="bg-blue-50/30 dark:bg-blue-900/10"
                        >
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-gray-400 uppercase mb-1">Order ID</p>
                                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                                  {order.id}
                                </p>
                              </div>
                              {order.trackingNumber && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase mb-1">Tracking</p>
                                  <p className="font-mono text-xs text-blue-600 dark:text-blue-400">
                                    {order.trackingNumber}
                                  </p>
                                </div>
                              )}
                              {order.items && order.items.length > 0 && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-400 uppercase mb-1">Items</p>
                                  {order.items.map((item: any, i: number) => (
                                    <p key={i} className="text-xs text-gray-700 dark:text-gray-300">
                                      {item.quantity}x {item.title} — $
                                      {Number(item.price).toFixed(2)}
                                    </p>
                                  ))}
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
