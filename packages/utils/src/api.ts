export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  const json = await response.json();
  return (json.data || json) as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchApi<{ accessToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (email: string, password: string, name?: string) =>
      fetchApi<{ accessToken: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
  },

  stores: {
    getAll: (token: string) => fetchApi<any[]>('/stores', { token }),

    getById: (token: string, id: string) => fetchApi<any>(`/stores/${id}`, { token }),

    create: (token: string, data: { name: string; slug?: string; logoUrl?: string }) =>
      fetchApi<any>('/stores', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),

    update: (token: string, id: string, data: Partial<any>) =>
      fetchApi<any>(`/stores/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      }),

    delete: (token: string, id: string) =>
      fetchApi<{ success: boolean }>(`/stores/${id}`, {
        method: 'DELETE',
        token,
      }),
  },

  products: {
    getByStore: (token: string, storeId: string) =>
      fetchApi<any[]>(`/products/store/${storeId}`, { token }),

    getById: (token: string, id: string) => fetchApi<any>(`/products/${id}`, { token }),

    create: (token: string, data: any) =>
      fetchApi<any>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),

    update: (token: string, id: string, data: Partial<any>) =>
      fetchApi<any>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
      }),

    delete: (token: string, id: string) =>
      fetchApi<{ success: boolean }>(`/products/${id}`, {
        method: 'DELETE',
        token,
      }),

    publish: (token: string, id: string) =>
      fetchApi<any>(`/products/${id}/publish`, {
        method: 'POST',
        token,
      }),

    unpublish: (token: string, id: string) =>
      fetchApi<any>(`/products/${id}/unpublish`, {
        method: 'POST',
        token,
      }),
  },

  orders: {
    getByStore: (token: string, storeId: string) =>
      fetchApi<any[]>(`/orders/store/${storeId}`, { token }),

    getById: (token: string, id: string) => fetchApi<any>(`/orders/${id}`, { token }),

    getStats: (token: string, storeId: string) =>
      fetchApi<any>(`/orders/store/${storeId}/stats`, { token }),

    updateStatus: (token: string, id: string, status: string) =>
      fetchApi<any>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        token,
      }),
  },

  suppliers: {
    getAll: (token: string) => fetchApi<any[]>('/suppliers', { token }),

    getById: (token: string, id: string) => fetchApi<any>(`/suppliers/${id}`, { token }),

    create: (token: string, data: any) =>
      fetchApi<any>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),

    search: (token: string, code: string, query: string, page?: number, limit?: number) => {
      const params = new URLSearchParams({ query });
      if (page) params.append('page', String(page));
      if (limit) params.append('limit', String(limit));
      return fetchApi<any>(`/suppliers/search/${code}?${params}`, { token });
    },

    sync: (token: string, id: string) =>
      fetchApi<{ synced: number }>(`/suppliers/${id}/sync`, {
        method: 'POST',
        token,
      }),

    import: (
      token: string,
      code: string,
      externalIds: string[],
      storeId: string,
      markup?: number
    ) =>
      fetchApi<{ success: string[]; failed: string[] }>(`/suppliers/import/${code}`, {
        method: 'POST',
        body: JSON.stringify({ externalIds, storeId, markup }),
        token,
      }),
  },

  trending: {
    getAll: (options?: {
      source?: string;
      isImported?: boolean;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (options?.source) params.append('source', options.source);
      if (options?.isImported !== undefined)
        params.append('isImported', String(options.isImported));
      if (options?.page) params.append('page', String(options.page));
      if (options?.limit) params.append('limit', String(options.limit));
      return fetchApi<{ products: any[]; total: number }>(`/trending?${params}`);
    },

    getTop: (limit?: number) => fetchApi<any[]>(`/trending/top${limit ? `?limit=${limit}` : ''}`),

    scrapeTikTok: (token: string, hashtags?: string[]) => {
      const params = hashtags?.length ? `?hashtags=${hashtags.join(',')}` : '';
      return fetchApi<{ scraped: number }>(`/trending/scrape/tiktok${params}`, {
        method: 'POST',
        token,
      });
    },

    scrapeInstagram: (token: string, hashtags?: string[]) => {
      const params = hashtags?.length ? `?hashtags=${hashtags.join(',')}` : '';
      return fetchApi<{ scraped: number }>(`/trending/scrape/instagram${params}`, {
        method: 'POST',
        token,
      });
    },
  },

  cart: {
    get: (storeId: string, sessionId?: string) => {
      const params = new URLSearchParams({ storeId });
      if (sessionId) params.append('sessionId', sessionId);
      return fetchApi<any>(`/cart?${params}`);
    },

    addItem: (
      storeId: string,
      productId: string,
      quantity?: number,
      variant?: any,
      sessionId?: string
    ) =>
      fetchApi<any>(`/cart/items?storeId=${storeId}`, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity, variant, sessionId }),
      }),

    updateItem: (cartId: string, productId: string, quantity: number) =>
      fetchApi<any>(`/cart/items/${productId}?cartId=${cartId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),

    removeItem: (cartId: string, productId: string) =>
      fetchApi<any>(`/cart/items/${productId}?cartId=${cartId}`, {
        method: 'DELETE',
      }),

    clear: (cartId: string) =>
      fetchApi<any>(`/cart/${cartId}`, {
        method: 'DELETE',
      }),

    checkout: (
      cartId: string,
      data: { shippingAddress?: any; customerEmail?: string; customerPhone?: string }
    ) =>
      fetchApi<{ orderId: string }>(`/cart/${cartId}/checkout`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    merge: (token: string, sessionId: string) =>
      fetchApi<any>('/cart/merge', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
        token,
      }),
  },

  dashboard: {
    getStats: (token: string) => fetchApi<any>('/dashboard/stats', { token }),

    getStoreStats: (token: string, storeId: string) =>
      fetchApi<any>(`/dashboard/store/${storeId}/stats`, { token }),
  },
};
