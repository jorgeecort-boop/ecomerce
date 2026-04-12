'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useShopify, SyncOrder, ShopifyStats } from '@/hooks/useShopify';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  FULFILLED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PARTIALLY_FULFILLED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

type Tab = 'overview' | 'orders' | 'products';
type StatusFilter = '' | 'PENDING' | 'FULFILLED' | 'PROCESSING' | 'CANCELLED';

export default function ShopifyDashboardPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    orders: shopifyOrders,
    products: shopifyProducts,
    syncOrders,
    stats,
    loading,
    error,
    lastRefresh,
    clearError,
    fetchOrders,
    fetchProducts,
    fetchSyncOrders,
    fetchStats,
    fulfillOrder,
  } = useShopify(30_000); // Poll every 30 seconds

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchSyncOrders();
  }, [token, fetchStats, fetchSyncOrders]);

  useEffect(() => {
    if (!token) return;
    if (tab === 'orders') fetchOrders();
    if (tab === 'products') fetchProducts();
  }, [tab, token, fetchOrders, fetchProducts]);

  const handleRefresh = () => {
    fetchStats();
    fetchSyncOrders();
    if (tab === 'orders') fetchOrders();
    if (tab === 'products') fetchProducts();
  };

  // Filter sync orders
  const filteredOrders = syncOrders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerEmail || '').toLowerCase().includes(q) ||
        o.shopifyOrderId.includes(q)
      );
    }
    return true;
  });

  const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ||
    process.env.SHOPIFY_STORE_URL ||
    'your-store.myshopify.com';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm">
              ← Dashboard
            </Link>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-green-500">🛍️</span>
              Shopify Integration
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-400">
                Last update: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">⚠️ {error}</p>
            <button onClick={clearError} className="text-red-500 hover:text-red-700 text-sm">✕</button>
          </div>
        </div>
      )}

      {/* Store info */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-green-200/50 dark:border-green-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connected store</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{storeUrl}</p>
            </div>
            <a
              href={`https://${storeUrl}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
            >
              Open Shopify Admin ↗
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          {(['overview', 'orders', 'products'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm rounded-lg capitalize transition-all ${
                tab === t
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Overview Tab ──────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Orders', value: stats?.totalOrders ?? 0, icon: '📦', color: 'blue' },
                { label: 'Pending', value: stats?.pendingOrders ?? 0, icon: '⏳', color: 'yellow' },
                { label: 'Fulfilled', value: stats?.fulfilledOrders ?? 0, icon: '✅', color: 'green' },
                {
                  label: 'Revenue',
                  value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`,
                  icon: '💰',
                  color: 'purple',
                },
                {
                  label: 'Fulfillment Rate',
                  value: `${stats?.fulfillmentRate ?? 0}%`,
                  icon: '📊',
                  color: 'cyan',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{card.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Recent synced orders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Recent Synced Orders</h3>
                <span className="text-xs text-gray-400">{syncOrders.length} total</span>
              </div>

              {syncOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="text-sm">No synced orders yet. Orders will appear here when Shopify sends webhooks.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Order #</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Customer</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Amount</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Supplier Orders</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Tracking</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {syncOrders.slice(0, 10).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">
                            #{order.orderNumber}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {order.customerEmail || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            ${Number(order.totalAmount).toFixed(2)} {order.currency}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {order.supplierOrderIds.length > 0
                              ? `${order.supplierOrderIds.length} order(s)`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {order.trackingNumbers.length > 0 ? (
                              <span className="text-green-600 dark:text-green-400">
                                {order.trackingNumbers.join(', ')}
                              </span>
                            ) : (
                              <span className="text-gray-400">No tracking</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
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
        )}

        {/* ── Orders Tab ──────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="FULFILLED">Fulfilled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <span className="text-xs text-gray-400 ml-auto">
                Showing {filteredOrders.length} of {syncOrders.length}
              </span>
            </div>

            {/* Orders table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Order #</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Customer</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Supplier</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Tracking</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        {searchQuery || statusFilter ? 'No orders match your filters' : 'No orders synced yet'}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-mono text-xs">#{order.orderNumber}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{order.customerEmail || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || ''}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">${Number(order.totalAmount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs">
                          {order.supplierOrderIds.length > 0
                            ? <span className="text-blue-600">{order.supplierOrderIds.length} linked</span>
                            : <span className="text-gray-400">None</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {order.trackingNumbers.length > 0 ? (
                            <span className="text-green-600">{order.trackingNumbers[0]}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Shopify live orders */}
            {shopifyOrders.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Shopify Live Orders ({shopifyOrders.length})
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Direct from Shopify API — may include orders not yet processed by webhooks
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">#</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Customer</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Financial</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Fulfillment</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Total</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Items</th>
                        <th className="px-4 py-3 text-left text-gray-500 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {shopifyOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-mono text-xs">#{order.order_number}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{order.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              order.financial_status === 'paid'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {order.financial_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {order.fulfillment_status || 'unfulfilled'}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {order.currency} {order.total_price}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {order.line_items?.length || 0} items
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Products Tab ──────────────────────────────────────────────── */}
        {tab === 'products' && (
          <div>
            {shopifyProducts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm">
                <p className="text-3xl mb-3">🏪</p>
                <p className="text-gray-500 dark:text-gray-400">
                  {loading ? 'Loading products from Shopify...' : 'No products found in your Shopify store'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {shopifyProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    {product.images?.[0]?.src ? (
                      <img
                        src={product.images[0].src}
                        alt={product.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-3xl text-gray-300">
                        📦
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 mb-2">
                        {product.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          ${product.variants?.[0]?.price ?? '0.00'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {product.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {product.variants?.length ?? 0} variants · Updated{' '}
                        {new Date(product.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
