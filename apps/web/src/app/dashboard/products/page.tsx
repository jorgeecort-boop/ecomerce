'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme-toggle';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@ecomerce/utils';

interface Product {
  id: string;
  title: string;
  price: number;
  costPrice: number;
  inventory: number;
  isPublished: boolean;
  imageUrl?: string;
  storeId: string;
  createdAt: string;
}

interface Store {
  id: string;
  name: string;
  slug: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { token, logout } = useAuth();
  const router = useRouter();

  // Load stores first, then products
  useEffect(() => {
    if (!token) return;

    const loadStores = async () => {
      try {
        const res = await fetch(`${API_URL}/stores`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load stores');
        const data = await res.json();
        setStores(data);
        if (data.length > 0) {
          setSelectedStore(data[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadStores();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedStore) return;

    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/products/store/${selectedStore}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [token, selectedStore]);

  const handleDelete = async (productId: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeletingId(productId);
    try {
      const res = await fetch(`${API_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeId: selectedStore }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err: any) {
      alert('Error deleting product: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (product: Product) => {
    setTogglingId(product.id);
    try {
      const endpoint = product.isPublished
        ? `${API_URL}/products/${product.id}/unpublish`
        : `${API_URL}/products/${product.id}/publish`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeId: selectedStore }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const margin = (p: Product) =>
    p.costPrice > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(0) : '—';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Ecomerce</h1>
          </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h2>
          <div className="flex items-center gap-3">
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
            <Link
              href="/dashboard/products/new"
              id="new-product-btn"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              + Add Product
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}

        {stores.length === 0 && !isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center transition-colors">
            <span className="text-4xl mb-4 block">🏪</span>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              No stores yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Create a store first before adding products
            </p>
            <Link
              href="/dashboard/settings"
              className="px-6 py-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create a Store
            </Link>
          </div>
        ) : isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-colors">
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center transition-colors">
            <span className="text-4xl mb-4 block">📦</span>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              No products yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Start adding products to your store
            </p>
            <Link
              href="/dashboard/products/new"
              className="px-6 py-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-colors">
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {products.length} product{products.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    {['Product', 'Price', 'Cost', 'Margin', 'Inventory', 'Status', 'Actions'].map(
                      (col) => (
                        <th
                          key={col}
                          className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col === 'Actions' ? 'text-right' : 'text-left'}`}
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm">📦</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {product.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(product.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-sm">
                        ${Number(product.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-sm">
                        ${Number(product.costPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium ${Number(margin(product)) > 30 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                        >
                          {margin(product)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm ${(product.inventory ?? 0) <= 10 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          {product.inventory ?? '∞'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleTogglePublish(product)}
                          disabled={togglingId === product.id}
                          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                            product.isPublished
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                          } ${togglingId === product.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {togglingId === product.id
                            ? '...'
                            : product.isPublished
                              ? '● Published'
                              : '○ Draft'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/dashboard/products/${product.id}/edit`}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                            className="text-red-500 dark:text-red-400 hover:underline text-sm disabled:opacity-50"
                          >
                            {deletingId === product.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
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
