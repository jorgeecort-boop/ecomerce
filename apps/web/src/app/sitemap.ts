import { MetadataRoute } from 'next';
import { API_URL } from '@ecomerce/utils';

const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://ecomerce-web.vercel.app';
const storeSlug = process.env.NEXT_PUBLIC_STORE_SLUG || 'tienda-demo';

async function fetchStoreId(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/stores/slug/${storeSlug}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.data || data)?.id || null;
  } catch {
    return null;
  }
}

async function fetchPublishedProducts(storeId: string): Promise<Array<{ id: string; updatedAt: string }>> {
  try {
    const res = await fetch(`${API_URL}/products/store/${storeId}/public?limit=500`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const products = data.data || data;
    if (!Array.isArray(products)) return [];
    return products
      .filter((p: any) => p.isPublished)
      .map((p: any) => ({ id: p.id, updatedAt: p.updatedAt }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/store/${storeSlug}`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/store/${storeSlug}/checkout`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/tracking`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const storeId = await fetchStoreId();
  if (storeId) {
    const products = await fetchPublishedProducts(storeId);
    for (const product of products) {
      entries.push({
        url: `${baseUrl}/store/${storeSlug}/${product.id}`,
        lastModified: new Date(product.updatedAt || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
