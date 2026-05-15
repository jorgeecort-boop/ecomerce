import type { Metadata } from 'next';
import { API_URL } from '@ecomerce/utils';

const FALLBACK_TITLE = 'Product';
const METADATA_REVALIDATE_SECONDS = 60;
const METADATA_FETCH_TIMEOUT_MS = 5000;

type FetchInitWithNext = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

interface Product {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
}

interface Store {
  name?: string;
}

interface ProductMetadataParams {
  slug: string;
  product: string;
}

async function fetchJsonOrNull<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), METADATA_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      next: { revalidate: METADATA_REVALIDATE_SECONDS },
      signal: controller.signal,
    } as FetchInitWithNext);

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return (payload?.data || payload) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function truncateDescription(value: string): string {
  return value.length > 160 ? value.slice(0, 160) : value;
}

export async function generateProductMetadata({
  slug,
  product: productId,
}: ProductMetadataParams): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecomerce-web.vercel.app';

  const [storeResult, productResult] = await Promise.allSettled([
    fetchJsonOrNull<Store>(`${API_URL}/stores/slug/${slug}`),
    fetchJsonOrNull<Product>(`${API_URL}/products/${productId}`),
  ]);

  const store = storeResult.status === 'fulfilled' ? storeResult.value : null;
  const product = productResult.status === 'fulfilled' ? productResult.value : null;

  if (!product?.title) {
    return { title: FALLBACK_TITLE };
  }

  const storeName = store?.name || 'Ecomerce';
  const title = `${product.title} - ${storeName}`;
  const description = truncateDescription(product.description || product.title);
  const imageUrl = product.imageUrl || product.images?.[0];
  const url = `${baseUrl}/store/${slug}/${product.id || productId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      siteName: storeName,
      ...(imageUrl
        ? { images: [{ url: imageUrl, width: 600, height: 600, alt: product.title }] }
        : {}),
      locale: 'es_CO',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}
