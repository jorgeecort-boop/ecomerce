'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ProductCard from './ProductCard';

gsap.registerPlugin(ScrollTrigger);

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  images?: any;
  imageUrl?: string;
  inventory?: number;
  isFeatured?: boolean;
  category?: string;
  tags?: string[];
}

interface ProductGridProps {
  products: Product[];
  storeSlug: string;
  currency: string;
  format: (amount: number) => string;
  addedIds: Set<string>;
  wishlistIds: Set<string>;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  onQuickView: (product: Product) => void;
  visibleCount: number;
  onLoadMore: () => void;
  isLoading?: boolean;
}

export default function ProductGrid({
  products,
  storeSlug,
  currency,
  format,
  addedIds,
  wishlistIds,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
  visibleCount,
  onLoadMore,
  isLoading,
}: ProductGridProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const remaining = products.length - visibleCount;

  useEffect(() => {
    if (!sectionRef.current) return;
    const header = sectionRef.current.querySelector('.grid-header');
    if (header) {
      gsap.fromTo(
        header,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: header,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }
  }, []);

  if (isLoading) {
    return (
      <section ref={sectionRef} className="py-12 px-6 lg:px-10" style={{ backgroundColor: '#03045E' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-[rgba(255,255,255,0.06)]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[rgba(255,255,255,0.08)] rounded w-3/4" />
                  <div className="h-3 bg-[rgba(255,255,255,0.06)] rounded w-1/2" />
                  <div className="h-8 bg-[rgba(255,255,255,0.06)] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-20 px-6 lg:px-10" style={{ backgroundColor: '#03045E' }}>
        <div className="max-w-[1200px] mx-auto text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-white text-xl font-medium mb-2">No se encontraron productos</h3>
          <p className="text-[rgba(255,255,255,0.5)] text-sm">Prueba con otros filtros o términos de búsqueda.</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} id="productos" className="py-12 px-6 lg:px-10" style={{ backgroundColor: '#03045E' }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="grid-header flex items-center justify-between mb-8">
          <h2 className="text-white text-2xl font-medium tracking-[-0.5px]">
            Productos{' '}
            <span className="text-[rgba(255,255,255,0.4)] text-sm font-normal">
              ({products.length})
            </span>
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.slice(0, visibleCount).map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              storeSlug={storeSlug}
              currency={currency}
              format={format}
              isWished={wishlistIds.has(product.id)}
              isAdded={addedIds.has(product.id)}
              onAddToCart={() => onAddToCart(product)}
              onToggleWishlist={() => onToggleWishlist(product)}
              onQuickView={() => onQuickView(product)}
            />
          ))}
        </div>

        {/* Load More */}
        {remaining > 0 && (
          <div className="text-center mt-12">
            <button
              onClick={onLoadMore}
              className="px-8 py-3 rounded-full border border-[rgba(255,255,255,0.15)] text-white text-sm font-medium hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(0,180,216,0.3)] transition-all duration-300 active:scale-95"
            >
              Cargar más ({remaining} restantes)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
