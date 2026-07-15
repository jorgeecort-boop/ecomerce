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
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isWished, setIsWished] = useState(false);
  const { format } = useCurrency('COP');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`wishlist-${slug}`);
      if (saved) {
        const ids = JSON.parse(saved) as string[];
        setIsWished(ids.includes(product.id));
      }
    } catch {}
  }, [slug, product.id]);

  const toggleWishlist = () => {
    try {
      const key = `wishlist-${slug}`;
      const saved = localStorage.getItem(key);
      let ids: string[] = saved ? JSON.parse(saved) : [];

      if (isWished) {
        ids = ids.filter((id) => id !== product.id);
      } else {
        if (!ids.includes(product.id)) ids.push(product.id);
      }

      localStorage.setItem(key, JSON.stringify(ids));
      setIsWished(!isWished);
    } catch {}
  };

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
            <div
              className="aspect-square bg-gradient-to-br from-blue-900/20 to-black rounded-2xl overflow-hidden border border-blue-500/10 mb-4 relative group cursor-zoom-in"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePos({
                  x: ((e.clientX - rect.left) / rect.width) * 100,
                  y: ((e.clientY - rect.top) / rect.height) * 100,
                });
              }}
            >
              {allImages.length > 0 ? (
                <div className="w-full h-full relative">
                  <Image
                    src={allImages[selectedImage] ?? allImages[0]}
                    alt={product.title}
                    width={600}
                    height={600}
                    className="w-full h-full object-contain p-6 transition-transform duration-200"
                    style={
                      isZoomed
                        ? { transform: 'scale(2)', transformOrigin: `${mousePos.x}% ${mousePos.y}%` }
                        : {}
                    }
                    priority
                    unoptimized
                  />
                </div>
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
                  Ahorras {mounted ? format(Number(product.compareAtPrice!) - Number(product.price)) : `$${(Number(product.compareAtPrice!) - Number(product.price)).toFixed(2)}`}
                </p>
              )}
              <p className="text-xs text-blue-400/40 mt-2 flex items-center gap-1">
                <span>✓</span> Envío gratis en pedidos sobre $200.000
              </p>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">
                  Descripción
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
                onClick={toggleWishlist}
                className={`p-3 rounded-xl border transition-all ${
                  isWished
                    ? 'bg-red-500/20 border-red-500/30 text-red-400'
                    : 'border-blue-500/20 text-blue-400/60 hover:bg-blue-500/10'
                }`}
                title={isWished ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isWished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

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
                    ? '✓ Agregado!'
                    : `Agregar al carrito — ${mounted ? format(Number(product.price) * quantity) : `$${(Number(product.price) * quantity).toFixed(2)}`}`}
              </button>
            </div>

            <a
              href={`https://wa.me/573117313902?text=${encodeURIComponent(`Hola! Me interesa: ${product.title} — ${mounted ? format(Number(product.price)) : `$${product.price}`}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 mb-6 rounded-xl border border-[#25D366]/40 text-[#25D366] text-sm font-medium hover:bg-[#25D366]/10 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Consultar por WhatsApp
            </a>

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
