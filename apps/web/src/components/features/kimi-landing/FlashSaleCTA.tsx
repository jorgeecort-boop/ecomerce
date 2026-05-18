'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Shield, Truck, RotateCcw } from 'lucide-react';
import CountdownTimer from './CountdownTimer';

gsap.registerPlugin(ScrollTrigger);

export default function FlashSaleCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    });

    tl.fromTo(taglineRef.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6 })
      .fromTo(headlineRef.current, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.3')
      .fromTo(
        timerRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.6 },
        '-=0.3'
      )
      .fromTo(
        ctaRef.current?.children || [],
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 },
        '-=0.3'
      );

    return () => { tl.kill(); };
  }, []);

  return (
    <section
      id="ofertas"
      ref={sectionRef}
      className="relative py-24"
      style={{
        background: 'linear-gradient(90deg, #FF006E, #FF9B85)',
      }}
    >
      <div className="relative z-10 px-10 max-[768px]:px-5 max-w-[700px] mx-auto text-center">
        {/* Tagline */}
        <div ref={taglineRef} className="opacity-0">
          <span className="text-white/90 text-sm font-medium flex items-center justify-center gap-2">
            <span>⏰</span> Oferta por tiempo limitado
          </span>
        </div>

        {/* Headline */}
        <h2
          ref={headlineRef}
          className="text-white text-[42px] max-[768px]:text-[28px] font-medium tracking-[-1.26px] mt-4 opacity-0"
        >
          No te pierdas las mejores{' '}
          <span className="[text-shadow:0_0_30px_rgba(255,255,255,0.3)]">
            ofertas
          </span>{' '}
          en tecnología
        </h2>

        <p className="text-white/85 text-lg leading-relaxed mt-4">
          Descuentos de hasta el 40% en productos seleccionados. Stock limitado.
        </p>

        {/* Countdown */}
        <div ref={timerRef} className="mt-10 opacity-0">
          <CountdownTimer />
        </div>

        {/* CTAs */}
        <div ref={ctaRef} className="flex flex-wrap items-center justify-center gap-4 mt-10">
          <button
            onClick={() => window.location.href = '/store/tienda-demo'}
            className="bg-white text-[#FF006E] px-10 py-4 rounded-full font-medium flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,0,110,0.3)] transition-all duration-300"
          >
            Comprar Ahora <ArrowRight size={18} />
          </button>
          <button
            onClick={() => window.location.href = '/store/tienda-demo'}
            className="text-white px-10 py-4 rounded-full font-medium border border-white hover:bg-[rgba(255,255,255,0.15)] transition-all duration-300"
          >
            Ver Ofertas
          </button>
        </div>

        {/* Trust microcopy */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-white/70 text-[13px]">
          <span className="flex items-center gap-1">
            <Shield size={14} /> Pago seguro
          </span>
          <span className="flex items-center gap-1">
            <Truck size={14} /> Envío gratis +$60.000
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw size={14} /> 30 días de devolución
          </span>
        </div>
      </div>
    </section>
  );
}
