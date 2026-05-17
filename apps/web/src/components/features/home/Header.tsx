'use client';

import Link from 'next/link';
import { useState } from 'react';

const defaultNavItems = [
  { label: 'Audio', href: '/store/tienda-demo' },
  { label: 'Gaming', href: '/store/tienda-demo' },
  { label: 'Streaming', href: '/store/tienda-demo' },
  { label: 'Wearables', href: '/store/tienda-demo' },
  { label: 'Electronica', href: '/store/tienda-demo' },
];

export interface HeaderProps {
  logoText?: string;
  navItems?: Array<{ label: string; href: string }>;
  cartCount?: number;
  onMenuToggle?: (isOpen: boolean) => void;
  onSearchClick?: () => void;
  onCartClick?: () => void;
}

export function Header({
  logoText = 'SarahBits',
  navItems = defaultNavItems,
  cartCount = 0,
  onMenuToggle,
  onSearchClick,
  onCartClick,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => {
      const nextValue = !prev;
      onMenuToggle?.(nextValue);
      return nextValue;
    });
  };

  return (
    <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-sm">
      <div className="relative mx-auto flex h-16 w-full max-w-site items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Mobile menu button */}
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={isMobileMenuOpen}
          onClick={toggleMobileMenu}
          className="flex flex-col gap-[5px] p-1 md:hidden"
        >
          <span className={`block h-0.5 w-6 rounded bg-slate-700 transition-all ${isMobileMenuOpen ? 'rotate-45 translate-y-[5px]' : ''}`} />
          <span className={`block h-0.5 w-6 rounded bg-slate-700 transition-all ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-6 rounded bg-slate-700 transition-all ${isMobileMenuOpen ? '-rotate-45 -translate-y-[5px]' : ''}`} />
        </button>

        {/* Logo */}
        <Link
          href="/"
          aria-label="Inicio"
          className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">S</span>
            </div>
            <span className="text-lg font-extrabold tracking-wider text-slate-900 hidden sm:block">
              {logoText}
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Navegacion principal"
          className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="relative py-1 transition-colors hover:text-indigo-600 group"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Buscar"
            onClick={onSearchClick}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button
            type="button"
            aria-label={`Carrito (${cartCount} articulos)`}
            onClick={onCartClick}
            className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <nav
          aria-label="Navegacion movil"
          className="border-t border-slate-100 bg-white px-4 py-4 shadow-lg md:hidden"
        >
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="block py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Header;
