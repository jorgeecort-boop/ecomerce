'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme-toggle';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@ecomerce/utils';

interface DashboardStats {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalStores: number;
  };
  revenueByDay: { date: string; revenue: number }[];
  topProducts: { id: string; title: string; orders: number; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  recentOrders: any[];
  lowStockProducts: { id: string; title: string; inventory: number }[];
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await api.dashboard.getStats(token!);
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const statCards = stats
    ? [
        {
          label: 'Total Revenue',
          value: `$${stats.overview.totalRevenue.toFixed(2)}`,
          sub: `${stats.overview.totalOrders} orders`,
          icon: '💰',
          color: 'text-green-600 dark:text-green-400',
        },
        {
          label: 'Total Orders',
          value: stats.overview.totalOrders.toString(),
          sub: 'All time',
          icon: '📋',
          color: 'text-blue-600 dark:text-blue-400',
        },
        {
          label: 'Products',
          value: stats.overview.totalProducts.toString(),
          sub: `In ${stats.overview.totalStores} store(s)`,
          icon: '📦',
          color: 'text-purple-600 dark:text-purple-400',
        },
        {
          label: 'Stores',
          value: stats.overview.totalStores.toString(),
          sub: 'Active',
          icon: '🏪',
          color: 'text-orange-600 dark:text-orange-400',
        },
      ]
    : [
        { label: 'Total Revenue', value: '—', sub: '', icon: '💰', color: 'text-green-600' },
        { label: 'Total Orders', value: '—', sub: '', icon: '📋', color: 'text-blue-600' },
        { label: 'Products', value: '—', sub: '', icon: '📦', color: 'text-purple-600' },
        { label: 'Stores', value: '—', sub: '', icon: '🏪', color: 'text-orange-600' },
      ];

  const navLinks = [
    {
      href: '/dashboard',
      label: 'Overview',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      href: '/dashboard/products',
      label: 'Products',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    },
    {
      href: '/dashboard/orders',
      label: 'Orders',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    },
    {
      href: '/dashboard/suppliers',
      label: 'Suppliers',
      icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    },
    {
      href: '/dashboard/shopify',
      label: 'Shopify',
      icon: 'M9 3v2m0-2h6m0 0v2m-6 2H9m0 0V3m6 0h6M9 17v2m0-2h6m0 0v2m-6-2H9m0 0v-2m6 2h6',
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ];

  const statusColor: Record<string, string> = {
    PAID: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    SHIPPED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    DELIVERED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              id="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Ecomerce</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
              {user?.email ?? '...'}
            </span>
            <ThemeToggle />
            <button
              id="logout-button"
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Dashboard</h2>
            {user && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{user.email}</p>
            )}
          </div>
          <nav className="p-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={link.icon}
                  />
                </svg>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Overlay para cerrar sidebar en mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0 p-6 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
            {isLoading && (
              <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                Loading data...
              </span>
            )}
            {error && <span className="text-sm text-red-500 dark:text-red-400">⚠️ {error}</span>}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <p
                  className={`text-3xl font-bold ${card.color} ${isLoading ? 'animate-pulse' : ''}`}
                >
                  {isLoading ? '—' : card.value}
                </p>
                {card.sub && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* Revenue by Day + Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Revenue by Day mini-chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm transition-colors">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Revenue (Last 7 Days)
              </h3>
              {stats?.revenueByDay && stats.revenueByDay.length > 0 ? (
                <div className="flex items-end gap-2 h-24">
                  {stats.revenueByDay.map((day) => {
                    const maxRev = Math.max(...stats.revenueByDay.map((d) => d.revenue), 1);
                    const heightPct = (day.revenue / maxRev) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-blue-500 dark:bg-blue-400 rounded-t transition-all"
                          style={{ height: `${Math.max(heightPct, 2)}%` }}
                          title={`$${day.revenue.toFixed(2)}`}
                        />
                        <span className="text-xs text-gray-400 truncate w-full text-center">
                          {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                  {isLoading ? 'Loading...' : 'No revenue data yet'}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm transition-colors">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/products/new"
                  id="add-product-btn"
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                >
                  + Add Product
                </Link>
                <Link
                  href="/dashboard/orders"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  View Orders
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Settings
                </Link>
              </div>

              {/* Low stock alert */}
              {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                    ⚠️ Low Stock Alert
                  </p>
                  {stats.lowStockProducts.map((p) => (
                    <p key={p.id} className="text-xs text-yellow-600 dark:text-yellow-300">
                      {p.title} — {p.inventory} left
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Orders by Status */}
          {stats?.ordersByStatus && stats.ordersByStatus.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-8 transition-colors">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Orders by Status
              </h3>
              <div className="flex flex-wrap gap-3">
                {stats.ordersByStatus.map((s) => (
                  <div
                    key={s.status}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${statusColor[s.status] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {s.status} • {s.count}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors">
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Orders
                </h3>
                <Link
                  href="/dashboard/orders"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : !stats?.recentOrders || stats.recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No orders yet</p>
                  <Link
                    href="/dashboard/products"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Add products to your store to start selling
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700">
                        <th className="pb-3 pr-4">Order #</th>
                        <th className="pb-3 pr-4">Customer</th>
                        <th className="pb-3 pr-4">Total</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {stats.recentOrders.map((order: any) => (
                        <tr key={order.id} className="dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                            {order.orderNumber ?? order.id?.slice(0, 8)}
                          </td>
                          <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                            {order.customerName ?? order.customerEmail ?? '—'}
                          </td>
                          <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                            ${Number(order.total ?? 0).toFixed(2)}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${statusColor[order.paymentStatus] ?? statusColor[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                            >
                              {order.paymentStatus ?? order.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          {stats?.topProducts && stats.topProducts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mt-8 transition-colors">
              <div className="p-6 border-b dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Top Products
                </h3>
              </div>
              <div className="p-6 space-y-3">
                {stats.topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-5">#{i + 1}</span>
                      <span className="text-sm text-gray-900 dark:text-white">{p.title}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        ${p.revenue.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">({p.orders} sales)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
