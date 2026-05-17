'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getHomeProducts, HomeCategoryCard } from '@/lib/services/home-products';
import { useInView } from '@/hooks/useInView';

const gradients = [
  'from-violet-500/80 to-purple-600/80',
  'from-cyan-500/80 to-blue-600/80',
  'from-amber-500/80 to-orange-600/80',
  'from-emerald-500/80 to-teal-600/80',
  'from-pink-500/80 to-rose-600/80',
  'from-indigo-500/80 to-blue-600/80',
  'from-red-500/80 to-pink-600/80',
  'from-sky-500/80 to-cyan-600/80',
];

export function CategoryGrid({ initialLimit = 8 }: { initialLimit?: number }) {
  const [products, setProducts] = useState<HomeCategoryCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { ref, isInView } = useInView(0.1);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getHomeProducts(initialLimit);
        if (!mounted) return;
        setProducts(data);
      } catch {
        if (!mounted) return;
        setError('No pudimos cargar los productos en este momento.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [initialLimit]);

  return (
    <section ref={ref} className="py-16 bg-white">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
            Coleccion
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
            Explora nuestras categorias
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Descubre productos seleccionados para cada necesidad tecnologica
          </p>
        </div>

        {isLoading && (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="aspect-[4/5] rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </ul>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((product, i) => (
              <li
                key={product.id}
                className={`transition-all duration-700 ${
                  isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 75}ms` }}
              >
                <Link
                  href={`/store/${product.slug}`}
                  className="group block rounded-2xl overflow-hidden bg-white shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-200/30"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${gradients[i % gradients.length]} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />

                    {/* Discount badge */}
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold shadow-lg">
                        -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                      </div>
                    )}

                    {/* Hover CTA */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="px-6 py-3 rounded-full bg-white text-slate-900 font-bold text-sm shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        Ver producto
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                        ${product.price.toLocaleString('es-CO')}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-xs text-slate-400 line-through">
                          ${product.compareAtPrice.toLocaleString('es-CO')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="text-center mt-10">
          <Link
            href="/store/tienda-demo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-slate-900 text-white font-bold transition-all duration-300 hover:bg-indigo-600 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-200"
          >
            Ver toda la tienda
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CategoryGrid;
