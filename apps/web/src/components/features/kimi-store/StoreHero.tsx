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
  const videoRef = useRef<HTMLVideoElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.fromTo(
      videoRef.current,
      { opacity: 0, scale: 1.05 },
      { opacity: 1, scale: 1, duration: 1.8 }
    )
      .fromTo(badgeRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.4)
      .fromTo(titleRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0 }, 0.6)
      .fromTo(subtitleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.8)
      .fromTo(statsRef.current?.children || [], { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 }, 1.0)
      .fromTo(ctaRef.current, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 1.2);

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

          {/* Store Logo/Name */}
          <div ref={titleRef} className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="relative">
                <span className="text-white text-5xl max-[768px]:text-4xl font-bold tracking-[-2px]">SarahBits</span>
                <span className="logo-dot absolute -right-4 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#00B4D8] rounded-full" />
              </span>
            </div>
            <h1 className="text-white text-[56px] max-[768px]:text-[36px] font-medium leading-[1.1] tracking-[-1.68px]">
              {storeName}
            </h1>
          </div>

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

      {/* Right Video Zone */}
      <div className="relative w-[55%] max-[1024px]:w-full max-[1024px]:h-[50vh] max-[768px]:h-[40vh]">
        {/* Ambient glow */}
        <div
          className="absolute -left-[100px] top-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none z-[1] opacity-60"
          style={{
            background: 'radial-gradient(ellipse, rgba(0,180,216,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Video */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-0"
        >
          <source
            src="/kimi-assets/videos/hero-keyboard-aurora.mp4"
            type="video/mp4"
          />
        </video>

        {/* Left edge gradient overlay */}
        <div
          className="absolute inset-y-0 left-0 w-[25%] z-[2] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #03045E 0%, transparent 100%)',
          }}
        />

        {/* Bottom gradient for mobile */}
        <div
          className="absolute inset-x-0 bottom-0 h-[30%] z-[2] pointer-events-none max-[1024px]:block hidden"
          style={{
            background: 'linear-gradient(0deg, #03045E 0%, transparent 100%)',
          }}
        />
      </div>
    </section>
  );
}
