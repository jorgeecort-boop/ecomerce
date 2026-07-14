'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Heart, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WishlistItem {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
}

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: WishlistItem[];
  currency: string;
  format: (amount: number) => string;
  onRemove: (id: string) => void;
  storeSlug: string;
}

export default function WishlistDrawer({
  isOpen,
  onClose,
  items,
  format,
  onRemove,
  storeSlug,
}: WishlistDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

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
            className="fixed top-0 right-0 h-full w-full max-w-md z-[80] bg-[#0a0a0f] border-l border-[rgba(255,255,255,0.12)] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(255,255,255,0.1)]">
              <div className="flex items-center gap-2">
                <Heart size={20} className="text-pink-400" />
                <h2 className="text-white text-lg font-semibold">
                  Favoritos ({items.length})
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
                  <Heart size={48} className="text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
                  <p className="text-white text-lg font-medium mb-1">No tienes favoritos</p>
                  <p className="text-[rgba(255,255,255,0.5)] text-sm">Guarda productos para verlos aquí</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]"
                  >
                    <Link href={`/store/${storeSlug}/${item.id}`} onClick={onClose} className="w-16 h-16 rounded-lg bg-[rgba(255,255,255,0.06)] flex-shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.title} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">⚡</div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/store/${storeSlug}/${item.id}`} onClick={onClose}>
                        <p className="text-white text-sm font-medium truncate hover:text-[#a8adb8] transition-colors">{item.title}</p>
                      </Link>
                      <p className="text-[#d0d5dc] text-sm font-semibold mt-0.5">
                        {format(item.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="text-pink-400 hover:text-pink-300 transition-colors self-start"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-[rgba(255,255,255,0.1)]">
                <button
                  onClick={onClose}
                  className="w-full py-3.5 rounded-xl border border-[rgba(255,255,255,0.15)] text-white text-sm font-medium hover:bg-[rgba(255,255,255,0.06)] transition-all active:scale-95"
                >
                  Seguir comprando
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
