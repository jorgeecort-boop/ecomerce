'use client';

import { useState, useCallback, useEffect } from 'react';
import { api } from '@ecomerce/utils';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      setUser({ token });
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    localStorage.setItem('token', response.accessToken);
    setUser({ token: response.accessToken, ...response.user });
    return response;
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const response = await api.auth.register(email, password, name);
    localStorage.setItem('token', response.accessToken);
    setUser({ token: response.accessToken, ...response.user });
    return response;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return { user, loading, login, register, logout, isAuthenticated: !!user };
}

export function useStores() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStores = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.stores.getAll(token);
      setStores(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const createStore = useCallback(async (data: { name: string; slug?: string }) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const store = await api.stores.create(token, data);
    setStores((prev) => [...prev, store]);
    return store;
  }, []);

  return { stores, loading, fetchStores, createStore };
}

export function useProducts(storeId?: string) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!storeId) return;
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.products.getByStore(token, storeId);
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const createProduct = useCallback(async (data: any) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const product = await api.products.create(token, data);
    setProducts((prev) => [...prev, product]);
    return product;
  }, []);

  const updateProduct = useCallback(async (id: string, data: any) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const product = await api.products.update(token, id, data);
    setProducts((prev) => prev.map((p) => (p.id === id ? product : p)));
    return product;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    await api.products.delete(token, id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (storeId) {
      fetchProducts();
    }
  }, [storeId, fetchProducts]);

  return { products, loading, fetchProducts, createProduct, updateProduct, deleteProduct };
}

export function useOrders(storeId?: string) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!storeId) return;
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.orders.getByStore(token, storeId);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      fetchOrders();
    }
  }, [storeId, fetchOrders]);

  return { orders, loading, fetchOrders };
}

export function useCart(storeId: string) {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(
    async (sessionId?: string) => {
      setLoading(true);
      try {
        const data = await api.cart.get(storeId, sessionId);
        setCart(data);
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  const addItem = useCallback(
    async (productId: string, quantity = 1, variant?: any, sessionId?: string) => {
      const data = await api.cart.addItem(storeId, productId, quantity, variant, sessionId);
      setCart(data);
      return data;
    },
    [storeId]
  );

  const updateItem = useCallback(
    async (productId: string, quantity: number) => {
      if (!cart) return;
      const data = await api.cart.updateItem(cart.id, productId, quantity);
      setCart(data);
      return data;
    },
    [cart]
  );

  const removeItem = useCallback(
    async (productId: string) => {
      if (!cart) return;
      const data = await api.cart.removeItem(cart.id, productId);
      setCart(data);
      return data;
    },
    [cart]
  );

  const checkout = useCallback(
    async (data: { shippingAddress?: any; customerEmail?: string; customerPhone?: string }) => {
      if (!cart) throw new Error('No cart');
      const result = await api.cart.checkout(cart.id, data);
      setCart(null);
      return result;
    },
    [cart]
  );

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return { cart, loading, fetchCart, addItem, updateItem, removeItem, checkout };
}

export function useDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (storeId?: string) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = storeId
        ? await api.dashboard.getStoreStats(token, storeId)
        : await api.dashboard.getStats(token);
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, fetchStats };
}

export function useTrending() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrending = useCallback(async (options?: { source?: string; limit?: number }) => {
    setLoading(true);
    try {
      const data = await api.trending.getAll({ ...options, limit: options?.limit || 20 });
      setProducts(data.products);
    } finally {
      setLoading(false);
    }
  }, []);

  const scrapeTikTok = useCallback(async (hashtags?: string[]) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    return api.trending.scrapeTikTok(token, hashtags);
  }, []);

  const scrapeInstagram = useCallback(async (hashtags?: string[]) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    return api.trending.scrapeInstagram(token, hashtags);
  }, []);

  return { products, loading, fetchTrending, scrapeTikTok, scrapeInstagram };
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.suppliers.getAll(token);
      setSuppliers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchProducts = useCallback(
    async (code: string, query: string, page?: number, limit?: number) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return api.suppliers.search(token, code, query, page, limit);
    },
    []
  );

  const syncSupplier = useCallback(async (id: string) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const result = await api.suppliers.sync(token, id);
    return result;
  }, []);

  const importProducts = useCallback(
    async (code: string, externalIds: string[], storeId: string, markup?: number) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return api.suppliers.import(token, code, externalIds, storeId, markup);
    },
    []
  );

  return { suppliers, loading, fetchSuppliers, searchProducts, syncSupplier, importProducts };
}
