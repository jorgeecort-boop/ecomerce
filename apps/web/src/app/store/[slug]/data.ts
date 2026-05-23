import { API_URL } from '@ecomerce/utils';

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  images?: unknown;
  inventory?: number;
  isPublished?: boolean;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

export type StoreDataResult =
  | { status: 'ok'; store: Store; products: Product[]; error: null }
  | { status: 'not_found'; store: null; products: []; error: string }
  | { status: 'unavailable'; store: null; products: []; error: string };

interface FetchStoreDataOptions {
  timeoutMs?: number;
  retryDelaysMs?: number[];
}

interface FetchJsonResult {
  ok: boolean;
  status: number;
  data: unknown;
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unwrapApiData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function isPublishedProduct(value: unknown): value is Product {
  return isRecord(value) && value.isPublished === true;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined;
}

async function fetchJsonWithRetry(
  url: string,
  { timeoutMs = 10000, retryDelaysMs = [500, 1500] }: FetchStoreDataOptions = {}
): Promise<FetchJsonResult> {
  let lastError = 'Connection failed';
  const attempts = retryDelaysMs.length + 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: createTimeoutSignal(timeoutMs),
        next: { revalidate: 60 },
      });

      const data = await response.json().catch(() => null);

      if (response.ok || !RETRYABLE_STATUSES.has(response.status) || attempt === attempts - 1) {
        return { ok: response.ok, status: response.status, data };
      }

      lastError = `API returned ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Connection failed';
      if (attempt === attempts - 1) {
        throw new Error(lastError);
      }
    }

    await delay(retryDelaysMs[attempt] ?? 0);
  }

  throw new Error(lastError);
}

export async function fetchStoreData(
  slug: string,
  options: FetchStoreDataOptions = {}
): Promise<StoreDataResult> {
  try {
    const storeResult = await fetchJsonWithRetry(`${API_URL}/stores/slug/${slug}`, options);

    if (!storeResult.ok) {
      return storeResult.status === 404
        ? { status: 'not_found', store: null, products: [], error: 'Store not found' }
        : {
            status: 'unavailable',
            store: null,
            products: [],
            error: `API returned ${storeResult.status}`,
          };
    }

    const storeData = unwrapApiData<Record<string, unknown>>(storeResult.data);
    const store = storeData as unknown as Store;
    let products: Product[] = [];

    if (Array.isArray(storeData.products)) {
      products = storeData.products.filter(isPublishedProduct);
    } else {
      const productsResult = await fetchJsonWithRetry(
        `${API_URL}/products/store/${store.id}/public?limit=50`,
        options
      );

      if (productsResult.ok) {
        const unwrappedProducts = unwrapApiData<unknown>(productsResult.data);
        products = Array.isArray(unwrappedProducts) ? unwrappedProducts.filter(isPublishedProduct) : [];
      }
    }

    return { status: 'ok', store, products, error: null };
  } catch (error) {
    return {
      status: 'unavailable',
      store: null,
      products: [],
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
