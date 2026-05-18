'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ArrowRight, Package, Headphones, Truck } from 'lucide-react';

interface StoreHeroProps {
  storeName: string;
  productCount: number;
}

export default function StoreHero({ storeName, productCount }: StoreHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const shippingRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.fromTo(logoRef.current, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 1.0 }, 0)
      .fromTo(badgeRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.3)
      .fromTo(titleRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.5)
      .fromTo(subtitleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.7)
      .fromTo(shippingRef.current, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.85)
      .fromTo(statsRef.current?.children || [], { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, 1.0)
      .fromTo(ctaRef.current, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 1.2);

    return () => { tl.kill(); };
  }, []);

  const scrollToProducts = () => {
    const el = document.getElementById('productos');
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative pt-28 pb-16 overflow-hidden"
      style={{ backgroundColor: '#03045E' }}
    >
      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(0,180,216,0.06)] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[rgba(228,255,26,0.04)] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-[rgba(255,0,110,0.04)] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 px-6 lg:px-10 max-w-[800px] mx-auto text-center">
        {/* Big Logo */}
        <div ref={logoRef} className="mb-6">
          <h2 className="text-[72px] max-[768px]:text-[52px] max-[480px]:text-[40px] font-bold tracking-[-3px] leading-none text-gradient-aurora shimmer-text">
            SarahBits
          </h2>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[rgba(0,180,216,0.4)]" />
            <span className="logo-dot w-2.5 h-2.5 bg-[#00B4D8] rounded-full inline-block" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[rgba(0,180,216,0.4)]" />
          </div>
        </div>

        {/* Badge */}
        <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[rgba(228,255,26,0.12)] border border-[rgba(228,255,26,0.2)] mb-5">
          <span className="fire-pulse inline-block">🔥</span>
          <span className="text-[#E4FF1A] text-sm font-medium">Tienda Oficial</span>
        </div>

        {/* Store Name */}
        <h1
          ref={titleRef}
          className="text-white text-4xl md:text-5xl font-medium tracking-[-1.5px] leading-tight mb-3"
        >
          {storeName}
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-[rgba(255,255,255,0.55)] text-lg leading-relaxed max-w-[500px] mx-auto"
        >
          Los mejores gadgets tecnológicos al mejor precio. Audio, Gaming, Streaming y más.
        </p>

        {/* Shipping */}
        <p ref={shippingRef} className="text-[#E4FF1A] text-base font-medium mt-2">
          Envío gratis en compras +$60.000 COP
        </p>

        {/* Stats */}
        <div
          ref={statsRef}
          className="flex items-center justify-center gap-8 mt-10 max-[480px]:gap-4 max-[480px]:flex-wrap"
        >
          {[
            { icon: Package, value: productCount, label: 'PRODUCTOS' },
            { icon: Headphones, value: '24/7', label: 'SOPORTE' },
            { icon: Truck, value: '2-5 días', label: 'ENVÍO' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[rgba(0,180,216,0.12)] flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-[#90E0EF]" />
                </div>
                <div className="text-left">
                  <div className="text-white text-base font-semibold tracking-[-0.5px]">
                    {stat.value}
                  </div>
                  <div className="text-[rgba(255,255,255,0.5)] text-[10px] font-medium tracking-[1px] uppercase">
                    {stat.label}
                  </div>
                </div>
                {i < 2 && (
                  <div className="w-px h-8 bg-[rgba(255,255,255,0.12)] max-[480px]:hidden" />
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div ref={ctaRef} className="mt-10">
          <button
            onClick={scrollToProducts}
            className="gradient-hero-cta text-white px-10 py-4 rounded-full font-medium flex items-center gap-2 mx-auto hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,180,216,0.35)] transition-all duration-300 active:scale-95"
          >
            Explorar Productos <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
