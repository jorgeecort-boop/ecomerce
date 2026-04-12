'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme-toggle';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Store {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  domain?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { products: number; orders: number };
}

interface StoreForm {
  name: string;
  slug: string;
  logoUrl: string;
  domain: string;
}

const DEFAULT_FORM: StoreForm = { name: '', slug: '', logoUrl: '', domain: '' };

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function SettingsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form, setForm] = useState<StoreForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { theme } = useTheme();
  const { token, user, logout } = useAuth();
  const router = useRouter();

  const loadStores = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/stores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load stores');
      const data = await res.json();
      setStores(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadStores(); }, [loadStores]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      // Only auto-slug if slug was not manually edited
      slug: f.slug === slugify(f.name) || f.slug === '' ? slugify(name) : f.slug,
    }));
  };

  const openCreateForm = () => {
    setForm(DEFAULT_FORM);
    setEditingStore(null);
    setShowCreateForm(true);
    setSaveSuccess(false);
  };

  const openEditForm = (store: Store) => {
    setForm({
      name: store.name,
      slug: store.slug,
      logoUrl: store.logoUrl ?? '',
      domain: store.domain ?? '',
    });
    setEditingStore(store);
    setShowCreateForm(true);
    setSaveSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        logoUrl: form.logoUrl || undefined,
        domain: form.domain || undefined,
      };

      let res: Response;
      if (editingStore) {
        res = await fetch(`${API_URL}/stores/${editingStore.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_URL}/stores`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save store');
      }

      setSaveSuccess(true);
      await loadStores();
      setTimeout(() => {
        setShowCreateForm(false);
        setSaveSuccess(false);
        setEditingStore(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (storeId: string) => {
    if (!confirm('Delete this store? All products and orders will be deactivated.')) return;
    if (!token) return;
    setDeletingId(storeId);
    try {
      const res = await fetch(`${API_URL}/stores/${storeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete store');
      setStores((prev) => prev.filter((s) => s.id !== storeId));
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Ecomerce</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
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

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>

        {/* ─── STORES SECTION ─── */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Stores</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create and manage your dropshipping stores
              </p>
            </div>
            <button
              id="create-store-btn"
              onClick={openCreateForm}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Store
            </button>
          </div>

          {/* Global error */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Create / Edit Form */}
          {showCreateForm && (
            <div className="mx-6 my-4 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                {editingStore ? `Editing: ${editingStore.name}` : 'Create New Store'}
              </h4>

              {saveSuccess && (
                <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-400">
                  ✅ {editingStore ? 'Store updated!' : 'Store created!'} Closing...
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="My Dropship Store"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL Slug *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">/store/</span>
                      <input
                        type="text"
                        required
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                        placeholder="my-store"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-14 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={form.logoUrl}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Custom domain */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Custom Domain
                    </label>
                    <input
                      type="text"
                      value={form.domain}
                      onChange={(e) => setForm({ ...form, domain: e.target.value })}
                      placeholder="mystore.com"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Preview */}
                {form.slug && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    🔗 Public URL: <span className="font-mono text-blue-600 dark:text-blue-400">/store/{form.slug}</span>
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    id={editingStore ? 'update-store-submit' : 'create-store-submit'}
                    disabled={isSaving || saveSuccess}
                    className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : editingStore ? 'Update Store' : 'Create Store'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateForm(false); setEditingStore(null); setError(null); }}
                    className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Store List */}
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">🏪</p>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">No stores yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Create your first store to start adding products
                </p>
                <button
                  onClick={openCreateForm}
                  className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Store
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {store.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{store.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                            /store/{store.slug}
                          </span>
                          {store._count && (
                            <span className="text-xs text-gray-400">
                              {store._count.products} products · {store._count.orders} orders
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/store/${store.slug}`}
                        target="_blank"
                        className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        View ↗
                      </Link>
                      <button
                        onClick={() => openEditForm(store)}
                        className="px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(store.id)}
                        disabled={deletingId === store.id}
                        className="px-3 py-1.5 text-xs text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        {deletingId === store.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── ACCOUNT SECTION ─── */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Account</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Logged in · ID: {user?.id?.slice(0, 8)}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </section>

        {/* ─── APPEARANCE SECTION ─── */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Appearance</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Currently: {theme === 'light' ? '☀️ Light' : '🌙 Dark'}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* ─── INTEGRATIONS SECTION ─── */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Integrations</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Connect third-party services</p>

          <div className="space-y-3">
            {[
              { icon: '💳', name: 'Stripe', desc: 'Payment processing', status: 'configured', statusText: 'Configured', color: 'green' },
              { icon: '📦', name: 'CJ Dropshipping', desc: 'Product sourcing & fulfillment', status: 'pending', statusText: 'Not connected', color: 'gray' },
              { icon: '🖼️', name: 'Cloudinary', desc: 'Image hosting & optimization', status: 'pending', statusText: 'Not connected', color: 'gray' },
              { icon: '📧', name: 'Sendgrid', desc: 'Transactional email', status: 'pending', statusText: 'Not connected', color: 'gray' },
            ].map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-xl">
                    {integration.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{integration.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{integration.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    integration.status === 'configured'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {integration.statusText}
                  </span>
                  {integration.status === 'pending' && (
                    <Link
                      href="/dashboard/settings"
                      className="px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      Connect
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
