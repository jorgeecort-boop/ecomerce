import Link from 'next/link';
import { notFound } from 'next/navigation';
import StoreClient from './StoreClient';
import { API_URL } from '@ecomerce/utils';

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
    store = storeData;

    // Products come embedded in the store response
    if (storeData.products && Array.isArray(storeData.products)) {
      products = storeData.products.filter((p: any) => p.isPublished);
    } else {
      const productsRes = await fetch(
        `${API_URL}/products/store/${storeData.id}/public?limit=50`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        products = Array.isArray(productsData) ? productsData : [];
      }
    }
  } catch (err: any) {
    // If store not found, show 404
    notFound();
  }

  // Pass initial data to client component for interactivity
  // At this point, store is guaranteed to be non-null because notFound() would have been called
  return (
    <StoreClient 
      store={store!}
      products={products}
    />
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
    
    const store = await storeRes.json();
    
    return {
      title: `${store.name} - E-Commerce Store`,
      description: store.description || `Shop at ${store.name} - Quality products at great prices`,
      openGraph: {
        title: `${store.name} - E-Commerce Store`,
        description: store.description || `Shop at ${store.name}`,
        images: store.logoUrl ? [store.logoUrl] : [],
      },
    };
  } catch {
    return {
      title: 'Store - E-Commerce',
    };
  }
}
