'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const stats = [
  { label: 'Productos', value: '500+' },
  { label: 'Clientes felices', value: '2.3K' },
  { label: 'Envios exitosos', value: '99%' },
];

export function Hero() {
  const [currentStat, setCurrentStat] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 min-h-[92vh] flex items-center">
      {/* Animated gradient orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-r from-violet-600/30 to-indigo-600/30 blur-3xl transition-all duration-[2000ms]"
        style={{
          left: `${mousePos.x * 30}%`,
          top: `${mousePos.y * 30}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-3xl transition-all duration-[3000ms]"
        style={{
          right: `${10 + mousePos.x * 20}%`,
          bottom: `${10 + mousePos.y * 20}%`,
          transform: 'translate(50%, 50%)',
        }}
      />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 blur-3xl animate-pulse top-1/4 right-1/4" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating tech icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {['🎧', '🎮', '⌚', '📱', '🎥', '💡'].map((icon, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-10 animate-bounce"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          >
            {icon}
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-10 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/90 font-medium">Ofertas actualizadas hoy</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Tecnologia que{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                transforma
              </span>{' '}
              tu setup
            </h1>

            <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-xl mx-auto lg:mx-0">
              Los mejores gadgets al mejor precio. Audio, Gaming, Streaming y mas.
              <span className="block mt-2 text-amber-400 font-semibold">
                Envio gratis en compras +$60.000 COP
              </span>
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-10">
              <Link
                href="/store/tienda-demo"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-105"
              >
                Explorar Tienda
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href="/store/tienda-demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/30 text-white font-semibold transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ver Ofertas
              </Link>
            </div>

            {/* Animated stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`transition-all duration-500 ${
                    i === currentStat ? 'opacity-100 scale-110' : 'opacity-50 scale-100'
                  }`}
                >
                  <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                  <div className="text-xs text-white/60 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product showcase */}
          <div className="hidden lg:flex justify-center items-center relative">
            <div className="relative w-[400px] h-[400px]">
              {/* Rotating ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/10 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-8 rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse]" />

              {/* Center circle */}
              <div className="absolute inset-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">🛍️</div>
                  <div className="text-white font-bold text-lg">Hasta -40%</div>
                  <div className="text-white/60 text-sm">en productos seleccionados</div>
                </div>
              </div>

              {/* Floating product badges */}
              {[
                { icon: '🎧', label: 'Audio', pos: 'top-0 left-1/2 -translate-x-1/2' },
                { icon: '🎮', label: 'Gaming', pos: 'top-1/4 right-0' },
                { icon: '⌚', label: 'Wearables', pos: 'bottom-1/4 right-0' },
                { icon: '🎥', label: 'Streaming', pos: 'bottom-0 left-1/2 -translate-x-1/2' },
                { icon: '💡', label: 'Iluminacion', pos: 'bottom-1/4 left-0' },
                { icon: '🔌', label: 'Conectividad', pos: 'top-1/4 left-0' },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`absolute ${item.pos} flex flex-col items-center gap-1 animate-bounce`}
                  style={{ animationDelay: `${i * 0.3}s`, animationDuration: '3s' }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl hover:bg-white/20 transition-colors cursor-pointer">
                    {item.icon}
                  </div>
                  <span className="text-xs text-white/70 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}

export default Hero;
