import { API_URL } from '@ecomerce/utils';

export interface HomeCategoryCard {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  slug: string;
}

export async function getHomeProducts(limit = 8): Promise<HomeCategoryCard[]> {
  const response = await fetch(`${API_URL}/products/home/cards?limit=${limit}`, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error('Failed to load products');
  }

  const json = await response.json();
  const data = (json.data || json) as HomeCategoryCard[];
  return Array.isArray(data) ? data : [];
}
