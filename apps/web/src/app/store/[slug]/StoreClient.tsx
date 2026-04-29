'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/hooks/useCart';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  images?: any;
  inventory?: number;
  isPublished?: boolean;
}

function getFirstImage(product: Product): string | undefined {
  if (product.imageUrl) return product.imageUrl;
  if (!product.images) return undefined;
  try {
    let imgs = product.images;
    if (typeof imgs === 'string') imgs = JSON.parse(imgs);
    if (Array.isArray(imgs) && imgs.length > 0) {
      let first = imgs[0];
      if (typeof first === 'string' && first.startsWith('[')) first = JSON.parse(first)[0];
      return typeof first === 'string' ? first : undefined;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

interface StoreClientProps {
  store: Store;
  products: Product[];
}

export default function StoreClient({ store, products }: StoreClientProps) {
  const [added, setAdded] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);

  const { cart, addItem, removeItem, updateQuantity, clearCart, cartTotal, cartCount } =
    useCart(store.slug);

  const {
    format,
    currency,
    setCurrency,
    availableCurrencies,
    isLoading: rateLoading,
  } = useCurrency();

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      imageUrl: getFirstImage(product),
    });
    setAdded(product.id);
    setTimeout(() => setAdded(null), 1500);
  };

  const handleRemoveFromCart = (productId: string) => {
    removeItem(productId);
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    updateQuantity(productId, qty);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {store.logoUrl && (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {store.name}
              </h1>
              {store.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate">
                  {store.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 hidden sm:block">Currency:</span>
              <select
                id="currency-selector"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={rateLoading}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 max-w-[80px]"
              >
                {availableCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {rateLoading && <span className="text-xs text-gray-400 animate-pulse">...</span>}
            </div>

            <button
              id="cart-button"
              onClick={() => setShowCart(true)}
              className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>🛒</span>
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {products.length} Products
          </h2>
          {rateLoading && (
            <span className="text-xs text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              🌍 Detecting your currency...
            </span>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-gray-500 dark:text-gray-400">No products available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all group"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  {getFirstImage(product) ? (
                    <img
                      src={getFirstImage(product)}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300 dark:text-gray-600">
                      📦
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-1 line-clamp-2">
                    {product.title}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {rateLoading ? '...' : format(Number(product.price))}
                      </span>
                      {currency !== 'USD' && (
                        <p className="text-xs text-gray-400">
                          ${Number(product.price).toFixed(2)} USD
                        </p>
                      )}
                    </div>
                    <button
                      id={`add-to-cart-${product.id}`}
                      onClick={() => handleAddToCart(product)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        added === product.id
                          ? 'bg-green-500 text-white scale-95'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {added === product.id ? '✓ Added!' : '+ Add'}
                    </button>
                  </div>
                  {(product.inventory ?? 0) > 0 && (product.inventory ?? 0) <= 10 && (
                    <p className="text-xs text-red-400 mt-1">Only {product.inventory} left!</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCart && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCart(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col transition-colors">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Cart ({cartCount})
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">🛒</p>
                  <p className="text-gray-500 dark:text-gray-400">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 items-start">
                      {getFirstImage(item) && (
                        <img
                          src={getFirstImage(item)}
                          alt={item.title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">
                          {format(Number(item.price))}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded border dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="text-sm w-6 text-center text-gray-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded border dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="ml-auto text-xs text-red-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0 text-right">
                        {format(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t dark:border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Total</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {format(cartTotal)}
                  </span>
                </div>
                {currency !== 'USD' && (
                  <p className="text-xs text-gray-400 text-right mb-4">
                    ≈ ${cartTotal.toFixed(2)} USD
                  </p>
                )}
                  <Link
                    href={`/store/${store.slug}/checkout?items=${encodeURIComponent(JSON.stringify(cart))}&currency=${currency}`}
                    id="checkout-btn"
                    className="block w-full py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-medium mt-4"
                  >
                    Proceed to Checkout →
                  </Link>
                <button
                  onClick={() => clearCart()}
                  className="block w-full py-2 mt-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-center"
                >
                  Clear Cart
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
