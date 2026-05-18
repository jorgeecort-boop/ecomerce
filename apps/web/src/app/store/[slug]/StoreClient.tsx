'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/hooks/useCart';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  images?: any;
  inventory?: number;
  isPublished?: boolean;
  isFeatured?: boolean;
  category?: string;
  tags?: string[];
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
  } catch {}
  return undefined;
}

function getSecondImage(product: Product): string | undefined {
  if (!product.images) return undefined;
  try {
    let imgs = product.images;
    if (typeof imgs === 'string') imgs = JSON.parse(imgs);
    if (Array.isArray(imgs) && imgs.length > 1) {
      let second = imgs[1];
      if (typeof second === 'string' && second.startsWith('[')) second = JSON.parse(second)[0];
      return typeof second === 'string' ? second : undefined;
    }
  } catch {}
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

const CATEGORIES = ['All', 'Audio', 'Gaming', 'Streaming', 'Wearables', 'Accesorios', 'Baterias'];
const PAGE_SIZE = 12;

// Wishlist hook using localStorage
function useWishlist(slug: string) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const storageKey = `wishlist_${slug}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try { setWishlist(JSON.parse(stored)); } catch { setWishlist([]); }
    }
  }, [storageKey]);

  const toggle = useCallback((productId: string) => {
    setWishlist((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const isWished = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  return { wishlist, toggle, isWished, count: wishlist.length };
}

// Toast notification system
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

let toastId = 0;

// Product card component
function ProductCard({ product, index, storeSlug, isAdded, isWished, currency, rateLoading, format, onAddToCart, onToggleWishlist, onQuickView }: {
  product: Product;
  index: number;
  storeSlug: string;
  isAdded: boolean;
  isWished: boolean;
  currency: string;
  rateLoading: boolean;
  format: (amount: number) => string;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  onQuickView: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isOutOfStock = (product.inventory ?? 0) === 0;
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100)
    : 0;
  const firstImg = getFirstImage(product);
  const secondImg = getSecondImage(product);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: (index % 12) * 0.05 }}
      className={`group relative bg-gradient-to-b from-blue-500/5 to-transparent border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 ${
        isOutOfStock
          ? 'border-blue-500/5 opacity-60'
          : 'border-blue-500/10 hover:border-blue-500/30'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-square bg-gradient-to-br from-blue-900/20 to-black overflow-hidden">
        {firstImg ? (
          <>
            <Image
              src={firstImg}
              alt={product.title}
              width={400}
              height={400}
              className={`w-full h-full object-cover transition-transform duration-500 ${isHovered && secondImg ? 'opacity-0 scale-110' : 'scale-100'}`}
              unoptimized
            />
            {secondImg && (
              <Image
                src={secondImg}
                alt={`${product.title} - vista 2`}
                width={400}
                height={400}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                unoptimized
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">⚡</div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isFeatured && (
            <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-lg shadow-lg">
              ⭐ Destacado
            </span>
          )}
          {hasDiscount && (
            <span className="px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-lg shadow-lg">
              -{discountPercent}%
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2 py-1 bg-gray-800/90 backdrop-blur text-gray-300 text-[10px] font-bold rounded-lg">
              Agotado
            </span>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 gap-2">
          <button
            onClick={(e) => { e.preventDefault(); onQuickView(); }}
            className="px-4 py-2 bg-white/90 text-slate-900 rounded-lg text-xs font-bold hover:bg-white transition-colors active:scale-95"
          >
            👁️ Vista rápida
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onToggleWishlist(); }}
            className={`p-2 rounded-lg transition-colors active:scale-95 ${
              isWished
                ? 'bg-pink-500 text-white'
                : 'bg-white/90 text-slate-900 hover:bg-white'
            }`}
          >
            <svg className="w-4 h-4" fill={isWished ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {product.category && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {product.category}
            </span>
          )}
        </div>
        <Link href={`/store/${storeSlug}/${product.id}`}>
          <h3 className="font-semibold text-white text-sm leading-tight mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
            {product.title}
          </h3>
        </Link>
        <p className="text-xs text-blue-400/40 mb-3 line-clamp-1">
          {product.description || 'Tech Gadget'}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {rateLoading ? '...' : format(Number(product.price))}
            </span>
            {hasDiscount && (
              <p className="text-[10px] text-blue-400/30 line-through">
                {rateLoading ? '' : format(Number(product.compareAtPrice))}
              </p>
            )}
            {currency !== 'USD' && !hasDiscount && (
              <p className="text-[10px] text-blue-400/30">
                ${Number(product.price).toFixed(2)} USD
              </p>
            )}
          </div>
          <button
            onClick={() => !isOutOfStock && onAddToCart()}
            disabled={isOutOfStock}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${
              isOutOfStock
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : isAdded
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/20'
            }`}
          >
            {isOutOfStock ? 'Agotado' : isAdded ? '✓ Added' : '+ Add'}
          </button>
        </div>
        {!isOutOfStock && (product.inventory ?? 0) > 0 && (product.inventory ?? 0) <= 10 && (
          <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Only {product.inventory} left
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function StoreClient({ store, products }: StoreClientProps) {
  const [added, setAdded] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewQty, setQuickViewQty] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { cart, addItem, removeItem, updateQuantity, clearCart, cartTotal, cartCount } =
    useCart(store.slug);

  const { format, currency, setCurrency, availableCurrencies, isLoading: rateLoading } =
    useCurrency();

  const { wishlist, toggle: toggleWishlist, isWished, count: wishlistCount } = useWishlist(store.slug);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when modal/drawer open
  useEffect(() => {
    if (showCart || quickViewProduct || showWishlist) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [showCart, quickViewProduct, showWishlist]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success', action?: Toast['action']) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, action }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const handleAddToCart = (product: Product, qty = 1) => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      imageUrl: getFirstImage(product),
    }, qty);
    setAdded(product.id);
    setTimeout(() => setAdded(null), 1500);
    addToast(`"${product.title}" agregado al carrito`, 'success', {
      label: 'Ver carrito',
      onClick: () => setShowCart(true),
    });
  };

  const handleQuickViewAddToCart = () => {
    if (quickViewProduct) {
      handleAddToCart(quickViewProduct, quickViewQty);
      setQuickViewProduct(null);
      setQuickViewQty(1);
    }
  };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setNewsletterEmail('');
      addToast('¡Gracias por suscribirte! 🎉', 'success');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Filter, search, sort
  const processedProducts = useMemo(() => {
    let result = [...products];

    if (activeCategory !== 'All') {
      result = result.filter((p) => {
        const cat = p.category || '';
        return cat.toLowerCase().includes(activeCategory.toLowerCase()) ||
          (activeCategory === 'Audio' && (cat.includes('Audio') || p.title.toLowerCase().includes('audifonos') || p.title.toLowerCase().includes('bluetooth'))) ||
          (activeCategory === 'Gaming' && (cat.includes('Gaming') || p.title.toLowerCase().includes('gamer') || p.title.toLowerCase().includes('mouse'))) ||
          (activeCategory === 'Streaming' && (cat.includes('Streaming') || p.title.toLowerCase().includes('streaming') || p.title.toLowerCase().includes('webcam') || p.title.toLowerCase().includes('ring'))) ||
          (activeCategory === 'Wearables' && (cat.includes('Wearable') || p.title.toLowerCase().includes('smartwatch'))) ||
          (activeCategory === 'Accesorios' && (cat.includes('Accesorio') || p.title.toLowerCase().includes('soporte') || p.title.toLowerCase().includes('hub') || p.title.toLowerCase().includes('cargador'))) ||
          (activeCategory === 'Baterias' && (cat.includes('Bateria') || p.title.toLowerCase().includes('power') || p.title.toLowerCase().includes('bateria')));
      });
    }

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'name-asc': result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'featured': default: result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)); break;
    }

    return result;
  }, [products, activeCategory, debouncedQuery, sortBy]);

  const paginatedProducts = processedProducts.slice(0, visibleCount);
  const hasMore = visibleCount < processedProducts.length;

  const loadMore = useCallback(() => setVisibleCount((prev) => prev + PAGE_SIZE), []);

  const resetFilters = useCallback(() => {
    setActiveCategory('All');
    setSearchQuery('');
    setSortBy('featured');
    setVisibleCount(PAGE_SIZE);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ─── SCROLL PROGRESS BAR ───────────────────────── */}
      <ScrollProgressBar />

      {/* ─── NAV ─────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-blue-900/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-black font-bold text-sm">
              {store.name?.[0] || 'S'}
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                {store.name || 'SarahBits'}
              </h1>
              <p className="text-[10px] text-blue-400/60 tracking-widest uppercase">
                {store.description?.slice(0, 40) || 'Tech Gadgets'}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={rateLoading}
              className="text-xs bg-black border border-blue-900/50 rounded-lg px-2 py-1.5 text-blue-300 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {availableCurrencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Wishlist button */}
            <button
              onClick={() => setShowWishlist(true)}
              className="relative p-2 text-blue-300 hover:text-pink-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart button */}
            <button
              onClick={() => setShowCart(true)}
              className="relative px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm rounded-lg hover:from-blue-500 hover:to-cyan-400 transition-all font-medium active:scale-95"
            >
              🛒 Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.1),transparent_40%)]" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

        <motion.div
          className="max-w-7xl mx-auto relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-400 text-xs mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Envío gratis en pedidos +$50
            </motion.div>
            <motion.h2
              className="text-4xl md:text-6xl font-bold mb-4 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent">
                Innovación en tu alcance
              </span>
            </motion.h2>
            <motion.p
              className="text-blue-300/60 text-lg mb-8 max-w-xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Descubre los gadgets más innovadores. Audio premium, gaming gear, wearables y accesorios que potencian tu setup.
            </motion.p>
            <motion.div
              className="flex items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link
                href="#products"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
              >
                Explorar Productos
              </Link>
              <Link
                href={`/store/${store.slug}/checkout`}
                className="px-6 py-3 border border-blue-500/30 text-blue-300 rounded-xl font-medium hover:bg-blue-500/10 transition-all active:scale-95"
              >
                Ofertas
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {[
              { value: products.length + '+', label: 'Productos' },
              { value: '24/7', label: 'Soporte' },
              { value: '2-5 días', label: 'Envío' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-xs text-blue-400/50 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ─── CATEGORIES ──────────────────────────────────── */}
      <section className="py-8 px-4 border-b border-blue-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setVisibleCount(PAGE_SIZE); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-blue-500/5 border border-blue-500/20 text-blue-300 hover:bg-blue-500/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SEARCH & SORT BAR ───────────────────────────── */}
      <section id="products" className="py-6 px-4 border-b border-blue-900/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
                placeholder="Buscar productos..."
                className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-blue-400/30 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400/40 hover:text-blue-400"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-blue-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="featured">⭐ Destacados</option>
              <option value="newest">🕐 Más nuevos</option>
              <option value="price-asc">💰 Precio: menor a mayor</option>
              <option value="price-desc">💰 Precio: mayor a menor</option>
              <option value="name-asc">🔤 Nombre A-Z</option>
            </select>
          </div>

          <AnimatePresence>
            {(searchQuery || activeCategory !== 'All' || sortBy !== 'featured') && (
              <motion.div
                className="flex items-center gap-2 mt-3 flex-wrap"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {activeCategory !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                    {activeCategory}
                    <button onClick={() => { setActiveCategory('All'); setVisibleCount(PAGE_SIZE); }} className="hover:text-white">✕</button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                    &quot;{searchQuery}&quot;
                    <button onClick={() => setSearchQuery('')} className="hover:text-white">✕</button>
                  </span>
                )}
                <button onClick={resetFilters} className="text-xs text-blue-400/40 hover:text-blue-400 underline">
                  Limpiar filtros
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── PRODUCTS ────────────────────────────────────── */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {activeCategory === 'All' ? 'Todos los productos' : activeCategory}
              </h2>
              <p className="text-blue-400/40 text-sm mt-1">
                {processedProducts.length} producto{processedProducts.length !== 1 ? 's' : ''}
                {searchQuery && ` para "${searchQuery}"`}
              </p>
            </div>
            {rateLoading && (
              <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                Detectando moneda...
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gradient-to-b from-blue-500/5 to-transparent border border-blue-500/10 rounded-2xl overflow-hidden">
                  <div className="aspect-square bg-blue-500/5 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-16 bg-blue-500/10 rounded-full animate-pulse" />
                    <div className="h-4 w-full bg-blue-500/10 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-blue-500/10 rounded animate-pulse" />
                    <div className="flex justify-between">
                      <div className="h-6 w-20 bg-blue-500/10 rounded animate-pulse" />
                      <div className="h-8 w-16 bg-blue-500/10 rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : processedProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-blue-400/60 text-lg mb-2">No se encontraron productos</p>
              <p className="text-blue-400/30 text-sm mb-6">
                {searchQuery ? `No hay resultados para "${searchQuery}"` : 'No hay productos en esta categoría'}
              </p>
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium hover:from-blue-500 hover:to-cyan-400 transition-all active:scale-95"
              >
                Ver todos los productos
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    storeSlug={store.slug}
                    isAdded={added === product.id}
                    isWished={isWished(product.id)}
                    currency={currency}
                    rateLoading={rateLoading}
                    format={format}
                    onAddToCart={() => handleAddToCart(product)}
                    onToggleWishlist={() => toggleWishlist(product.id)}
                    onQuickView={() => { setQuickViewProduct(product); setQuickViewQty(1); }}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-12">
                  <motion.button
                    onClick={loadMore}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25"
                  >
                    Cargar más ({processedProducts.length - visibleCount} restantes)
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ─── NEWSLETTER ──────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-blue-500/5 rounded-3xl blur-xl" />
          <div className="relative bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20 rounded-3xl p-10">
            <p className="text-3xl mb-3">📡</p>
            <h2 className="text-2xl font-bold text-white mb-2">
              Mantente al día
            </h2>
            <p className="text-blue-400/50 mb-6 max-w-md mx-auto">
              Recibe ofertas exclusivas y nuevos productos directamente en tu correo.
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="tu@email.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 bg-black border border-blue-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-blue-400/30 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-500 hover:to-cyan-400 transition-all whitespace-nowrap active:scale-95"
              >
                {subscribed ? '✓ Suscrito!' : 'Suscribirme'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-blue-900/20 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-3">
                {store.name || 'SarahBits'}
              </h3>
              <p className="text-blue-400/40 text-sm leading-relaxed">
                Tech Gadgets Store. Innovación y calidad en cada producto.
              </p>
            </div>
            {[
              { title: 'Tienda', links: ['Todos los productos', 'Audio', 'Gaming', 'Wearables'] },
              { title: 'Ayuda', links: ['Envíos', 'Devoluciones', 'FAQ', 'Contacto'] },
              { title: 'Legal', links: ['Privacidad', 'Términos', 'Cookies'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-white text-sm mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <span className="text-blue-400/40 text-sm hover:text-blue-400 cursor-pointer transition-colors">
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-blue-900/20 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-blue-400/30 text-xs">
              © {new Date().getFullYear()} {store.name || 'SarahBits'}. Powered by Ecomerce Platform.
            </p>
            <div className="flex items-center gap-4 text-blue-400/40 text-xs">
              <span>🇨🇴 Colombia</span>
              <span>·</span>
              <span>COP $</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── CART DRAWER ─────────────────────────────────── */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-950 border-l border-blue-900/30 shadow-2xl z-50 flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex items-center justify-between p-6 border-b border-blue-900/30">
                <h2 className="text-lg font-bold text-white">Carrito ({cartCount})</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 text-blue-400/50 hover:text-white rounded-lg hover:bg-blue-500/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-3">🛒</p>
                    <p className="text-blue-400/40">Tu carrito está vacío</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <AnimatePresence>
                      {cart.map((item) => (
                        <motion.div
                          key={item.id}
                          className="flex gap-3 items-start"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20, height: 0 }}
                        >
                          <div className="w-16 h-16 rounded-xl bg-blue-500/10 border border-blue-500/10 overflow-hidden flex-shrink-0">
                            {getFirstImage(item) ? (
                              <Image src={getFirstImage(item)!} alt={item.title} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">⚡</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white line-clamp-2">{item.title}</p>
                            <p className="text-sm text-blue-400 font-semibold mt-1">{format(Number(item.price))}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))} className="w-6 h-6 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs flex items-center justify-center active:scale-90">−</button>
                              <span className="text-sm w-6 text-center text-white">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs flex items-center justify-center active:scale-90">+</button>
                              <button onClick={() => removeItem(item.id)} className="ml-auto text-xs text-red-400/70 hover:text-red-400">Eliminar</button>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-white flex-shrink-0">{format(item.price * item.quantity)}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-blue-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-blue-400/60 font-medium">Total</span>
                    <span className="text-xl font-bold text-white">{format(cartTotal)}</span>
                  </div>
                  {currency !== 'USD' && (
                    <p className="text-xs text-blue-400/30 text-right mb-4">≈ ${cartTotal.toFixed(2)} USD</p>
                  )}
                  <Link
                    href={`/store/${store.slug}/checkout?items=${encodeURIComponent(JSON.stringify(cart))}&currency=${currency}`}
                    className="block w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-center rounded-xl hover:from-blue-500 hover:to-cyan-400 transition-all font-medium shadow-lg shadow-blue-500/25 active:scale-95"
                  >
                    Proceder al Pago →
                  </Link>
                  <button
                    onClick={() => clearCart()}
                    className="block w-full py-2 mt-2 text-sm text-blue-400/40 hover:text-blue-400 text-center transition-colors"
                  >
                    Vaciar Carrito
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── QUICKVIEW MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {quickViewProduct && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setQuickViewProduct(null); setQuickViewQty(1); }}
            />
            <motion.div
              className="fixed inset-4 md:inset-8 lg:inset-16 bg-gray-950 border border-blue-900/30 rounded-2xl shadow-2xl z-[70] flex flex-col md:flex-row overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              {/* Image */}
              <div className="md:w-1/2 bg-gradient-to-br from-blue-900/20 to-black relative">
                {getFirstImage(quickViewProduct) ? (
                  <Image
                    src={getFirstImage(quickViewProduct)!}
                    alt={quickViewProduct.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl">⚡</div>
                )}
                <button
                  onClick={() => { setQuickViewProduct(null); setQuickViewQty(1); }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  ✕
                </button>
              </div>

              {/* Details */}
              <div className="md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
                {quickViewProduct.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit mb-3">
                    {quickViewProduct.category}
                  </span>
                )}
                <h2 className="text-2xl font-bold text-white mb-2">{quickViewProduct.title}</h2>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    {format(Number(quickViewProduct.price))}
                  </span>
                  {quickViewProduct.compareAtPrice && quickViewProduct.compareAtPrice > quickViewProduct.price && (
                    <span className="text-lg text-blue-400/30 line-through">
                      {format(Number(quickViewProduct.compareAtPrice))}
                    </span>
                  )}
                </div>
                <p className="text-blue-400/50 text-sm mb-6 flex-1">
                  {quickViewProduct.description || 'Tech Gadget'}
                </p>

                {/* Quantity */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-sm text-blue-400/60">Cantidad:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuickViewQty(Math.max(1, quickViewQty - 1))}
                      className="w-8 h-8 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 flex items-center justify-center active:scale-90"
                    >
                      −
                    </button>
                    <span className="text-lg font-bold text-white w-8 text-center">{quickViewQty}</span>
                    <button
                      onClick={() => setQuickViewQty(quickViewQty + 1)}
                      className="w-8 h-8 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 flex items-center justify-center active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleQuickViewAddToCart}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-500 hover:to-cyan-400 transition-all active:scale-95"
                  >
                    🛒 Agregar al carrito
                  </button>
                  <Link
                    href={`/store/${store.slug}/${quickViewProduct.id}`}
                    className="px-6 py-3 border border-blue-500/30 text-blue-300 rounded-xl font-medium hover:bg-blue-500/10 transition-all active:scale-95"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── WISHLIST DRAWER ─────────────────────────────── */}
      <AnimatePresence>
        {showWishlist && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWishlist(false)}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-950 border-l border-blue-900/30 shadow-2xl z-50 flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex items-center justify-between p-6 border-b border-blue-900/30">
                <h2 className="text-lg font-bold text-white">❤️ Favoritos ({wishlistCount})</h2>
                <button onClick={() => setShowWishlist(false)} className="p-2 text-blue-400/50 hover:text-white rounded-lg hover:bg-blue-500/10 transition-colors">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {wishlist.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-3">❤️</p>
                    <p className="text-blue-400/40">No tienes favoritos aún</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.filter((p) => wishlist.includes(p.id)).map((item) => (
                      <div key={item.id} className="flex gap-3 items-start">
                        <Link href={`/store/${store.slug}/${item.id}`} className="w-16 h-16 rounded-xl bg-blue-500/10 border border-blue-500/10 overflow-hidden flex-shrink-0">
                          {getFirstImage(item) ? (
                            <Image src={getFirstImage(item)!} alt={item.title} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">⚡</div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/store/${store.slug}/${item.id}`} className="text-sm font-medium text-white line-clamp-2 hover:text-blue-400 transition-colors">{item.title}</Link>
                          <p className="text-sm text-blue-400 font-semibold mt-1">{format(Number(item.price))}</p>
                        </div>
                        <button onClick={() => toggleWishlist(item.id)} className="p-1 text-pink-400 hover:text-pink-300">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── TOAST NOTIFICATIONS ─────────────────────────── */}
      <div className="fixed top-20 right-4 z-[80] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className="pointer-events-auto bg-gray-900 border border-blue-500/20 rounded-xl px-4 py-3 shadow-xl max-w-sm"
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{toast.message}</span>
                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ─── SCROLL TO TOP ───────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center hover:from-blue-500 hover:to-cyan-400 transition-all"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// Scroll progress bar component
function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / totalHeight) * 100;
      setProgress(scrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
