import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SectionHeaderProps {
  tagline: string;
  headline: string;
  subtitle?: string;
  taglineColor?: 'cyan' | 'lime' | 'peach';
  className?: string;
}

export default function SectionHeader({
  tagline,
  headline,
  subtitle,
  taglineColor = 'cyan',
  className = '',
}: SectionHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);

  const colorMap = {
    cyan: 'bg-[rgba(144,224,239,0.12)] text-[#90E0EF] border-[rgba(144,224,239,0.2)]',
    lime: 'bg-[rgba(228,255,26,0.15)] text-[#E4FF1A] border-[rgba(228,255,26,0.2)]',
    peach: 'bg-[rgba(255,155,133,0.12)] text-[#FF9B85] border-[rgba(255,155,133,0.2)]',
  };

  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.children;
    gsap.fromTo(
      els,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  }, []);

  return (
    <div ref={ref} className={`text-center mb-12 ${className}`}>
      <span
        className={`inline-block px-3 py-1 rounded-lg text-xs font-medium tracking-[0.48px] uppercase border mb-4 ${colorMap[taglineColor]}`}
      >
        {tagline}
      </span>
      <h2 className="text-white text-[42px] font-medium tracking-[-1.26px] leading-[1.2] max-[768px]:text-[28px]">
        {headline}
      </h2>
      {subtitle && (
        <p className="text-[rgba(255,255,255,0.55)] text-base leading-relaxed mt-4 max-w-[480px] mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}
