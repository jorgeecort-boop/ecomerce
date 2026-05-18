'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Package, Headphones, Truck } from 'lucide-react';

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

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.fromTo(badgeRef.current, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
      .fromTo(titleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, '-=0.3')
      .fromTo(subtitleRef.current, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.4')
      .fromTo(statsRef.current?.children || [], { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, '-=0.3');

    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative pt-28 pb-16 overflow-hidden"
      style={{ backgroundColor: '#03045E' }}
    >
      {/* Radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[rgba(0,180,216,0.08)] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[rgba(0,119,182,0.06)] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 px-6 lg:px-10 max-w-[1200px] mx-auto text-center">
        {/* Badge */}
        <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[rgba(228,255,26,0.12)] border border-[rgba(228,255,26,0.2)] mb-6">
          <span className="fire-pulse inline-block">🔥</span>
          <span className="text-[#E4FF1A] text-sm font-medium">Tienda Oficial</span>
        </div>

        {/* Title */}
        <h1
          ref={titleRef}
          className="text-white text-4xl md:text-6xl font-medium tracking-[-1.5px] leading-tight"
        >
          {storeName}
        </h1>

        {/* Subtitle */}
        <p ref={subtitleRef} className="text-[rgba(255,255,255,0.55)] text-lg mt-4 max-w-[500px] mx-auto">
          Los mejores gadgets tecnológicos al mejor precio con envío a toda Colombia
        </p>

        {/* Mini Stats */}
        <div ref={statsRef} className="flex items-center justify-center gap-8 mt-10 max-[480px]:gap-4">
          {[
            { icon: Package, value: productCount, label: 'Productos' },
            { icon: Headphones, value: '24/7', label: 'Soporte' },
            { icon: Truck, value: '2-5 días', label: 'Envío' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[rgba(0,180,216,0.12)] flex items-center justify-center">
                  <Icon size={18} className="text-[#90E0EF]" />
                </div>
                <div className="text-left">
                  <div className="text-white text-sm font-semibold">{stat.value}</div>
                  <div className="text-[rgba(255,255,255,0.5)] text-xs">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
