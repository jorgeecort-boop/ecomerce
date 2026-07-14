'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Minus, Plus, ShoppingCart, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  images?: any;
  imageUrl?: string;
  inventory?: number;
  isFeatured?: boolean;
  category?: string;
  tags?: string[];
}

interface QuickViewModalProps {
  product: Product | null;
  storeSlug: string;
  currency: string;
  format: (amount: number) => string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  isWished: boolean;
  onToggleWishlist: (product: Product) => void;
}

function getImages(product: Product): string[] {
  const imgs: string[] = [];
  if (product.images && Array.isArray(product.images)) {
    imgs.push(...product.images);
  }
  if (product.imageUrl && !imgs.includes(product.imageUrl)) {
    imgs.push(product.imageUrl);
  }
  return imgs;
}

export default function QuickViewModal({
  product,
  storeSlug,
  currency,
  format,
  isOpen,
  onClose,
  onAddToCart,
  isWished,
  onToggleWishlist,
}: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedImage(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!product) return null;

  const images = getImages(product);
  const isOutOfStock = (product.inventory ?? 0) === 0;
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0a0a0f] border border-[rgba(255,255,255,0.12)] shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.2)] transition-colors"
            >
              <X size={20} />
            </button>

            <div className="grid md:grid-cols-2 gap-0">
              {/* Image */}
              <div className="relative aspect-square bg-gradient-to-br from-[rgba(0,119,182,0.2)] to-[rgba(3,4,94,0.5)] p-6">
                {images[selectedImage] ? (
                  <Image
                    src={images[selectedImage]}
                    alt={product.title}
                    width={400}
                    height={400}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">⚡</div>
                )}

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === i
                            ? 'border-[#a8adb8]'
                            : 'border-[rgba(255,255,255,0.2)]'
                        }`}
                      >
                        <Image src={img} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6 md:p-8 flex flex-col">
                {product.category && (
                  <span className="text-xs px-2 py-1 rounded-full bg-[rgba(168,173,184,0.1)] text-[#a8adb8] border border-[rgba(168,173,184,0.2)] w-fit mb-3">
                    {product.category}
                  </span>
                )}

                <h2 className="text-white text-xl font-semibold leading-tight mb-2">
                  {product.title}
                </h2>

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-2xl font-bold text-gradient-aurora">
                    {format(Number(product.price))}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-[rgba(255,255,255,0.4)] line-through">
                      {format(Number(product.compareAtPrice))}
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="text-sm text-[rgba(255,255,255,0.55)] leading-relaxed mb-6 flex-1">
                    {product.description}
                  </p>
                )}

                {/* Stock */}
                <div className="mb-4">
                  {isOutOfStock ? (
                    <span className="text-red-400 text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      Agotado
                    </span>
                  ) : (
                    <span className="text-green-400 text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      En stock
                      {(product.inventory ?? 0) <= 10 && (
                        <span className="text-amber-400">— Solo {product.inventory} disponibles</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center border border-[rgba(255,255,255,0.15)] rounded-xl overflow-hidden bg-[rgba(255,255,255,0.04)]">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-4 py-2.5 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="px-4 py-2.5 text-sm font-semibold text-white min-w-[40px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-4 py-2.5 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => onToggleWishlist(product)}
                    className={`p-3 rounded-xl border transition-all ${
                      isWished
                        ? 'bg-pink-500/20 border-pink-500/40 text-pink-400'
                        : 'border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.5)] hover:border-pink-500/40 hover:text-pink-400'
                    }`}
                  >
                    <Heart size={20} fill={isWished ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={() => { onAddToCart(product, quantity); onClose(); }}
                  disabled={isOutOfStock}
                  className={`w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isOutOfStock
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'gradient-hero-cta text-white hover:shadow-lg hover:shadow-blue-500/20'
                  }`}
                >
                  <ShoppingCart size={18} />
                  {isOutOfStock ? 'Agotado' : `Agregar al carrito — ${format(Number(product.price) * quantity)}`}
                </button>

                {/* View Details */}
                <Link
                  href={`/store/${storeSlug}/${product.id}`}
                  onClick={onClose}
                  className="mt-3 text-center text-sm text-[#d0d5dc] hover:text-white transition-colors"
                >
                  Ver detalles del producto →
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
