'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@ecomerce/utils';

interface StoreOption {
  id: string;
  name: string;
}

interface SupplierProduct {
  externalId: string;
  title: string;
  price: number;
  costPrice?: number;
  imageUrl?: string;
  images?: string[];
  supplier?: string;
}

function unwrapApiData<T>(json: any): T {
  return (json?.data ?? json) as T;
}

export default function SuppliersPage() {
  const { token } = useAuth();
  const [provider, setProvider] = useState('aliexpress');
  const [query, setQuery] = useState('');
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [results, setResults] = useState<SupplierProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchStores = async () => {
      try {
        const response = await fetch(`${API_URL}/stores`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to load stores');
        }

        const json = await response.json();
        const data = unwrapApiData<StoreOption[]>(json);
        setStores(data);
        setStoreId((current) => current || data[0]?.id || '');
      } catch (err: any) {
        setError(err.message || 'Failed to load stores');
      }
    };

    fetchStores();
  }, [token]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!query.trim()) {
      setError('Please enter a keyword');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setResults([]);

    try {
      const response = await fetch(
        `${API_URL}/suppliers/search/${provider}?query=${encodeURIComponent(query)}&limit=12`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search products');
      }

      const json = await response.json();
      const data = unwrapApiData<{ products?: SupplierProduct[] }>(json);
      const products = data.products || [];
      setResults(products);

      if (products.length === 0) {
        setError('No products found for this keyword');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with supplier API');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (product: SupplierProduct) => {
    if (!storeId) {
      setError('You must have a store to import products');
      return;
    }

    setImportingId(product.externalId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/suppliers/import/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalIds: [product.externalId],
          storeId,
          markup: 1.5,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import product');
      }

      await response.json().catch(() => null);
      setSuccess(`${product.title.substring(0, 30)}... imported successfully`);
    } catch (err: any) {
      setError(err.message || 'Error importing product');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Find Products on Alibaba & More
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Search products directly from suppliers and import them to your store with one click.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/4">
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="aliexpress">AliExpress</option>
              <option value="cjdropshipping">CJ Dropshipping</option>
            </select>
          </div>

          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for products, for example Smartwatch or Phone Case"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <svg
              className="w-5 h-5 absolute left-3 top-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="md:w-32 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-70"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </form>

        {stores.length > 1 && (
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Import to Store:
            </label>
            <select
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800 text-sm">
          Warning: {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-lg border border-green-200 dark:border-green-800 text-sm">
          Success: {success}
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {results.map((product) => {
            const imageUrl = product.imageUrl || product.images?.[0];
            const supplierCost = Number(product.costPrice ?? product.price);
            const retailPrice = Number(product.price || supplierCost * 1.5);

            return (
              <div
                key={product.externalId}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col group"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                      No image
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded capitalize">
                    {product.supplier || provider}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3
                    className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 mb-2"
                    title={product.title}
                  >
                    {product.title}
                  </h3>

                  <div className="mt-auto flex items-end justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        Supplier Cost
                      </p>
                      <p className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        ${supplierCost.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        Sugg. Retail
                      </p>
                      <p className="font-medium text-sm text-green-600 dark:text-green-400">
                        ${retailPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleImport(product)}
                    disabled={importingId === product.externalId || !storeId}
                    className="w-full py-2.5 bg-gray-100 hover:bg-blue-50 text-gray-800 hover:text-blue-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {importingId === product.externalId ? (
                      <>
                        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />{' '}
                        Importing...
                      </>
                    ) : (
                      'Import to Catalog'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
