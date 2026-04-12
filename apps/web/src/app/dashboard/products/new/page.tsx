'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Store {
  id: string;
  name: string;
  slug: string;
}

interface ProductForm {
  title: string;
  description: string;
  price: string;
  costPrice: string;
  inventory: string;
  imageUrl: string;
  storeId: string;
}

export default function NewProductPage() {
  const [form, setForm] = useState<ProductForm>({
    title: '',
    description: '',
    price: '',
    costPrice: '',
    inventory: '',
    imageUrl: '',
    storeId: '',
  });
  const [stores, setStores] = useState<Store[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setStores(data);
        if (data.length > 0) setForm((f) => ({ ...f, storeId: data[0].id }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingStores(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeId) { setError('Please select a store'); return; }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          price: Number(form.price),
          costPrice: Number(form.costPrice) || 0,
          inventory: Number(form.inventory) || 0,
          imageUrl: form.imageUrl || undefined,
          storeId: form.storeId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create product');
      }

      setSuccess(true);
      setTimeout(() => router.push('/dashboard/products'), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const margin =
    form.price && form.costPrice && Number(form.price) > 0
      ? (((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Ecomerce</h1>
          <Link href="/dashboard/products" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Products
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Add New Product</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Add a product to your store. You can publish it when ready.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-400">
            ✅ Product created! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-5 transition-colors">

          {/* Store selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Store *
            </label>
            {loadingStores ? (
              <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ) : stores.length === 0 ? (
              <p className="text-sm text-red-500">
                No stores found.{' '}
                <Link href="/dashboard/settings" className="underline">Create one first</Link>
              </p>
            ) : (
              <select
                required
                value={form.storeId}
                onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Wireless Bluetooth Earbuds"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your product..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sale Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="29.99"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                placeholder="8.50"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Live margin calculator */}
          {margin !== null && (
            <div className={`p-3 rounded-lg text-sm ${Number(margin) > 30 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'}`}>
              💡 Margin: <strong>{margin}%</strong>
              {' '}— Profit per sale: <strong>${(Number(form.price) - Number(form.costPrice)).toFixed(2)}</strong>
              {Number(margin) < 20 && ' ⚠️ Low margin'}
            </div>
          )}

          {/* Inventory & Image */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Inventory
              </label>
              <input
                type="number"
                min="0"
                value={form.inventory}
                onChange={(e) => setForm({ ...form, inventory: e.target.value })}
                placeholder="100"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Image preview */}
          {form.imageUrl && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
              <img
                src={form.imageUrl}
                alt="Preview"
                className="w-24 h-24 object-cover rounded-lg border dark:border-gray-600"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t dark:border-gray-700">
            <button
              type="submit"
              id="create-product-submit"
              disabled={isSubmitting || success || stores.length === 0}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </button>
            <Link
              href="/dashboard/products"
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
