import Link from 'next/link';
import Script from 'next/script';
import StoreClient from './StoreClient';
import { API_URL } from '@ecomerce/utils';

export const revalidate = 60;

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

interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

async function fetchStoreData(slug: string): Promise<{ store: Store | null; products: Product[]; error: string | null }> {
  try {
    const storeRes = await fetch(`${API_URL}/stores/slug/${slug}`, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 60 },
    });

    if (!storeRes.ok) {
      return { store: null, products: [], error: `API returned ${storeRes.status}` };
    }

    const storeData = await storeRes.json();
    const storeDataUnwrapped = storeData.data || storeData;
    const store = storeDataUnwrapped as Store;

    let products: Product[] = [];
    if (storeDataUnwrapped.products && Array.isArray(storeDataUnwrapped.products)) {
      products = storeDataUnwrapped.products.filter((p: any) => p.isPublished);
    } else {
      const productsRes = await fetch(
        `${API_URL}/products/store/${storeDataUnwrapped.id}/public?limit=50`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const unwrapped = productsData.data || productsData;
        products = Array.isArray(unwrapped) ? unwrapped : [];
      }
    }

    return { store, products, error: null };
  } catch (err: any) {
    return { store: null, products: [], error: err.message || 'Connection failed' };
  }
}

export default async function StorePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const { store, products, error } = await fetchStoreData(slug);

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#03045E' }}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 animate-pulse">🚀</div>
          <h1 className="text-2xl font-extrabold text-white mb-3">
            La tienda se esta despertando
          </h1>
          <p className="text-[rgba(255,255,255,0.5)] mb-6">
            Nuestros servidores estan en modo ahorro de energia. Vuelve a intentarlo en unos segundos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`/store/${slug}`}
              className="px-6 py-3 rounded-full gradient-hero-cta text-white font-bold hover:shadow-lg transition-colors"
            >
              Reintentar
            </a>
            <Link
              href="/"
              className="px-6 py-3 rounded-full border border-[rgba(255,255,255,0.2)] text-white font-semibold hover:bg-[rgba(255,255,255,0.08)] transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
          {error && (
            <p className="text-xs text-[rgba(255,255,255,0.3)] mt-6">
              Error: {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description: store.description || `${store.name} - Tech Gadgets Store`,
    url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/store/${store.slug}`,
    ...(store.logoUrl ? { logo: store.logoUrl } : {}),
    ...(products.length > 0 ? {
      makesOffer: products.map((p) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Product',
          name: p.title,
          description: p.description || '',
          ...(p.imageUrl || (p.images?.[0]) ? { image: p.imageUrl || (Array.isArray(p.images) ? p.images[0] : '') } : {}),
        },
        price: Number(p.price),
        priceCurrency: 'COP',
        availability: (p.inventory ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      })),
    } : {}),
  };

  return (
    <>
      <Script
        id="store-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StoreClient store={store} products={products} />
    </>
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  try {
    const storeRes = await fetch(`${API_URL}/stores/slug/${slug}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 }
    });

    if (!storeRes.ok) {
      return { title: 'SarahBits - Tech Gadgets' };
    }

    const storeRaw = await storeRes.json();
    const store = storeRaw.data || storeRaw;

    const storeName = store.name || 'SarahBits';
    const storeDesc = store.description || `Descubre los mejores gadgets tecnologicos en ${storeName}`;

    return {
      title: `${storeName} - Tech Gadgets`,
      description: storeDesc,
      openGraph: {
        title: `${storeName} - Tech Gadgets`,
        description: storeDesc,
        type: 'website',
        url: `/store/${store.slug || slug}`,
        siteName: 'SarahBits',
        images: store.logoUrl ? [{ url: store.logoUrl, width: 256, height: 256 }] : [],
        locale: 'es_CO',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${storeName} - Tech Gadgets`,
        description: storeDesc,
        images: store.logoUrl ? [store.logoUrl] : [],
      },
    };
  } catch {
    return { title: 'SarahBits - Tech Gadgets' };
  }
}
