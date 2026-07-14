'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@ecomerce/utils';

import StoreNavigation from '@/components/features/kimi-store/StoreNavigation';
import StoreHero from '@/components/features/kimi-store/StoreHero';
import CategoryPills from '@/components/features/kimi-store/CategoryPills';
import ProductGrid from '@/components/features/kimi-store/ProductGrid';
import QuickViewModal from '@/components/features/kimi-store/QuickViewModal';
import CartDrawer from '@/components/shared/CartDrawer';
import WishlistDrawer from '@/components/features/kimi-store/WishlistDrawer';
import NewsletterSection from '@/components/features/kimi-store/NewsletterSection';
import Footer from '@/components/shared/Footer';
import ScrollProgressBar from '@/components/features/kimi-store/ScrollProgressBar';
import ScrollToTopButton from '@/components/features/kimi-store/ScrollToTopButton';
import WhatsAppButton from '@/components/shared/WhatsAppButton';
import { AnimatePresence, motion } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

interface StoreClientProps {
  store: any;
  products: any[];
}

const CATEGORY_MAP: Record<string, string[]> = {
  'Audio': ['audio', 'audifonos', 'headphones', 'earbuds', 'microfono', 'altavoz', 'speaker'],
  'Gaming': ['gaming', 'gamer', 'mouse', 'teclado', 'keyboard', 'control', ' joystick'],
  'Streaming': ['streaming', 'camara', 'webcam', 'microfono', 'ring light', 'tripode'],
  'Wearables': ['wearables', 'smartwatch', 'reloj', 'band', 'pulsera'],
  'Accesorios': ['accesorios', 'hub', 'soporte', 'cable', 'cargador', 'case'],
  'Baterias': ['baterias', 'power bank', 'bateria', 'cargador'],
};

export default function StoreClient({ store, products }: StoreClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortBy, setSortBy] = useState('featured');
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoading, setIsLoading] = useState(true);

  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);

  const { user, token } = useAuth();
  const { currency, format } = useCurrency();
  const { cart: cartItems, addItem, updateQuantity, removeItem } = useCart(store.slug);

  // Loading simulation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Load wishlist from localStorage (anonymous) or backend (logged in)
  useEffect(() => {
    if (token && user) {
      api.wishlist.get(token, store.id).then((data) => {
        const ids = (data.items || []).map((i: any) => i.productId);
        setWishlistIds(new Set(ids));
      }).catch(() => {
        try {
          const saved = localStorage.getItem(`wishlist-${store.slug}`);
          if (saved) setWishlistIds(new Set(JSON.parse(saved)));
        } catch {}
      });
    } else {
      try {
        const saved = localStorage.getItem(`wishlist-${store.slug}`);
        if (saved) setWishlistIds(new Set(JSON.parse(saved)));
      } catch {}
    }
  }, [token, user, store.id, store.slug]);

  // Persist wishlist to localStorage (anonymous) or backend (logged in)
  useEffect(() => {
    if (token && user) return; // don't persist locally when logged in
    localStorage.setItem(`wishlist-${store.slug}`, JSON.stringify([...wishlistIds]));
  }, [wishlistIds, store.slug, token, user]);

  const addToast = useCallback((message: string, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== 'Todos') {
      const keywords = CATEGORY_MAP[selectedCategory] || [selectedCategory.toLowerCase()];
      result = result.filter((p) => {
        const text = `${p.title} ${p.description} ${p.category} ${p.tags?.join(' ')}`.toLowerCase();
        return keywords.some((k) => text.includes(k));
      });
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price-desc':
        result.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'name':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'featured':
      default:
        result.sort((a, b) => Number(b.isFeatured || 0) - Number(a.isFeatured || 0));
        break;
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: products.length };
    Object.keys(CATEGORY_MAP).forEach((cat) => {
      const keywords = CATEGORY_MAP[cat];
      counts[cat] = products.filter((p) => {
        const text = `${p.title} ${p.description} ${p.category} ${p.tags?.join(' ')}`.toLowerCase();
        return keywords.some((k) => text.includes(k));
      }).length;
    });
    return counts;
  }, [products]);

  const wishlistProducts = useMemo(() => {
    return products.filter((p) => wishlistIds.has(p.id)).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      imageUrl: getFirstImage(p),
    }));
  }, [products, wishlistIds]);

  const handleAddToCart = useCallback((product: any, quantity = 1) => {
    const img = getFirstImage(product);
    addItem({ id: product.id, title: product.title, price: product.price, imageUrl: img }, quantity);
    setAddedIds((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1500);
    addToast(`✓ ${product.title.substring(0, 30)}... agregado`, 'success');
  }, [addItem, addToast]);

  const handleToggleWishlist = useCallback((product: any) => {
    const isAdding = !wishlistIds.has(product.id);

    // Optimistic UI update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (isAdding) {
        next.add(product.id);
      } else {
        next.delete(product.id);
      }
      return next;
    });

    addToast(isAdding ? '❤️ Agregado a favoritos' : 'Eliminado de favoritos', isAdding ? 'success' : 'info');

    // Sync with backend if logged in
    if (token && user) {
      if (isAdding) {
        api.wishlist.addItem(token, store.id, product.id).catch(() => {
          setWishlistIds((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
        });
      } else {
        api.wishlist.removeItem(token, store.id, product.id).catch(() => {
          setWishlistIds((prev) => { const n = new Set(prev); n.add(product.id); return n; });
        });
      }
    }
  }, [wishlistIds, addToast, token, user, store.id]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + 12);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <ScrollProgressBar />
      <ScrollToTopButton />

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[90] space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg max-w-sm ${
                toast.type === 'error'
                  ? 'bg-red-500/90 text-white'
                  : toast.type === 'info'
                    ? 'bg-blue-500/90 text-white'
                    : 'bg-green-500/90 text-white'
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <StoreNavigation
        storeName={store.name}
        cartCount={cartItems.reduce((sum, i) => sum + i.quantity, 0)}
        wishlistCount={wishlistIds.size}
        currency={currency}
        onCartClick={() => setIsCartOpen(true)}
        onWishlistClick={() => setIsWishlistOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main>
        {/* Hero */}
        <StoreHero storeName={store.name} productCount={products.length} />

        {/* Category Pills */}
        <CategoryPills
          selected={selectedCategory}
          onSelect={(cat) => { setSelectedCategory(cat); setVisibleCount(12); }}
          productCounts={productCounts}
        />

        {/* Search & Sort Bar */}
        <div className="px-6 lg:px-10 py-4" style={{ backgroundColor: '#0a0a0f' }}>
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Active Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(168,173,184,0.1)] text-[#a8adb8] text-xs border border-[rgba(168,173,184,0.2)]">
                  🔍 {searchQuery}
                  <button onClick={() => setSearchQuery('')} className="hover:text-white">×</button>
                </span>
              )}
              {selectedCategory !== 'Todos' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(228,255,26,0.1)] text-[#d0d5dc] text-xs border border-[rgba(228,255,26,0.2)]">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('Todos')} className="hover:text-white">×</button>
                </span>
              )}
              {(searchQuery || selectedCategory !== 'Todos') && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('Todos'); }}
                  className="text-xs text-[rgba(255,255,255,0.5)] hover:text-white underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-white text-sm outline-none focus:border-[#a8adb8] transition-colors"
            >
              <option value="featured" className="bg-[#0a0a0f]">Destacados</option>
              <option value="price-asc" className="bg-[#0a0a0f]">Precio: Menor a Mayor</option>
              <option value="price-desc" className="bg-[#0a0a0f]">Precio: Mayor a Menor</option>
              <option value="name" className="bg-[#0a0a0f]">Nombre: A-Z</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <ProductGrid
          products={filteredProducts}
          storeSlug={store.slug}
          currency={currency}
          format={format}
          addedIds={addedIds}
          wishlistIds={wishlistIds}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          onQuickView={setQuickViewProduct}
          visibleCount={visibleCount}
          onLoadMore={handleLoadMore}
          isLoading={isLoading}
        />

        {/* Newsletter */}
        <NewsletterSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Drawers & Modals */}
      <QuickViewModal
        product={quickViewProduct}
        storeSlug={store.slug}
        currency={currency}
        format={format}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        isWished={quickViewProduct ? wishlistIds.has(quickViewProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        currency={currency}
        format={format}
        onUpdateQuantity={(id, delta) => updateQuantity(id, delta)}
        onRemove={(id) => removeItem(id)}
        storeSlug={store.slug}
      />

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        items={wishlistProducts}
        currency={currency}
        format={format}
        onRemove={(id) => {
          setWishlistIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          addToast('Eliminado de favoritos', 'info');
          if (token && user) {
            api.wishlist.removeItem(token, store.id, id).catch(() => {});
          }
        }}
        storeSlug={store.slug}
      />

      <WhatsAppButton
        phoneNumber="+573117313902"
        message={`Hola SaraTech, estoy viendo la tienda ${store.name} y tengo una consulta.`}
      />
    </div>
  );
}

function getFirstImage(product: any): string | undefined {
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }
  if (product.imageUrl) return product.imageUrl;
  return undefined;
}
