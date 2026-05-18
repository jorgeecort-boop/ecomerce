'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Productos', href: '#productos' },
  { label: 'Ofertas', href: '#ofertas' },
  { label: 'Categorías', href: '#categorias' },
  { label: 'Reseñas', href: '#resenas' },
];

interface NavigationProps {
  cartCount?: number;
  onCartClick?: () => void;
  onStoreClick?: () => void;
}

export default function Navigation({ cartCount, onCartClick, onStoreClick }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = navLinks.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.3 }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 h-[72px] z-[100] flex items-center justify-between px-10 max-[768px]:px-5 transition-all duration-400 ${
          scrolled
            ? 'bg-[rgba(3,4,94,0.85)] backdrop-blur-[12px]'
            : 'bg-transparent'
        }`}
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <span className="relative">
            <span className="text-white text-xl font-semibold">SarahBits</span>
            <span className="logo-dot absolute -right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#00B4D8] rounded-full" />
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden max-[768px]:hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
              className={`relative text-sm transition-colors duration-200 ${
                activeSection === link.href.slice(1)
                  ? 'text-white'
                  : 'text-[rgba(255,255,255,0.55)] hover:text-white'
              }`}
            >
              {link.label}
              <span
                className={`absolute -bottom-1 left-0 h-[2px] bg-[#00B4D8] transition-transform duration-300 origin-center ${
                  activeSection === link.href.slice(1)
                    ? 'w-full scale-x-100'
                    : 'w-full scale-x-0 group-hover:scale-x-100'
                }`}
                style={{ transform: activeSection === link.href.slice(1) ? 'scaleX(1)' : 'scaleX(0)' }}
              />
            </a>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <button
            onClick={onCartClick}
            className="relative text-[rgba(255,255,255,0.55)] hover:text-white transition-colors duration-200"
          >
            <ShoppingCart size={22} />
            {cartCount && cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#00B4D8] text-[#03045E] text-xs font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={onStoreClick}
            className="hidden max-[768px]:hidden md:inline-block bg-[#00B4D8] text-[#03045E] text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#90E0EF] hover:scale-[1.03] transition-all duration-300"
          >
            Ver Tienda
          </button>
          <button
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[99] bg-[#03045E]/95 backdrop-blur-lg md:hidden">
          <div className="flex flex-col items-center justify-center h-full gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
                className="text-white text-xl font-medium"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={onStoreClick}
              className="bg-[#00B4D8] text-[#03045E] font-medium px-8 py-3 rounded-full mt-4"
            >
              Ver Tienda
            </button>
          </div>
        </div>
      )}
    </>
  );
}
