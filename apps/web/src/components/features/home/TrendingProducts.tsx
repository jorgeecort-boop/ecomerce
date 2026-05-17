'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getHomeProducts, HomeCategoryCard } from '@/lib/services/home-products';

export function TrendingProducts() {
  const [products, setProducts] = useState<HomeCategoryCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getHomeProducts(12);
        if (mounted) setProducts(data);
      } catch { /* ignore */ }
      finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || products.length === 0) return;

    let animationId: number;
    let scrollPos = 0;
    const speed = 0.5;

    const animate = () => {
      scrollPos += speed;
      if (scrollPos >= el.scrollWidth / 2) {
        scrollPos = 0;
      }
      el.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [products]);

  const displayProducts = [...products, ...products]; // Duplicate for seamless loop

  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-10">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-8" />
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 h-80 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
              🔥 Tendencia
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Productos mas vendidos
            </h2>
          </div>
          <Link href="/store/tienda-demo" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Ver todos
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-10 pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayProducts.map((product, i) => (
          <Link
            key={`${product.id}-${i}`}
            href={`/store/${product.slug}`}
            className="flex-shrink-0 w-64 group"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 mb-3">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="256px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold shadow-lg">
                  -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <span className="inline-block px-4 py-2 rounded-full bg-white text-slate-900 text-sm font-bold shadow-lg">
                  Ver producto
                </span>
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-extrabold text-slate-900">
                ${product.price.toLocaleString('es-CO')}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-sm text-slate-400 line-through">
                  ${product.compareAtPrice.toLocaleString('es-CO')}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default TrendingProducts;
