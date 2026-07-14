'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  { name: 'Carlos M.', city: 'Bogotá', stars: 5, quote: 'Los audífonos ANC llegaron en 2 días y la calidad de sonido es increíble. Mejor precio que en otras tiendas.', product: 'Audífonos Bluetooth 5.3', initials: 'CM', color: 'from-[#5a5a6e] to-[#a8adb8]' },
  { name: 'María L.', city: 'Medellín', stars: 5, quote: 'El ring light con trípode transformó mis streams. La calidad es profesional y el precio muy accesible.', product: 'Kit Ring Light 26cm', initials: 'ML', color: 'from-[#FF006E] to-[#FF9B85]' },
  { name: 'Andrés R.', city: 'Cali', stars: 5, quote: 'El smartwatch superó mis expectativas. Monitor cardíaco preciso y la batería dura una semana completa.', product: 'Smartwatch Deportivo HD', initials: 'AR', color: 'from-[#a8adb8] to-[#d0d5dc]' },
  { name: 'Laura P.', city: 'Barranquilla', stars: 5, quote: 'Compré el hub USB-C para mi laptop y es exactamente lo que necesitaba. HDMI 4K funciona perfecto.', product: 'Hub USB-C 7 en 1', initials: 'LP', color: 'from-[#5a5a6e] to-[#0a0a0f]' },
];

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="group w-[380px] max-[768px]:w-full flex-shrink-0 p-7 rounded-3xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(144,224,239,0.3)] hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-medium`}>
          {t.initials}
        </div>
        <div>
          <div className="text-white text-base font-medium">{t.name}</div>
          <div className="text-[rgba(255,255,255,0.55)] text-xs">{t.city}</div>
        </div>
      </div>
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: t.stars }).map((_, i) => (
          <span key={i} className="text-yellow-400 text-sm">⭐</span>
        ))}
      </div>
      <p className="text-white text-base italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
      <span className="inline-block mt-4 bg-[rgba(168,173,184,0.1)] text-[#d0d5dc] text-xs px-3 py-1 rounded-md">
        Compró: {t.product}
      </span>
    </div>
  );
}

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.fromTo(
      sectionRef.current,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  }, []);

  const row1 = [...testimonials, ...testimonials];
  const row2 = [...testimonials.slice(2), ...testimonials.slice(0, 2), ...testimonials.slice(2), ...testimonials.slice(0, 2)];

  return (
    <section
      id="resenas"
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
      style={{ backgroundColor: '#0a0a0f' }}
    >
      <div className="relative z-10 px-10 max-[768px]:px-5">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-lg text-xs font-medium tracking-[0.48px] uppercase bg-[rgba(255,155,133,0.12)] text-[#FF9B85] mb-4">
            RESEÑAS
          </span>
          <h2 className="text-white text-[42px] max-[768px]:text-[28px] font-medium tracking-[-1.26px]">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-[rgba(255,255,255,0.55)] text-base leading-relaxed mt-4">
            Miles de clientes satisfechos con sus compras
          </p>
        </div>

        {/* Desktop Marquee */}
        <div className="max-[768px]:hidden space-y-6">
          {/* Row 1 - scrolls left */}
          <div className="testimonial-row overflow-hidden">
            <div className="marquee-left flex gap-6 w-max">
              {row1.map((t, i) => (
                <TestimonialCard key={`r1-${i}`} t={t} />
              ))}
            </div>
          </div>
          {/* Row 2 - scrolls right */}
          <div className="testimonial-row overflow-hidden">
            <div className="marquee-right flex gap-6 w-max">
              {row2.map((t, i) => (
                <TestimonialCard key={`r2-${i}`} t={t} />
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Stack */}
        <div className="hidden max-[768px]:flex flex-col gap-4">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
