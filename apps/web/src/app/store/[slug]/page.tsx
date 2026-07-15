import Script from 'next/script';
import StoreClient from './StoreClient';
import { fetchStoreData } from './data';
import { API_URL } from '@ecomerce/utils';

export const revalidate = 60;

function getFirstImage(images: unknown): string | undefined {
  return Array.isArray(images) && typeof images[0] === 'string' ? images[0] : undefined;
}

export default async function StorePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const result = await fetchStoreData(slug);

  if (result.status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-extrabold text-white mb-3">
            Tienda no encontrada
          </h1>
          <p className="text-[rgba(255,255,255,0.5)] mb-6">
            Revisa el enlace o vuelve al inicio para explorar SaraTech.
          </p>
          <a
            href="/"
            className="inline-flex px-6 py-3 rounded-full border border-[rgba(255,255,255,0.2)] text-white font-semibold hover:bg-[rgba(255,255,255,0.08)] transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (result.status === 'unavailable') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0a0f' }}>
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
            <a
              href="/"
              className="px-6 py-3 rounded-full border border-[rgba(255,255,255,0.2)] text-white font-semibold hover:bg-[rgba(255,255,255,0.08)] transition-colors"
            >
              Volver al inicio
            </a>
          </div>
          {result.error && (
            <p className="text-xs text-[rgba(255,255,255,0.3)] mt-6">
              Error: {result.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  const { store, products } = result;

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
          ...(p.imageUrl || getFirstImage(p.images) ? { image: p.imageUrl || getFirstImage(p.images) } : {}),
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
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://ecomerce-web.vercel.app';

  try {
    const storeRes = await fetch(`${API_URL}/stores/slug/${slug}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 }
    });

    if (!storeRes.ok) {
      return { title: 'SaraTech - Tech Gadgets' };
    }

    const storeRaw = await storeRes.json();
    const store = storeRaw.data || storeRaw;

    const storeName = store.name || 'SaraTech';
    const storeDesc = store.description || `Descubre los mejores gadgets tecnologicos en ${storeName}`;

    return {
      title: `${storeName} - Tech Gadgets`,
      description: storeDesc,
      openGraph: {
        title: `${storeName} - Tech Gadgets`,
        description: storeDesc,
        type: 'website',
        url: `${baseUrl}/store/${store.slug || slug}`,
        siteName: 'SaraTech',
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
    return { title: 'SaraTech - Tech Gadgets' };
  }
}
