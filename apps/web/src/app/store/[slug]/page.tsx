import Link from 'next/link';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import StoreClient from './StoreClient';
import { API_URL } from '@ecomerce/utils';

export const revalidate = 60; // ISR: regenerar cada minuto

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
  } catch {
    /* ignore */
  }
  return undefined;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

// Server Component - renders on the server for better SEO
export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  let store: Store | null = null;
  let products: Product[] = [];

  try {
    // Fetch store data on the server
    const storeRes = await fetch(`${API_URL}/stores/slug/${slug}`, {
      signal: AbortSignal.timeout(8000),
      // Reuse connection for better performance
      next: { revalidate: 60 } // Cache for 1 minute
    });
    
    if (!storeRes.ok) {
      notFound();
    }
    
    const storeData = await storeRes.json();
    const storeDataUnwrapped = storeData.data || storeData;
    store = storeDataUnwrapped;

    // Products come embedded in the store response
    if (storeDataUnwrapped.products && Array.isArray(storeDataUnwrapped.products)) {
      products = storeDataUnwrapped.products.filter((p: any) => p.isPublished);
    } else {
      const productsRes = await fetch(
        `${API_URL}/products/store/${storeDataUnwrapped.id}/public?limit=50`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const unwrapped = productsData.data || productsData;
        products = Array.isArray(unwrapped) ? unwrapped : [];
      }
    }
  } catch (err: any) {
    // If store not found, show 404
    notFound();
  }

  // Pass initial data to client component for interactivity
  // At this point, store is guaranteed to be non-null because notFound() would have been called
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store!.name,
    description: store!.description || `${store!.name} - Tech Gadgets Store`,
    url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/store/${store!.slug}`,
    ...(store!.logoUrl ? { logo: store!.logoUrl } : {}),
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
      <StoreClient
        store={store!}
        products={products}
      />
    </>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  try {
    const storeRes = await fetch(`${API_URL}/stores/slug/${slug}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 }
    });
    
    if (!storeRes.ok) {
      return {
        title: 'Store Not Found',
      };
    }
    
    const storeRaw = await storeRes.json();
    const store = storeRaw.data || storeRaw;
    
    const storeName = store.name || 'Store';
    const storeDesc = store.description || `Discover innovative tech gadgets at ${storeName}`;
    
    return {
      title: `${storeName} - Tech Gadgets`,
      description: storeDesc,
      openGraph: {
        title: `${storeName} - Tech Gadgets`,
        description: storeDesc,
        type: 'website',
        url: `/store/${store.slug || slug}`,
        siteName: 'Sarhbits',
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
    return {
      title: 'Store - E-Commerce',
    };
  }
}
