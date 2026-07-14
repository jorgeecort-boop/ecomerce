'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Headphones, Truck, Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { icon: Headphones, value: 500, suffix: '+', label: 'PRODUCTOS DISPONIBLES', duration: 12 },
  { icon: Truck, value: 2300, suffix: '', label: 'CLIENTES SATISFECHOS', duration: 14, displayPrefix: '2.3K' },
  { icon: Star, value: 99, suffix: '%', label: 'ENVÍOS EXITOSOS', duration: 16, displaySuffix: '%' },
];

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    stats.forEach((stat, i) => {
      const el = numberRefs.current[i];
      if (!el) return;

      const obj = { val: 0 };
      gsap.to(obj, {
        val: stat.value,
        duration: 2,
        ease: 'power2.out',
        delay: i * 0.3,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
        onUpdate: () => {
          if (stat.displayPrefix) {
            el.textContent = stat.displayPrefix;
          } else if (stat.value >= 1000) {
            el.textContent = Math.round(obj.val).toLocaleString('es-CO') + stat.suffix;
          } else {
            el.textContent = Math.round(obj.val) + (stat.displaySuffix || stat.suffix);
          }
        },
      });
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24"
      style={{ backgroundColor: '#0a0a0f' }}
    >
      <div
        className="absolute inset-0 pointer-events-none gradient-navy opacity-50"
      />

      <div className="relative z-10 px-10 max-[768px]:px-5 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-lg text-xs font-medium tracking-[0.48px] uppercase bg-[rgba(228,255,26,0.1)] text-[#d0d5dc] mb-4">
            IMPACTO
          </span>
          <h2 className="text-white text-[42px] max-[768px]:text-[28px] font-medium tracking-[-1.26px]">
            Hechos que respaldan nuestra calidad
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="flex max-[768px]:flex-col items-center justify-center gap-20 max-[768px]:gap-12">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const marqueeText = `${stat.label} \u00B7 `.repeat(8);
            return (
              <div key={i} className="text-center flex-1 max-[768px]:w-full">
                <Icon size={40} className="text-[#d0d5dc] mx-auto mb-4" />
                <span
                  ref={(el) => { numberRefs.current[i] = el; }}
                  className="block text-[120px] max-[768px]:text-[64px] font-normal tracking-[-4.8px] text-gradient-aurora leading-[1.1]"
                >
                  0{stat.suffix}
                </span>
                {/* 3D Perspective Marquee */}
                <div className="perspective-container mt-4 mx-auto max-w-[300px] max-[768px]:max-w-[200px]">
                  <div
                    className="marquee-3d-track"
                    style={{
                      animation: `marquee-scroll ${stat.duration}s linear infinite`,
                    }}
                  >
                    <span className="whitespace-nowrap px-4 text-sm font-medium text-[rgba(255,255,255,0.55)] tracking-[0.5px] uppercase">
                      {marqueeText}
                    </span>
                    <span className="whitespace-nowrap px-4 text-sm font-medium text-[rgba(255,255,255,0.55)] tracking-[0.5px] uppercase">
                      {marqueeText}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes marquee-scroll {
          0% { transform: rotateY(-25deg) translateX(0); }
          100% { transform: rotateY(-25deg) translateX(-50%); }
        }
        @media (max-width: 768px) {
          @keyframes marquee-scroll {
            0% { transform: rotateY(-15deg) translateX(0); }
            100% { transform: rotateY(-15deg) translateX(-50%); }
          }
        }
      `}</style>
    </section>
  );
}
