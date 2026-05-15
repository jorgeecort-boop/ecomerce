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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}) {
  const { slug, product: productId } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecomerce-web.vercel.app';

  return {
    title: 'Product',
    description: 'Product details',
    openGraph: {
      title: 'Product',
      description: 'Product details',
      type: 'product' as const,
      url: `${baseUrl}/store/${slug}/${productId}`,
      locale: 'es_CO',
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: 'Product',
      description: 'Product details',
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string; product: string };
}) {
  const { slug, product: productId } = params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecomerce-web.vercel.app';

  const storeRes = await fetch(`${API_URL}/stores/slug/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!storeRes.ok) notFound();
  const storeRaw = await storeRes.json();
  const store: Store = storeRaw.data || storeRaw;

  const productRes = await fetch(`${API_URL}/products/${productId}`, {
    next: { revalidate: 60 },
  });
  if (!productRes.ok) notFound();
  const productRaw = await productRes.json();
  const product: Product = productRaw.data || productRaw;

  let relatedProducts: Product[] = [];
  try {
    const relatedRes = await fetch(`${API_URL}/products/store/${store.id}/public?limit=4`, {
      next: { revalidate: 60 },
    });
    if (relatedRes.ok) {
      const relatedRaw = await relatedRes.json();
      const raw = relatedRaw.data || relatedRaw;
      relatedProducts = (Array.isArray(raw) ? raw : [])
        .filter((p: Product) => p.id !== productId)
        .slice(0, 4);
    }
  } catch {
    relatedProducts = [];
  }

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
