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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const logoSideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.fromTo(logoSideRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.5 }, 0)
      .fromTo(badgeRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.3)
      .fromTo(titleRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0 }, 0.5)
      .fromTo(subtitleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.7)
      .fromTo(statsRef.current?.children || [], { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 }, 0.9)
      .fromTo(ctaRef.current, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 1.1);

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
      className="relative min-h-[100dvh] flex max-[1024px]:flex-col overflow-hidden"
      style={{ backgroundColor: '#03045E' }}
    >
      {/* Left Content Zone */}
      <div className="relative z-10 w-[45%] max-[1024px]:w-full max-[1024px]:order-2 flex flex-col justify-center px-10 max-[768px]:px-5 py-20 max-[1024px]:py-12">
        <div className="max-w-[520px]">
          {/* Badge */}
          <div
            ref={badgeRef}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[rgba(228,255,26,0.12)] border border-[rgba(228,255,26,0.2)] mb-6"
          >
            <span className="fire-pulse inline-block">🔥</span>
            <span className="text-[#E4FF1A] text-sm font-medium">Tienda Oficial</span>
          </div>

          {/* Title */}
          <h1
            ref={titleRef}
            className="text-white text-4xl md:text-5xl font-medium tracking-[-1.5px] leading-tight"
          >
            {storeName}
          </h1>

          {/* Subtitle */}
          <p
            ref={subtitleRef}
            className="text-[rgba(255,255,255,0.55)] text-lg leading-relaxed mt-4"
          >
            Los mejores gadgets tecnológicos al mejor precio. 
            Audio, Gaming, Streaming y más.
          </p>
          <p className="text-[#E4FF1A] text-base font-medium mt-2">
            Envío gratis en compras +$60.000 COP
          </p>

          {/* Stats */}
          <div
            ref={statsRef}
            className="flex items-center gap-6 mt-8 max-[480px]:overflow-x-auto max-[480px]:pb-2"
          >
            {[
              { icon: Package, value: productCount, label: 'PRODUCTOS' },
              { icon: Headphones, value: '24/7', label: 'SOPORTE' },
              { icon: Truck, value: '2-5 días', label: 'ENVÍO' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[rgba(0,180,216,0.12)] flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-[#90E0EF]" />
                  </div>
                  <div>
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
          <div ref={ctaRef} className="mt-8">
            <button
              onClick={scrollToProducts}
              className="gradient-hero-cta text-white px-8 py-3.5 rounded-full font-medium flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,180,216,0.35)] transition-all duration-300 active:scale-95"
            >
              Explorar Productos <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Store Name Visual */}
      <div className="relative w-[55%] max-[1024px]:w-full max-[1024px]:h-[40vh] max-[768px]:h-[35vh] flex items-center justify-center overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,119,182,0.2)] via-[rgba(3,4,94,0.8)] to-[rgba(3,4,94,1)]" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[rgba(0,180,216,0.12)] rounded-full blur-[100px]"
        />
        <div
          className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-[rgba(228,255,26,0.08)] rounded-full blur-[80px]"
        />

        {/* Left edge gradient */}
        <div
          className="absolute inset-y-0 left-0 w-[30%] z-[2] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #03045E 0%, transparent 100%)',
          }}
        />

        {/* Big Store Name */}
        <div
          ref={logoSideRef}
          className="relative z-[3] text-center px-8"
        >
          {/* Logo dot decoration */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[rgba(0,180,216,0.5)]" />
            <span className="logo-dot w-3 h-3 bg-[#00B4D8] rounded-full inline-block" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[rgba(0,180,216,0.5)]" />
          </div>

          {/* Main name */}
          <h2 className="text-[80px] max-[1280px]:text-[60px] max-[768px]:text-[48px] font-bold tracking-[-4px] leading-[0.9] text-gradient-aurora shimmer-text">
            SarahBits
          </h2>

          {/* Store name subtitle */}
          <p className="text-[rgba(255,255,255,0.4)] text-lg mt-4 tracking-[4px] uppercase">
            {storeName}
          </p>

          {/* Decorative elements */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="w-2 h-2 rounded-full bg-[#FF006E] animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-[#00B4D8] animate-pulse" style={{ animationDelay: '0.5s' }} />
            <span className="w-2 h-2 rounded-full bg-[#E4FF1A] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>

        {/* Floating decorative circles */}
        <div className="absolute top-10 right-10 w-20 h-20 rounded-full border border-[rgba(0,180,216,0.15)] animate-[spin_20s_linear_infinite]" />
        <div className="absolute bottom-10 left-20 w-32 h-32 rounded-full border border-[rgba(255,0,110,0.1)] animate-[spin_30s_linear_infinite_reverse]" />
      </div>
    </section>
  );
}
