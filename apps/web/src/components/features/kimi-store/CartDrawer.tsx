'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currency: string;
  format: (amount: number) => string;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  storeSlug: string;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  currency,
  format,
  onUpdateQuantity,
  onRemove,
  storeSlug,
}: CartDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-0 right-0 h-full w-full max-w-md z-[80] bg-[#03045E] border-l border-[rgba(255,255,255,0.12)] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(255,255,255,0.1)]">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-[#00B4D8]" />
                <h2 className="text-white text-lg font-semibold">
                  Carrito ({items.length})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.15)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag size={48} className="text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
                  <p className="text-white text-lg font-medium mb-1">Tu carrito está vacío</p>
                  <p className="text-[rgba(255,255,255,0.5)] text-sm">Agrega productos para comenzar</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]"
                  >
                    <div className="w-16 h-16 rounded-lg bg-[rgba(255,255,255,0.06)] flex-shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.title} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">⚡</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      <p className="text-[#90E0EF] text-sm font-semibold mt-0.5">
                        {format(item.price)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-md bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.15)]"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-md bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.15)]"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="ml-auto text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-[rgba(255,255,255,0.1)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[rgba(255,255,255,0.6)]">Total</span>
                  <span className="text-white text-xl font-bold">{format(total)}</span>
                </div>
                <Link
                  href={`/store/${storeSlug}/checkout?items=${encodeURIComponent(JSON.stringify(items))}&currency=${currency}`}
                  onClick={onClose}
                  className="block w-full py-3.5 rounded-xl gradient-hero-cta text-white text-sm font-medium text-center hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
                >
                  Proceder al pago
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
