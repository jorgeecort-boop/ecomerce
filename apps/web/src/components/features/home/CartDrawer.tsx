'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string;
}

export function CartDrawer({ isOpen, onClose, storeSlug }: CartDrawerProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const storageKey = `cart_${storeSlug}`;

  const loadCart = () => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch {
        setCart([]);
      }
    } else {
      setCart([]);
    }
  };

  useEffect(() => {
    if (isOpen) loadCart();
  }, [isOpen]);

  const updateQuantity = (itemId: string, quantity: number) => {
    const newCart = cart
      .map((i) => (i.id === itemId ? { ...i, quantity: Math.max(0, quantity) } : i))
      .filter((i) => i.quantity > 0);
    setCart(newCart);
    sessionStorage.setItem(storageKey, JSON.stringify(newCart));
  };

  const removeItem = (itemId: string) => {
    const newCart = cart.filter((i) => i.id !== itemId);
    setCart(newCart);
    sessionStorage.setItem(storageKey, JSON.stringify(newCart));
  };

  const clearCart = () => {
    setCart([]);
    sessionStorage.removeItem(storageKey);
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[210] flex flex-col animate-[slideIn_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <h2 className="text-lg font-bold text-slate-900">
              Carrito ({count})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-slate-500 font-medium">Tu carrito esta vacio</p>
              <Link
                href="/store/tienda-demo"
                onClick={onClose}
                className="mt-4 px-6 py-2 rounded-full bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
              >
                Ir a la tienda
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li key={item.id} className="flex gap-4 bg-slate-50 rounded-xl p-3">
                  {item.imageUrl && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                      <Image src={item.imageUrl} alt={item.title} fill sizes="64px" className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{item.title}</h3>
                    <p className="text-base font-bold text-indigo-600 mt-1">
                      ${(item.price * item.quantity).toLocaleString('es-CO')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-sm font-bold"
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold text-slate-900 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-sm font-bold"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-slate-200 px-6 py-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-600 font-medium">Total:</span>
              <span className="text-2xl font-extrabold text-slate-900">
                ${total.toLocaleString('es-CO')}
              </span>
            </div>
            <Link
              href={`/store/${storeSlug}/checkout`}
              onClick={onClose}
              className="block w-full py-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-center hover:opacity-90 transition-opacity shadow-lg shadow-indigo-200"
            >
              Ir al Checkout
            </Link>
            <button
              onClick={clearCart}
              className="block w-full py-2 mt-2 text-sm text-slate-500 hover:text-red-500 font-medium transition-colors"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

export default CartDrawer;
