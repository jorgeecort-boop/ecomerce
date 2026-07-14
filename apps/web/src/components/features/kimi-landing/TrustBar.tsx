'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Truck, Shield, RotateCcw, MessageCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const items = [
  { icon: Truck, title: 'Envío Gratis', subtitle: 'En compras +$60.000' },
  { icon: Shield, title: 'Pago Seguro', subtitle: 'SSL y encriptación' },
  { icon: RotateCcw, title: 'Devoluciones', subtitle: '30 días de garantía' },
  { icon: MessageCircle, title: 'Soporte 24/7', subtitle: 'Chat y WhatsApp' },
];

export default function TrustBar() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current.children,
      { y: 10, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      }
    );
  }, []);

  return (
    <div className="bg-[rgba(3,4,94,0.95)] border-t border-[rgba(255,255,255,0.12)]">
      <div
        ref={ref}
        className="max-w-[1000px] mx-auto h-20 max-[768px]:h-auto max-[768px]:py-4 flex max-[768px]:grid max-[768px]:grid-cols-2 items-center justify-between px-10 max-[768px]:px-5 gap-6 max-[768px]:gap-4"
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-3">
              <Icon size={20} className="text-[#d0d5dc] flex-shrink-0" />
              <div>
                <div className="text-white text-sm font-medium">{item.title}</div>
                <div className="text-[rgba(255,255,255,0.55)] text-xs">
                  {item.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
