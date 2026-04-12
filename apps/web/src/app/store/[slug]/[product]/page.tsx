'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useCurrency } from '@/hooks/useCurrency';
import { ProductReviews } from '@/components/features/reviews/ProductReviews';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  costPrice?: number;
  imageUrl?: string;
  images?: string[];
  inventory?: number;
  isPublished?: boolean;
  category?: string;
  tags?: string[];
  createdAt?: string;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}) {
  const { slug, product: productId } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const { format, currency } = useCurrency();

  useEffect(() => {
    const load = async () => {
      try {
        // Load store info
        const storeRes = await fetch(`${API_URL}/stores/slug/${slug}`);
        if (!storeRes.ok) throw new Error('Store not found');
        const storeData = await storeRes.json();
        setStore(storeData);

        // Load product details
        const productRes = await fetch(`${API_URL}/products/${productId}`);
        if (!productRes.ok) throw new Error('Product not found');
        const productData = await productRes.json();
        setProduct(productData);

        // Load related products from same store
        const relatedRes = await fetch(
          `${API_URL}/products/store/${storeData.id}/public?limit=4`
        );
        if (relatedRes.ok) {
          const relatedData = await relatedRes.json();
          setRelatedProducts(
            (Array.isArray(relatedData) ? relatedData : []).filter(
              (p: Product) => p.id !== productId
            ).slice(0, 4)
          );
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [slug, productId]);

  const handleAddToCart = () => {
    if (!product) return;
    // Read existing cart from sessionStorage
    const existing = JSON.parse(
      sessionStorage.getItem(`cart_${slug}`) || '[]'
    );
    const idx = existing.findIndex((i: any) => i.id === product.id);
    if (idx >= 0) {
      existing[idx].quantity += quantity;
    } else {
      existing.push({
        id: product.id,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity,
      });
    }
    sessionStorage.setItem(`cart_${slug}`, JSON.stringify(existing));
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const allImages = product
    ? [
        product.imageUrl,
        ...(product.images ?? []),
      ].filter(Boolean) as string[]
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !product || !store) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-6xl mb-4">📦</p>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Product not found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Link
            href={`/store/${slug}`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            ← {store.name}
          </Link>
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            🛒 Continue Shopping
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <nav className="flex items-center gap-2 text-xs text-gray-400">
          <Link href={`/store/${slug}`} className="hover:text-blue-500 transition-colors">
            {store.name}
          </Link>
          <span>›</span>
          <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
            {product.title}
          </span>
        </nav>
      </div>

      {/* Product Layout */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            {/* Main Image */}
            <div className="aspect-square bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm mb-3">
              {allImages.length > 0 ? (
                <img
                  src={allImages[selectedImage] ?? allImages[0]}
                  alt={product.title}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300 dark:text-gray-600">
                  📦
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      selectedImage === i
                        ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Category / Tags */}
            {product.category && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full w-fit mb-3">
                {product.category}
              </span>
            )}

            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
              {product.title}
            </h1>

            {/* Price */}
            <div className="mb-6">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {format(Number(product.price))}
              </p>
              {currency !== 'USD' && (
                <p className="text-sm text-gray-400 mt-1">
                  ≈ ${Number(product.price).toFixed(2)} USD
                </p>
              )}
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <span>✓</span> Free shipping on orders over $50
              </p>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Description
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Stock indicator */}
            <div className="mb-6">
              {(product.inventory ?? 0) > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    In stock
                    {(product.inventory ?? 0) <= 10 && (
                      <span className="text-orange-500 ml-1">
                        — only {product.inventory} left!
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-sm text-gray-500">Stock info unavailable</span>
                </div>
              )}
            </div>

            {/* Quantity + Add to Cart */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  −
                </button>
                <span className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  +
                </button>
              </div>

              <button
                id="add-to-cart"
                onClick={handleAddToCart}
                className={`flex-1 py-3 px-6 rounded-xl font-medium text-sm transition-all ${
                  addedToCart
                    ? 'bg-green-500 text-white scale-[0.98]'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {addedToCart ? '✓ Added to Cart!' : `Add to Cart — ${format(Number(product.price) * quantity)}`}
              </button>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { icon: '🔒', title: 'Secure Payment', sub: 'SSL encrypted' },
                { icon: '🚚', title: 'Fast Shipping', sub: '5-10 business days' },
                { icon: '↩️', title: 'Returns', sub: '30-day policy' },
              ].map((badge) => (
                <div
                  key={badge.title}
                  className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                >
                  <p className="text-lg mb-1">{badge.icon}</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {badge.title}
                  </p>
                  <p className="text-xs text-gray-400">{badge.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Reviews */}
        <section className="mt-16 border-t dark:border-gray-800 pt-16">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span>Customer Reviews</span>
            <span className="text-sm font-normal px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">New Beta</span>
          </h2>
          <ProductReviews productId={product.id} />
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              You might also like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/store/${slug}/${rp.id}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all group"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {rp.imageUrl ? (
                      <img
                        src={rp.imageUrl}
                        alt={rp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                      {rp.title}
                    </p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {format(Number(rp.price))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t dark:border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-400">
          <p>{store.name} — Powered by Ecomerce Platform</p>
        </div>
      </footer>
    </div>
  );
}
