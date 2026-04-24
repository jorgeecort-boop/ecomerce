'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getHomeProducts, HomeCategoryCard } from '@/lib/services/home-products';

export interface CategoryGridProps {
  initialLimit?: number;
}

export function CategoryGrid({ initialLimit = 8 }: CategoryGridProps) {
  const [products, setProducts] = useState<HomeCategoryCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
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

    loadProducts();

    return () => {
      mounted = false;
    };
  }, [initialLimit]);

  return (
    <section aria-label="Categorias destacadas" className="bg-white py-12">
      <div className="mx-auto w-full max-w-site px-4 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold text-text sm:text-3xl">Explora por categoria</h2>
          <Link href="/store/tienda-demo" className="text-sm font-semibold text-primary hover:opacity-90">
            Ver todo
          </Link>
        </div>

        {isLoading && (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Cargando productos">
            {Array.from({ length: 4 }).map((_, index) => (
              <li
                key={`skeleton-${index}`}
                data-testid="category-skeleton"
                className="overflow-hidden rounded-card bg-white shadow-card"
              >
                <div className="aspect-[4/5] w-full animate-pulse bg-surface" />
                <div className="px-4 py-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-surface" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && error && (
          <div className="rounded-card border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id} data-testid="category-card">
                <Link
                  href={`/store/${product.slug}`}
                  className="group block overflow-hidden rounded-card bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-primary sm:text-base">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-secondary">${product.price.toFixed(2)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default CategoryGrid;
