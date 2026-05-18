'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Headphones, Gamepad2, Watch, Video, Lightbulb, Cable } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const categories = [
  { name: 'Audio', image: '/kimi-assets/images/category-audio.jpg', icon: Headphones, count: 86, colSpan: 'col-span-2 row-span-2', aspect: 'aspect-square' },
  { name: 'Gaming', image: '/kimi-assets/images/category-gaming.jpg', icon: Gamepad2, count: 64, colSpan: 'col-span-1 row-span-1', aspect: 'aspect-square' },
  { name: 'Wearables', image: '/kimi-assets/images/category-wearables.jpg', icon: Watch, count: 42, colSpan: 'col-span-1 row-span-1', aspect: 'aspect-square' },
  { name: 'Streaming', image: '/kimi-assets/images/category-streaming.jpg', icon: Video, count: 38, colSpan: 'col-span-2 row-span-1', aspect: 'aspect-[2/1]' },
  { name: 'Iluminación', image: '/kimi-assets/images/category-iluminacion.jpg', icon: Lightbulb, count: 55, colSpan: 'col-span-1 row-span-1', aspect: 'aspect-square' },
  { name: 'Conectividad', image: '/kimi-assets/images/category-conectividad.jpg', icon: Cable, count: 71, colSpan: 'col-span-1 row-span-1', aspect: 'aspect-square' },
];

export default function CategoryGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    gsap.fromTo(
      gridRef.current.children,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  }, []);

  return (
    <section
      id="categorias"
      className="relative py-20"
      style={{ backgroundColor: '#03045E' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,119,182,0.03) 0%, transparent 100%)',
        }}
      />

      <div className="relative z-10 px-10 max-[768px]:px-5 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-lg text-xs font-medium tracking-[0.48px] uppercase bg-[rgba(144,224,239,0.12)] text-[#90E0EF] border border-[rgba(144,224,239,0.2)] mb-4">
            COLECCIÓN
          </span>
          <h2 className="text-white text-[42px] max-[768px]:text-[28px] font-medium tracking-[-1.26px]">
            Explora nuestras categorías
          </h2>
          <p className="text-[rgba(255,255,255,0.55)] text-base leading-relaxed mt-4 max-w-[480px] mx-auto">
            Descubre productos seleccionados para cada necesidad tecnológica
          </p>
        </div>

        {/* Bento Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-4 max-[1024px]:grid-cols-2 max-[768px]:grid-cols-1 gap-6"
        >
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <div
                key={i}
                className={`group relative overflow-hidden rounded-3xl cursor-pointer max-[768px]:col-span-1 max-[768px]:aspect-[16/9] ${cat.colSpan} ${cat.aspect}`}
              >
                {/* Image */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-[1.15] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(3,4,94,0.9)] via-[rgba(3,4,94,0.3)] to-transparent" />

                {/* Icon */}
                <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-[rgba(0,180,216,0.2)] flex items-center justify-center group-hover:bg-[rgba(0,180,216,0.35)] transition-colors duration-300">
                  <Icon size={22} className="text-[#90E0EF]" />
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-white text-[28px] font-medium tracking-[-0.84px]">
                    {cat.name}
                  </h3>
                  <span className="text-[#90E0EF] text-xs font-medium tracking-[0.48px] uppercase">
                    {cat.count} productos
                  </span>
                </div>

                {/* Hover Button */}
                <div className="absolute bottom-6 right-6 opacity-0 translate-y-5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                  <span className="flex items-center gap-1 text-white text-sm font-medium">
                    Ver productos <ArrowRight size={14} />
                  </span>
                </div>

                {/* Hover lift shadow */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 group-hover:shadow-[0_20px_60px_rgba(0,180,216,0.15)] transition-all duration-500 pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
