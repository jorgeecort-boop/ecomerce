'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CART_ABANDON_KEY = 'cart_last_active';
const ABANDON_THRESHOLD_MS = 60 * 60 * 1000;

export interface CartReminderItem {
  slug: string;
  count: number;
}

function getActiveCarts(): CartReminderItem[] {
  const results: CartReminderItem[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('cart_')) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const items = JSON.parse(raw);
          if (Array.isArray(items) && items.length > 0) {
            results.push({ slug: key.replace('cart_', ''), count: items.length });
          }
        } catch {}
      }
    }
  }
  return results;
}

export function AbandonedCartBanner() {
  const [visible, setVisible] = useState(false);
  const [carts, setCarts] = useState<CartReminderItem[]>([]);

  useEffect(() => {
    const activeCarts = getActiveCarts();
    if (activeCarts.length === 0) return;

    const lastActive = localStorage.getItem(CART_ABANDON_KEY);
    const now = Date.now();

    if (lastActive) {
      const elapsed = now - parseInt(lastActive, 10);
      if (elapsed > ABANDON_THRESHOLD_MS) {
        setCarts(activeCarts);
        setVisible(true);
      }
    }

    localStorage.setItem(CART_ABANDON_KEY, String(now));
  }, []);

  if (!visible || carts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[99] max-w-sm bg-[#1a1a2e] border border-[#a8adb8]/30 rounded-2xl p-4 shadow-2xl animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🛒</span>
        <div className="flex-1">
          <p className="text-white text-sm font-medium mb-1">
            Tienes {carts.reduce((s, c) => s + c.count, 0)} productos en tu carrito
          </p>
          <p className="text-gray-400 text-xs mb-3">
            ¿Quieres terminar tu compra?
          </p>
          {carts.map((cart) => (
            <Link
              key={cart.slug}
              href={`/store/${cart.slug}/checkout`}
              onClick={() => setVisible(false)}
              className="inline-block mr-2 mb-2 px-4 py-2 bg-[#a8adb8] text-[#0a0a0f] rounded-lg text-xs font-medium hover:bg-white transition-colors"
            >
              Ir al carrito
            </Link>
          ))}
          <button
            onClick={() => {
              setVisible(false);
              carts.forEach((c) => localStorage.removeItem(`cart_${c.slug}`));
            }}
            className="px-4 py-2 bg-transparent text-gray-500 text-xs hover:text-white transition-colors"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
