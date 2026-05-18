'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

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

interface ProductCardProps {
  product: Product;
  index: number;
  storeSlug: string;
  currency: string;
  format: (amount: number) => string;
  isWished: boolean;
  isAdded: boolean;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  onQuickView: () => void;
}

function getFirstImage(product: Product): string | undefined {
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }
  if (product.imageUrl) return product.imageUrl;
  return undefined;
}

function getSecondImage(product: Product): string | undefined {
  if (product.images && Array.isArray(product.images) && product.images.length > 1) {
    return product.images[1];
  }
  return undefined;
}

export default function ProductCard({
  product,
  index,
  storeSlug,
  currency,
  format,
  isWished,
  isAdded,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isOutOfStock = (product.inventory ?? 0) === 0;
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100)
    : 0;
  const firstImg = getFirstImage(product);
  const secondImg = getSecondImage(product);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: (index % 12) * 0.08 }}
      className={`group relative bg-[rgba(255,255,255,0.04)] border rounded-2xl overflow-hidden transition-all duration-400 hover:shadow-[0_20px_60px_rgba(0,180,216,0.12)] ${
        isOutOfStock
          ? 'border-[rgba(255,255,255,0.06)] opacity-60'
          : 'border-[rgba(255,255,255,0.12)] hover:border-[rgba(0,180,216,0.3)]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-[rgba(0,119,182,0.15)] to-[rgba(3,4,94,0.5)] overflow-hidden">
        {firstImg ? (
          <>
            <Image
              src={firstImg}
              alt={product.title}
              width={400}
              height={400}
              className={`w-full h-full object-cover transition-all duration-500 ${isHovered && secondImg ? 'opacity-0 scale-110' : 'scale-100'}`}
              unoptimized
            />
            {secondImg && (
              <Image
                src={secondImg}
                alt={`${product.title} - vista 2`}
                width={400}
                height={400}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                unoptimized
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">⚡</div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isFeatured && (
            <span className="px-2 py-1 gradient-sale text-white text-[10px] font-bold rounded-lg shadow-lg">
              ⭐ Destacado
            </span>
          )}
          {hasDiscount && (
            <span className="px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-lg shadow-lg">
              -{discountPercent}%
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2 py-1 bg-gray-800/90 backdrop-blur text-gray-300 text-[10px] font-bold rounded-lg">
              Agotado
            </span>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 gap-2">
          <button
            onClick={(e) => { e.preventDefault(); onQuickView(); }}
            className="px-4 py-2 bg-white/90 text-[#03045E] rounded-lg text-xs font-bold hover:bg-white transition-colors active:scale-95 flex items-center gap-1.5"
          >
            <Eye size={14} /> Vista rápida
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onToggleWishlist(); }}
            className={`p-2 rounded-lg transition-colors active:scale-95 ${
              isWished
                ? 'bg-pink-500 text-white'
                : 'bg-white/90 text-[#03045E] hover:bg-white'
            }`}
          >
            <Heart size={16} fill={isWished ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {product.category && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(0,180,216,0.1)] text-[#00B4D8] border border-[rgba(0,180,216,0.2)]">
            {product.category}
          </span>
        )}
        <Link href={`/store/${storeSlug}/${product.id}`}>
          <h3 className="font-semibold text-white text-sm leading-tight mt-2 mb-1 line-clamp-2 group-hover:text-[#00B4D8] transition-colors">
            {product.title}
          </h3>
        </Link>
        <p className="text-xs text-[rgba(255,255,255,0.35)] mb-3 line-clamp-1">
          {product.description || 'Tech Gadget'}
        </p>

        {/* Price & Add */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-gradient-aurora">
              {format(Number(product.price))}
            </span>
            {hasDiscount && (
              <p className="text-[10px] text-[rgba(255,255,255,0.3)] line-through">
                {format(Number(product.compareAtPrice))}
              </p>
            )}
            {currency !== 'USD' && !hasDiscount && (
              <p className="text-[10px] text-[rgba(255,255,255,0.3)]">
                ${Number(product.price).toFixed(2)} USD
              </p>
            )}
          </div>
          <button
            onClick={() => !isOutOfStock && onAddToCart()}
            disabled={isOutOfStock}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${
              isOutOfStock
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : isAdded
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'gradient-hero-cta text-white hover:shadow-lg hover:shadow-blue-500/20'
            }`}
          >
            {isOutOfStock ? 'Agotado' : isAdded ? '✓ Added' : '+ Add'}
          </button>
        </div>

        {!isOutOfStock && (product.inventory ?? 0) > 0 && (product.inventory ?? 0) <= 10 && (
          <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Solo {product.inventory} disponibles
          </p>
        )}
      </div>
    </motion.div>
  );
}
