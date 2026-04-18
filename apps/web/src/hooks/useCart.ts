'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

export function useCart(slug: string) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `cart_${slug}`;

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch {
        setCart([]);
      }
    }
    setIsLoading(false);
  }, [slug]);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    sessionStorage.setItem(storageKey, JSON.stringify(newCart));
  };

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        let newCart: CartItem[];
        if (existing) {
          newCart = prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
          );
        } else {
          newCart = [...prev, { ...item, quantity }];
        }
        sessionStorage.setItem(storageKey, JSON.stringify(newCart));
        return newCart;
      });
    },
    [storageKey]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setCart((prev) => {
        const newCart = prev.filter((i) => i.id !== itemId);
        sessionStorage.setItem(storageKey, JSON.stringify(newCart));
        return newCart;
      });
    },
    [storageKey]
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      setCart((prev) => {
        const newCart = prev
          .map((i) => (i.id === itemId ? { ...i, quantity: Math.max(0, quantity) } : i))
          .filter((i) => i.quantity > 0);
        sessionStorage.setItem(storageKey, JSON.stringify(newCart));
        return newCart;
      });
    },
    [storageKey]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
  };
}
