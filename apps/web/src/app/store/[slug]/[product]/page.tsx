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
  params: { slug: string; product: string };
}) {
  const { slug, product: productId } = params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ecomerce-web.vercel.app';

  try {
    const [storeRes, productRes] = await Promise.all([
      fetch(`${API_URL}/stores/slug/${slug}`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/products/${productId}`, { next: { revalidate: 60 } }),
    ]);

    if (!storeRes.ok || !productRes.ok) {
      return { title: 'Product' };
    }

    const storeRaw = await storeRes.json();
    const productRaw = await productRes.json();
    const store = storeRaw.data || storeRaw;
    const product = productRaw.data || productRaw;

    const title = `${product.title} - ${store.name}`;
    const description = product.description?.slice(0, 160) || product.title;
    const imageUrl = product.imageUrl || product.images?.[0];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'product' as const,
        url: `${baseUrl}/store/${slug}/${productId}`,
        siteName: store.name,
        ...(imageUrl ? { images: [{ url: imageUrl, width: 600, height: 600, alt: product.title }] } : {}),
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
    return { title: 'Product' };
  }
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
