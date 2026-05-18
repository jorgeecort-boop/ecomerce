'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Heart, Search, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StoreNavigationProps {
  storeName: string;
  cartCount: number;
  wishlistCount: number;
  currency: string;
  onCartClick: () => void;
  onWishlistClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function StoreNavigation({
  storeName,
  cartCount,
  wishlistCount,
  currency,
  onCartClick,
  onWishlistClick,
  searchQuery,
  onSearchChange,
}: StoreNavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 h-[72px] z-[100] flex items-center justify-between px-6 lg:px-10 transition-all duration-500 ${
          scrolled
            ? 'bg-[rgba(3,4,94,0.9)] backdrop-blur-[12px] border-b border-[rgba(255,255,255,0.1)]'
            : 'bg-transparent'
        }`}
      >
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="relative">
            <span className="text-white text-xl font-semibold">SarahBits</span>
            <span className="logo-dot absolute -right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#00B4D8] rounded-full" />
          </span>
        </button>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Buscar productos..."
            className={`w-full bg-[rgba(255,255,255,0.06)] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[rgba(255,255,255,0.35)] outline-none transition-all duration-300 ${
              searchFocused
                ? 'border-[#00B4D8] shadow-[0_0_15px_rgba(0,180,216,0.15)]'
                : 'border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)]'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)] hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Currency */}
          <span className="hidden sm:inline-block text-xs text-[rgba(255,255,255,0.5)] px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]">
            {currency}
          </span>

          {/* Wishlist */}
          <button
            onClick={onWishlistClick}
            className="relative text-[rgba(255,255,255,0.55)] hover:text-pink-400 transition-colors duration-200"
          >
            <Heart size={22} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart */}
          <button
            onClick={onCartClick}
            className="relative text-[rgba(255,255,255,0.55)] hover:text-[#00B4D8] transition-colors duration-200"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#00B4D8] text-[#03045E] text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile Menu */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Search & Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[99] bg-[#03045E]/95 backdrop-blur-lg md:hidden pt-20 px-6">
          <div className="flex flex-col gap-6">
            {/* Mobile Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[rgba(255,255,255,0.35)] outline-none"
              />
            </div>
            <div className="text-center text-[rgba(255,255,255,0.55)] text-sm">
              {currency} · SarahBits Tienda
            </div>
          </div>
        </div>
      )}
    </>
  );
}
