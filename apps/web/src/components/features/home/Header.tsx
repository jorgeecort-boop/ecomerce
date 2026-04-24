'use client';

import Link from 'next/link';
import { useState } from 'react';

const defaultNavItems = [
  { label: 'Maquinas', href: '#' },
  { label: 'Capsulas', href: '#' },
  { label: 'Accesorios', href: '#' },
  { label: 'Suscripcion', href: '#' },
  { label: 'Aprende', href: '#' },
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
  logoText = 'MARCA®',
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
    <header className="sticky top-0 z-[100] border-b border-black/10 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
      <div className="relative mx-auto flex h-16 w-full max-w-site items-center justify-between px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={isMobileMenuOpen}
          onClick={toggleMobileMenu}
          className="z-10 flex flex-col gap-[5px] p-1 md:hidden"
        >
          <span className="block h-0.5 w-6 rounded bg-text" />
          <span className="block h-0.5 w-6 rounded bg-text" />
          <span className="block h-0.5 w-6 rounded bg-text" />
        </button>

        <Link
          href="/"
          aria-label="Inicio"
          className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
        >
          <div className="flex h-9 w-[120px] items-center justify-center rounded bg-primary text-base font-extrabold tracking-[0.15em] text-white">
            {logoText}
          </div>
        </Link>

        <nav
          aria-label="Navegacion principal"
          className="hidden items-center gap-8 text-sm font-semibold text-secondary md:flex"
        >
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="hover:text-primary">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="z-10 flex items-center gap-4">
          <button
            type="button"
            aria-label="Buscar"
            onClick={onSearchClick}
            className="inline-flex items-center text-text"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button
            type="button"
            aria-label={`Carrito (${cartCount} articulos)`}
            onClick={onCartClick}
            className="inline-flex items-center text-text"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <nav
          aria-label="Navegacion movil"
          className="border-t border-black/10 bg-white px-4 py-4 shadow-card md:hidden"
        >
          <ul className="space-y-3">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="block text-sm font-semibold text-secondary hover:text-primary"
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
