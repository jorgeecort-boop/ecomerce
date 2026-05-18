'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/hooks/useCart';
import { ProductReviews } from '@/components/features/reviews/ProductReviews';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  imageUrl?: string;
  images?: string[];
  inventory?: number;
  isPublished?: boolean;
  isFeatured?: boolean;
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

interface ProductClientProps {
  product: Product;
  store: Store;
  relatedProducts: Product[];
  slug: string;
}

export default function ProductClient({
  product,
  store,
  relatedProducts,
  slug,
}: ProductClientProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { format } = useCurrency();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { addItem } = useCart(slug);

  const allImages = ([product.imageUrl, ...(product.images ?? [])].filter(Boolean)) as string[];
  const isOutOfStock = (product.inventory ?? 0) === 0;
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100)
    : 0;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        imageUrl: allImages[0] ?? product.imageUrl,
      },
      quantity
    );
    setAddedToCart(true);
    showToast(`✓ ${quantity}x ${product.title} added to cart`);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 z-50 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-2xl text-sm font-medium"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-black/80 backdrop-blur-xl border-b border-blue-500/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-2 text-sm text-blue-400/70 hover:text-blue-400 transition-colors"
          >
            ← {store.name}
          </Link>
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm rounded-lg hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/20"
          >
            🛒 Continue Shopping
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <nav className="flex items-center gap-2 text-xs text-blue-400/30">
          <Link href={`/store/${slug}`} className="hover:text-blue-400 transition-colors">
            {store.name}
          </Link>
          <span>›</span>
          <span className="text-blue-400/60 truncate max-w-[200px]">
            {product.title}
          </span>
        </nav>
      </div>

      {/* Product Layout */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <motion.div {...fadeInUp}>
            {/* Main Image */}
            <div className="aspect-square bg-gradient-to-br from-blue-900/20 to-black rounded-2xl overflow-hidden border border-blue-500/10 mb-4 relative">
              {allImages.length > 0 ? (
                <Image
                  src={allImages[selectedImage] ?? allImages[0]}
                  alt={product.title}
                  width={600}
                  height={600}
                  className="w-full h-full object-contain p-6"
                  priority
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl">
                  ⚡
                </div>
              )}
              {product.isFeatured && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg shadow-lg">
                  ⭐ Destacado
                </span>
              )}
              {hasDiscount && (
                <span className="absolute top-4 right-4 px-3 py-1.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-lg shadow-lg">
                  -{discountPercent}%
                </span>
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
                        ? 'border-blue-500 ring-2 ring-blue-500/30'
                        : 'border-blue-500/10 hover:border-blue-500/30'
                    }`}
                  >
                    <Image src={img} alt="" width={64} height={64} className="w-full h-full object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div className="flex flex-col" {...fadeInUp} transition={{ duration: 0.5, delay: 0.15 }}>
            {/* Category */}
            {product.category && (
              <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full w-fit mb-3 border border-blue-500/20">
                {product.category}
              </span>
            )}

            <h1 className="text-2xl lg:text-3xl font-bold leading-tight mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text">
              {product.title}
            </h1>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  {mounted ? format(Number(product.price)) : `$${Number(product.price).toFixed(2)}`}
                </p>
                {hasDiscount && (
                  <p className="text-lg text-blue-400/30 line-through">
                    {mounted ? format(Number(product.compareAtPrice)) : `$${Number(product.compareAtPrice).toFixed(2)}`}
                  </p>
                )}
              </div>
              {hasDiscount && (
                <p className="text-xs text-green-400 mt-1">
                  You save {mounted ? format(Number(product.compareAtPrice!) - Number(product.price)) : `$${(Number(product.compareAtPrice!) - Number(product.price)).toFixed(2)}`}
                </p>
              )}
              <p className="text-xs text-blue-400/40 mt-2 flex items-center gap-1">
                <span>✓</span> Free shipping on orders over $50
              </p>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">
                  Description
                </h3>
                <p className="text-sm text-blue-400/60 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Stock indicator */}
            <div className="mb-6">
              {isOutOfStock ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-400">Out of stock</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-400">
                    In stock
                    {(product.inventory ?? 0) <= 10 && (
                      <span className="text-amber-400 ml-1">— only {product.inventory} left!</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Quantity + Add to Cart */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-blue-500/20 rounded-xl overflow-hidden bg-blue-500/5">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-4 py-3 text-blue-400 hover:bg-blue-500/10 transition-colors text-sm"
                >
                  −
                </button>
                <span className="px-4 py-3 text-sm font-semibold text-white min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-4 py-3 text-blue-400 hover:bg-blue-500/10 transition-colors text-sm"
                >
                  +
                </button>
              </div>

              <button
                id="add-to-cart"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 py-3 px-6 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                  isOutOfStock
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : addedToCart
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 scale-[0.98]'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/20'
                }`}
              >
                {isOutOfStock
                  ? 'Agotado'
                  : addedToCart
                    ? '✓ Added to Cart!'
                    : `Add to Cart — ${mounted ? format(Number(product.price) * quantity) : `$${(Number(product.price) * quantity).toFixed(2)}`}`}
              </button>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-blue-500/10 text-blue-400/70 px-2 py-1 rounded-lg border border-blue-500/10"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: '🔒', title: 'Secure Payment', sub: 'SSL encrypted' },
                { icon: '🚚', title: 'Fast Shipping', sub: '5-10 business days' },
                { icon: '↩️', title: 'Returns', sub: '30-day policy' },
              ].map((badge) => (
                <div
                  key={badge.title}
                  className="text-center p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl"
                >
                  <p className="text-lg mb-1">{badge.icon}</p>
                  <p className="text-xs font-semibold text-blue-300">
                    {badge.title}
                  </p>
                  <p className="text-xs text-blue-400/40">{badge.sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Product Reviews */}
        <section className="mt-16 border-t border-blue-500/10 pt-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>Customer Reviews</span>
            <span className="text-sm font-normal px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
              New Beta
            </span>
          </h2>
          <ProductReviews productId={product.id} />
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-white mb-6">
              You might also like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((rp) => {
                const rpImages = ([rp.imageUrl, ...(rp.images ?? [])].filter(Boolean)) as string[];
                const rpOutOfStock = (rp.inventory ?? 0) === 0;
                return (
                  <Link
                    key={rp.id}
                    href={`/store/${slug}/${rp.id}`}
                    className="bg-gradient-to-b from-blue-500/5 to-transparent border border-blue-500/10 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all group"
                  >
                    <div className="aspect-square bg-gradient-to-br from-blue-900/20 to-black overflow-hidden">
                      {rpImages[0] ? (
                        <Image
                          src={rpImages[0]}
                          alt={rp.title}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          ⚡
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-white line-clamp-2 mb-1 group-hover:text-blue-400 transition-colors">
                        {rp.title}
                      </p>
                      <p className="text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                        {mounted ? format(Number(rp.price)) : `$${Number(rp.price).toFixed(2)}`}
                      </p>
                      {rpOutOfStock && (
                        <p className="text-[10px] text-red-400 mt-1">Agotado</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-blue-500/10 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-blue-400/30">
          <p>{store.name} — Powered by Ecomerce Platform</p>
        </div>
      </footer>
    </div>
  );
}
