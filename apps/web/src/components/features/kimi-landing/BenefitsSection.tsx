'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, Rocket, Shield, MessageCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const benefits = [
  { icon: Sparkles, title: 'Calidad Garantizada', description: 'Cada producto pasa por control de calidad antes del envío. Solo trabajamos con los mejores proveedores.' },
  { icon: Rocket, title: 'Envío Express', description: 'Entrega en 24-48h en las principales ciudades de Colombia. Rastreo en tiempo real.' },
  { icon: Shield, title: 'Garantía Extendida', description: '30 días de devolución sin preguntas y garantía de fábrica en todos los productos.' },
  { icon: MessageCircle, title: 'Soporte Dedicado', description: 'Atención por WhatsApp y chat en tiempo real. Resolvemos tus dudas al instante.' },
];

export default function BenefitsSection() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    gsap.fromTo(
      gridRef.current.children,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.15,
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
    <section className="relative py-24" style={{ backgroundColor: '#03045E' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: 'rgba(0,119,182,0.04)' }}
      />

      <div className="relative z-10 px-10 max-[768px]:px-5 max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-lg text-xs font-medium tracking-[0.48px] uppercase bg-[rgba(144,224,239,0.12)] text-[#90E0EF] border border-[rgba(144,224,239,0.2)] mb-4">
            VENTAJAS
          </span>
          <h2 className="text-white text-[42px] max-[768px]:text-[28px] font-medium tracking-[-1.26px]">
            ¿Por qué elegirnos?
          </h2>
          <p className="text-[rgba(255,255,255,0.55)] text-base leading-relaxed mt-4 max-w-[480px] mx-auto">
            Nos diferenciamos por la calidad, velocidad y atención personalizada
          </p>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-4 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1 gap-6"
        >
          {benefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <div
                key={i}
                className="group text-center p-8 rounded-3xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(0,180,216,0.3)] hover:-translate-y-1 transition-all duration-400"
              >
                <div className="w-12 h-12 rounded-full bg-[rgba(0,180,216,0.12)] group-hover:bg-[rgba(0,180,216,0.25)] flex items-center justify-center mx-auto transition-colors duration-400">
                  <Icon size={24} className="text-[#90E0EF]" />
                </div>
                <h3 className="text-white text-[28px] max-[768px]:text-[22px] font-medium tracking-[-0.84px] mt-5">
                  {benefit.title}
                </h3>
                <p className="text-[rgba(255,255,255,0.55)] text-base leading-relaxed mt-3">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
