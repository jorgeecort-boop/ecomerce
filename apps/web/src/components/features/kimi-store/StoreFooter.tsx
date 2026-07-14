'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

const categoryLinks = [
  { label: 'Audio', href: '#' },
  { label: 'Gaming', href: '#' },
  { label: 'Streaming', href: '#' },
  { label: 'Wearables', href: '#' },
  { label: 'Electrónica', href: '#' },
];

const helpLinks = [
  { label: 'Envíos', href: '#' },
  { label: 'Devoluciones', href: '#' },
  { label: 'FAQ', href: '#' },
  { label: 'Contacto', href: '#' },
];

const legalLinks = [
  { label: 'Privacidad', href: '#' },
  { label: 'Términos', href: '#' },
  { label: 'Cookies', href: '#' },
];

export default function StoreFooter() {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!footerRef.current) return;
    const cols = footerRef.current.querySelectorAll('.footer-col');
    gsap.fromTo(
      cols,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: footerRef.current,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      }
    );
  }, []);

  return (
    <footer
      ref={footerRef}
      className="border-t border-[rgba(255,255,255,0.12)]"
      style={{ backgroundColor: '#0a0a0f' }}
    >
      <div className="px-10 max-[768px]:px-5 max-w-[1200px] mx-auto py-20 max-[768px]:py-12">
        <div className="flex max-[768px]:flex-col max-[768px]:text-center max-[768px]:gap-10 justify-between gap-10">
          {/* Brand Column */}
          <div className="footer-col w-[40%] max-[768px]:w-full">
            <div className="flex items-center gap-2 mb-4 max-[768px]:justify-center">
              <span className="text-white text-2xl font-semibold">SaraTech</span>
              <span className="logo-dot w-2 h-2 bg-[#a8adb8] rounded-full inline-block" />
            </div>
            <p className="text-[rgba(255,255,255,0.55)] text-base leading-relaxed max-w-[320px] max-[768px]:mx-auto">
              Gadgets tecnológicos premium para tu setup diario. Los mejores
              productos al mejor precio con envío a toda Colombia.
            </p>
            <div className="flex gap-4 mt-6 max-[768px]:justify-center">
              <a href="https://wa.me/573000000000" target="_blank" rel="noopener noreferrer" className="text-[rgba(255,255,255,0.55)] hover:text-[#a8adb8] transition-colors duration-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </a>
              <a href="#" className="text-[rgba(255,255,255,0.55)] hover:text-[#a8adb8] transition-colors duration-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
            </div>
          </div>

          {/* Categories Column */}
          <div className="footer-col w-[20%] max-[768px]:w-full">
            <h4 className="text-[#d0d5dc] text-xs font-medium tracking-[1.12px] uppercase mb-4">
              CATEGORÍAS
            </h4>
            <ul className="space-y-3">
              {categoryLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-[rgba(255,255,255,0.55)] text-base hover:text-white transition-colors duration-200">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Help Column */}
          <div className="footer-col w-[20%] max-[768px]:w-full">
            <h4 className="text-[#d0d5dc] text-xs font-medium tracking-[1.12px] uppercase mb-4">
              AYUDA
            </h4>
            <ul className="space-y-3">
              {helpLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-[rgba(255,255,255,0.55)] text-base hover:text-white transition-colors duration-200">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div className="footer-col w-[20%] max-[768px]:w-full">
            <h4 className="text-[#d0d5dc] text-xs font-medium tracking-[1.12px] uppercase mb-4">
              LEGAL
            </h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-[rgba(255,255,255,0.55)] text-base hover:text-white transition-colors duration-200">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[rgba(255,255,255,0.12)] px-10 max-[768px]:px-5 py-6">
        <div className="max-w-[1200px] mx-auto flex max-[768px]:flex-col max-[768px]:text-center max-[768px]:gap-2 items-center justify-between">
          <span className="text-[rgba(255,255,255,0.55)] text-[13px]">
            © 2025 SaraTech. Todos los derechos reservados.
          </span>
          <span className="text-[rgba(255,255,255,0.55)] text-[13px]">
            🇨🇴 Hecho en Colombia
          </span>
        </div>
      </div>
    </footer>
  );
}
