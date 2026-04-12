'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
  return response.json();
}

export interface ShopifyStats {
  totalOrders: number;
  pendingOrders: number;
  fulfilledOrders: number;
  totalRevenue: number;
  fulfillmentRate: number;
}

export interface SyncOrder {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  currency: string;
  supplierOrderIds: string[];
  trackingNumbers: string[];
  createdAt: string;
  updatedAt: string;
}

export function useShopify(pollInterval: number = 0) {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [syncOrders, setSyncOrders] = useState<SyncOrder[]>([]);
  const [stats, setStats] = useState<ShopifyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };

  const clearError = useCallback(() => setError(null), []);

  const fetchOrders = useCallback(async (status = 'any', limit = 50) => {
    const token = getToken();
    if (!token) { setError('Not authenticated'); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<any[]>(
        `/shopify/orders?status=${status}&limit=${limit}`,
        { token },
      );
      setOrders(data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async (limit = 50) => {
    const token = getToken();
    if (!token) { setError('Not authenticated'); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<any[]>(`/shopify/products?limit=${limit}`, { token });
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSyncOrders = useCallback(async (storeId?: string) => {
    const token = getToken();
    if (!token) { setError('Not authenticated'); return; }
    setLoading(true);
    setError(null);
    try {
      const url = storeId
        ? `/shopify/sync/orders?storeId=${storeId}`
        : '/shopify/sync/orders';
      const data = await fetchApi<SyncOrder[]>(url, { token });
      setSyncOrders(data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (storeId?: string) => {
    const token = getToken();
    if (!token) { setError('Not authenticated'); return; }
    setLoading(true);
    setError(null);
    try {
      const url = storeId
        ? `/shopify/sync/stats?storeId=${storeId}`
        : '/shopify/sync/stats';
      const data = await fetchApi<ShopifyStats>(url, { token });
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fulfillOrder = useCallback(
    async (orderId: number, trackingCompany?: string, trackingNumbers?: string[]) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchApi<any>('/shopify/fulfill', {
        method: 'POST',
        body: JSON.stringify({ orderId, trackingCompany, trackingNumbers }),
        token,
      });
    },
    [],
  );

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pollInterval > 0) {
      pollingRef.current = setInterval(() => {
        // Silently refresh sync orders and stats without setting loading
        const token = getToken();
        if (!token) return;

        fetchApi<SyncOrder[]>('/shopify/sync/orders', { token })
          .then(setSyncOrders)
          .catch(() => {});

        fetchApi<ShopifyStats>('/shopify/sync/stats', { token })
          .then(setStats)
          .catch(() => {});

        setLastRefresh(new Date());
      }, pollInterval);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollInterval]);

  return {
    orders,
    products,
    syncOrders,
    stats,
    loading,
    error,
    lastRefresh,
    clearError,
    fetchOrders,
    fetchProducts,
    fetchSyncOrders,
    fetchStats,
    fulfillOrder,
  };
}

export function useDashboardUnified() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };

  const fetchStats = useCallback(async (storeId?: string) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const url = storeId
        ? `/dashboard/unified/stats?storeId=${storeId}`
        : '/dashboard/unified/stats';
      const data = await fetchApi<any>(url, { token });
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (storeId?: string, status?: string) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      let url = '/dashboard/unified/orders';
      const params = new URLSearchParams();
      if (storeId) params.append('storeId', storeId);
      if (status) params.append('status', status);
      if (params.toString()) url += `?${params}`;
      const data = await fetchApi<any>(url, { token });
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInventory = useCallback(async (storeId?: string) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const url = storeId
        ? `/dashboard/unified/inventory?storeId=${storeId}`
        : '/dashboard/unified/inventory';
      const data = await fetchApi<any>(url, { token });
      setInventory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    orders,
    inventory,
    loading,
    error,
    fetchStats,
    fetchOrders,
    fetchInventory,
  };
}
