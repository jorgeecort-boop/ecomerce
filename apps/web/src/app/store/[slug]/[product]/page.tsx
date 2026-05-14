import { notFound } from 'next/navigation';
import Script from 'next/script';
import ProductClient from './ProductClient';
import { API_URL } from '@ecomerce/utils';

export const revalidate = 60;

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
  description?: string;
}

class ApiUnavailableError extends Error {}

async function fetchStore(slug: string): Promise<Store> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/stores/slug/${slug}`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 60 },
    });
  } catch {
    throw new ApiUnavailableError('API timeout');
  }
  if (res.status === 404) notFound();
  if (!res.ok) throw new ApiUnavailableError(`API error ${res.status}`);
  const data = await res.json();
  return data.data || data;
}

async function fetchProduct(productId: string): Promise<Product> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/products/${productId}`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 60 },
    });
  } catch {
    throw new ApiUnavailableError('API timeout');
  }
  if (res.status === 404) notFound();
  if (!res.ok) throw new ApiUnavailableError(`API error ${res.status}`);
  const data = await res.json();
  return data.data || data;
}

async function fetchRelatedProducts(storeId: string, excludeId: string): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products/store/${storeId}/public?limit=4`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.data || data;
    return (Array.isArray(raw) ? raw : [])
      .filter((p: Product) => p.id !== excludeId)
      .slice(0, 4);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}) {
  const { slug, product: productId } = await params;

  try {
    const store = await fetchStore(slug);
    const product = await fetchProduct(productId);

    const title = `${product.title} - ${store.name}`;
    const description = product.description?.slice(0, 160) || product.title;
    const imageUrl = product.imageUrl || product.images?.[0];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecomerce-web.vercel.app';
    const productUrl = `${baseUrl}/store/${slug}/${productId}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'product' as const,
        url: productUrl,
        siteName: store.name,
        ...(imageUrl
          ? {
              images: [
                {
                  url: imageUrl,
                  width: 600,
                  height: 600,
                  alt: product.title,
                },
              ],
            }
          : {}),
        locale: 'es_CO',
      },
      twitter: {
        card: 'summary_large_image' as const,
        title,
        description,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      },
    };
  } catch {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
    };
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}) {
  const { slug, product: productId } = await params;

  try {
    const store = await fetchStore(slug);
    const product = await fetchProduct(productId);
    const relatedProducts = await fetchRelatedProducts(store.id, productId);

    const allImages = ([product.imageUrl, ...(product.images ?? [])].filter(Boolean)) as string[];

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description || product.title,
      ...(allImages[0] ? { image: allImages[0] } : {}),
      ...(product.category ? { category: product.category } : {}),
      ...(product.tags?.length ? { keywords: product.tags.join(', ') } : {}),
      offers: {
        '@type': 'Offer',
        price: Number(product.price),
        priceCurrency: 'COP',
        availability:
          (product.inventory ?? 0) > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/store/${slug}/${product.id}`,
      },
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Script
          id="product-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProductClient
          product={product}
          store={store}
          relatedProducts={relatedProducts}
          slug={slug}
        />
      </div>
    );
  } catch (err) {
    if (err instanceof ApiUnavailableError) {
      // API dormido (503/timeout) — página de error amigable con auto-refresh
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <p className="text-5xl mb-4">⏳</p>
            <h1 className="text-2xl font-bold text-white mb-2">Cargando tienda...</h1>
            <p className="text-gray-400 mb-6 text-sm">
              El servidor está iniciando. La página se recargará automáticamente en unos segundos.
            </p>
            <meta httpEquiv="refresh" content="8" />
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      );
    }
    throw err; // otros errores → Next.js error boundary
  }
}
