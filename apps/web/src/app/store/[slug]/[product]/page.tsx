import Link from 'next/link';
import Script from 'next/script';
import ProductClient from './ProductClient';
import { generateProductMetadata } from './seo';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}) {
  return generateProductMetadata(await params);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}) {
  const { slug, product: productId } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecomerce-web.vercel.app';

  let store: Store | null = null;
  let product: Product | null = null;
  let relatedProducts: Product[] = [];
  let hasError = false;

  try {
    const storeRes = await fetch(`${API_URL}/stores/slug/${slug}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10000),
    });
    if (storeRes.ok) {
      const storeRaw = await storeRes.json();
      store = storeRaw.data || storeRaw;
    }
  } catch { /* ignore */ }

  try {
    const productRes = await fetch(`${API_URL}/products/${productId}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10000),
    });
    if (productRes.ok) {
      const productRaw = await productRes.json();
      product = productRaw.data || productRaw;
    }
  } catch { /* ignore */ }

  if (!product || !store) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 animate-pulse">🚀</div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
            La tienda se esta despertando
          </h1>
          <p className="text-slate-500 mb-6">
            Nuestros servidores estan en modo ahorro de energia. Vuelve a intentarlo en unos segundos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
            >
              Reintentar
            </button>
            <Link
              href="/"
              className="px-6 py-3 rounded-full border-2 border-slate-200 text-slate-600 font-semibold hover:border-slate-300 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  try {
    const relatedRes = await fetch(`${API_URL}/products/store/${store.id}/public?limit=4`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10000),
    });
    if (relatedRes.ok) {
      const relatedRaw = await relatedRes.json();
      const raw = relatedRaw.data || relatedRaw;
      relatedProducts = (Array.isArray(raw) ? raw : [])
        .filter((p: Product) => p.id !== productId)
        .slice(0, 4);
    }
  } catch { /* ignore */ }

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
      availability: (product.inventory ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/store/${slug}/${product.id}`,
    },
  };

  return (
    <>
      <Script id="product-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductClient product={product} store={store} relatedProducts={relatedProducts} slug={slug} />
    </>
  );
}
