'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useInView } from '@/hooks/useInView';

function CountdownTimer() {
  const [time, setTime] = useState({ hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2">
      {[
        { value: pad(time.hours), label: 'Horas' },
        { value: pad(time.minutes), label: 'Min' },
        { value: pad(time.seconds), label: 'Seg' },
      ].map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[52px] text-center">
            <div className="text-xl font-extrabold text-white">{unit.value}</div>
            <div className="text-[10px] text-white/70 uppercase">{unit.label}</div>
          </div>
          {i < 2 && <span className="text-white/50 font-bold text-lg">:</span>}
        </div>
      ))}
    </div>
  );
}

export function CTABanner() {
  const { ref, isInView } = useInView(0.2);

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden py-20 transition-all duration-1000 ${
        isInView ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)`,
        }}
      />

      {/* Floating shapes */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full border-2 border-white/10 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full border border-white/10 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/4 w-16 h-16 rounded-lg bg-white/5 rotate-45 animate-spin" style={{ animationDuration: '15s' }} />

      <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-10 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-bold mb-6">
          ⏰ Oferta por tiempo limitado
        </span>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
          No te pierdas las mejores
          <span className="block bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
            ofertas en tecnologia
          </span>
        </h2>

        <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
          Descuentos de hasta el 40% en productos seleccionados. Stock limitado.
        </p>

        {/* Countdown */}
        <div className="flex justify-center mb-10">
          <CountdownTimer />
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/store/tienda-demo"
            className="group inline-flex items-center gap-2 px-10 py-4 rounded-full bg-white text-indigo-700 font-bold text-lg shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30"
          >
            Comprar Ahora
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <Link
            href="/store/tienda-demo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/40 text-white font-semibold transition-all duration-300 hover:bg-white/10 hover:border-white/60"
          >
            Ver Ofertas
          </Link>
        </div>

        {/* Trust micro-copy */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Pago seguro
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Envio gratis +$60.000
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            30 dias de devolucion
          </span>
        </div>
      </div>
    </section>
  );
}

export default CTABanner;
