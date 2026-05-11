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

export default function StoreClient({ store, products }: StoreClientProps) {
  const [added, setAdded] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const { cart, addItem, removeItem, updateQuantity, clearCart, cartTotal, cartCount } =
    useCart(store.slug);

  const { format, currency, setCurrency, availableCurrencies, isLoading: rateLoading } =
    useCurrency();

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

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const filteredProducts =
    activeCategory === 'All'
      ? products
      : products.filter((p) => {
          const cat = (p as any).category || '';
          return cat.toLowerCase().includes(activeCategory.toLowerCase()) ||
            (activeCategory === 'Audio' && (cat.includes('Audio') || p.title.toLowerCase().includes('audifonos') || p.title.toLowerCase().includes('bluetooth'))) ||
            (activeCategory === 'Gaming' && (cat.includes('Gaming') || p.title.toLowerCase().includes('gamer') || p.title.toLowerCase().includes('mouse'))) ||
            (activeCategory === 'Streaming' && (cat.includes('Streaming') || p.title.toLowerCase().includes('streaming') || p.title.toLowerCase().includes('webcam') || p.title.toLowerCase().includes('ring'))) ||
            (activeCategory === 'Wearables' && (cat.includes('Wearable') || p.title.toLowerCase().includes('smartwatch'))) ||
            (activeCategory === 'Accesorios' && (cat.includes('Accesorio') || p.title.toLowerCase().includes('soporte') || p.title.toLowerCase().includes('hub') || p.title.toLowerCase().includes('cargador'))) ||
            (activeCategory === 'Baterias' && (cat.includes('Bateria') || p.title.toLowerCase().includes('power') || p.title.toLowerCase().includes('bateria')));
        });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ─── NAV ─────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-blue-900/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/store/${store.slug}`} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-black font-bold text-sm">
                S
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  Sarhbits
                </h1>
                <p className="text-[10px] text-blue-400/60 tracking-widest uppercase">
                  Tech Gadgets
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
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

            <button
              onClick={() => setShowCart(true)}
              className="relative px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm rounded-lg hover:from-blue-500 hover:to-cyan-400 transition-all font-medium"
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
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-400 text-xs mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Envío gratis en pedidos +$50
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent">
                Innovación en tus manos
              </span>
            </h2>
            <p className="text-blue-300/60 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Descubre los gadgets más innovadores. Audio premium, gaming gear, wearables y accesorios que potencian tu setup.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="#products"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/25"
              >
                Explorar Productos
              </Link>
              <Link
                href={`/store/${store.slug}/checkout`}
                className="px-6 py-3 border border-blue-500/30 text-blue-300 rounded-xl font-medium hover:bg-blue-500/10 transition-all"
              >
                Ofertas
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-12 text-center">
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
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ──────────────────────────────────── */}
      <section className="py-8 px-4 border-b border-blue-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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

      {/* ─── PRODUCTS ────────────────────────────────────── */}
      <section id="products" className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {activeCategory === 'All' ? 'Todos los productos' : activeCategory}
              </h2>
              <p className="text-blue-400/40 text-sm mt-1">
                {filteredProducts.length} productos disponibles
              </p>
            </div>
            {rateLoading && (
              <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                Detectando moneda...
              </span>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-blue-400/60">No hay productos en esta categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group relative bg-gradient-to-b from-blue-500/5 to-transparent border border-blue-500/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
                >
                  <Link href={`/store/${store.slug}/${product.id}`}>
                    <div className="aspect-square bg-gradient-to-br from-blue-900/20 to-black overflow-hidden relative">
                      {getFirstImage(product) ? (
                        <img
                          src={getFirstImage(product)}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">
                          ⚡
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="px-2 py-1 bg-black/60 backdrop-blur text-xs text-blue-300 rounded-lg">
                          Ver
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {(product as any).category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {(product as any).category}
                        </span>
                      )}
                    </div>
                    <Link href={`/store/${store.slug}/${product.id}`}>
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
                        {currency !== 'USD' && (
                          <p className="text-[10px] text-blue-400/30">
                            ${Number(product.price).toFixed(2)} USD
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                          added === product.id
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/20'
                        }`}
                      >
                        {added === product.id ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                    {(product.inventory ?? 0) > 0 && (product.inventory ?? 0) <= 10 && (
                      <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        Only {product.inventory} left
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-500 hover:to-cyan-400 transition-all whitespace-nowrap"
              >
                {subscribed ? '✓ Suscrito!' : 'Suscribirme'}
              </button>
            </form>
            {subscribed && (
              <p className="text-green-400 text-sm mt-4 animate-pulse">
                ¡Gracias por suscribirte! 🎉
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-blue-900/20 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-3">
                Sarhbits
              </h3>
              <p className="text-blue-400/40 text-sm leading-relaxed">
                Tech Gadgets Store. Innovación y calidad en cada producto.
              </p>
            </div>
            {[
              {
                title: 'Tienda',
                links: ['Todos los productos', 'Audio', 'Gaming', 'Wearables'],
              },
              {
                title: 'Ayuda',
                links: ['Envíos', 'Devoluciones', 'FAQ', 'Contacto'],
              },
              {
                title: 'Legal',
                links: ['Privacidad', 'Términos', 'Cookies'],
              },
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
              © {new Date().getFullYear()} Sarhbits. Powered by Ecomerce Platform.
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
      {showCart && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={() => setShowCart(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-950 border-l border-blue-900/30 shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-blue-900/30">
              <h2 className="text-lg font-bold text-white">
                Carrito ({cartCount})
              </h2>
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
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 items-start">
                      <div className="w-16 h-16 rounded-xl bg-blue-500/10 border border-blue-500/10 overflow-hidden flex-shrink-0">
                        {getFirstImage(item) ? (
                          <img src={getFirstImage(item)} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">⚡</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white line-clamp-2">{item.title}</p>
                        <p className="text-sm text-blue-400 font-semibold mt-1">{format(Number(item.price))}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                            className="w-6 h-6 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="text-sm w-6 text-center text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="ml-auto text-xs text-red-400/70 hover:text-red-400"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white flex-shrink-0">
                        {format(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
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
                  className="block w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-center rounded-xl hover:from-blue-500 hover:to-cyan-400 transition-all font-medium shadow-lg shadow-blue-500/25"
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
          </div>
        </>
      )}
    </div>
  );
}
