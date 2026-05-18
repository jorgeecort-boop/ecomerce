'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';

const categories = [
  'Todos',
  'Audio',
  'Gaming',
  'Streaming',
  'Wearables',
  'Accesorios',
  'Baterias',
];

interface CategoryPillsProps {
  selected: string;
  onSelect: (cat: string) => void;
  productCounts: Record<string, number>;
}

export default function CategoryPills({ selected, onSelect, productCounts }: CategoryPillsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current.children,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      }
    );
  }, []);

  return (
    <div className="py-6 px-6 lg:px-10" style={{ backgroundColor: '#03045E' }}>
      <div
        ref={containerRef}
        className="max-w-[1200px] mx-auto flex flex-wrap items-center gap-3"
      >
        {categories.map((cat) => {
          const isActive = selected === cat;
          const count = productCounts[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 ${
                isActive
                  ? 'gradient-aurora text-white shadow-lg shadow-blue-500/20'
                  : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.12)] hover:border-[#00B4D8] hover:text-white'
              }`}
            >
              {cat}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? 'text-white/80' : 'text-[rgba(255,255,255,0.4)]'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
