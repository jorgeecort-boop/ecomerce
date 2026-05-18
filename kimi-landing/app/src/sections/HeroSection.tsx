import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowRight, Tag } from 'lucide-react';

const categories = [
  { icon: '🎧', name: 'Audio', angle: 0 },
  { icon: '🎮', name: 'Gaming', angle: 60 },
  { icon: '⌚', name: 'Wearables', angle: 120 },
  { icon: '🎥', name: 'Streaming', angle: 180 },
  { icon: '💡', name: 'Iluminación', angle: 240 },
  { icon: '🔌', name: 'Conectividad', angle: 300 },
];

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.fromTo(
      videoRef.current,
      { opacity: 0, scale: 1.05 },
      { opacity: 1, scale: 1, duration: 1.8 }
    )
      .fromTo(
        taglineRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        0.4
      )
      .fromTo(
        headlineRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0 },
        0.6
      )
      .fromTo(
        descRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        0.8
      )
      .fromTo(
        ctaRef.current?.children || [],
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.15 },
        1.0
      )
      .fromTo(
        statsRef.current?.children || [],
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 },
        1.2
      )
      .fromTo(
        orbitRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 1.0 },
        1.4
      )
      .fromTo(
        indicatorRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        1.8
      );

    // Hide scroll indicator on first scroll
    const onScroll = () => {
      if (indicatorRef.current) {
        gsap.to(indicatorRef.current, { opacity: 0, duration: 0.3 });
      }
    };
    window.addEventListener('scroll', onScroll, { once: true, passive: true });

    return () => {
      tl.kill();
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100dvh] flex max-[1024px]:flex-col overflow-hidden"
      style={{ backgroundColor: '#03045E' }}
    >
      {/* Left Content Zone */}
      <div className="relative z-10 w-[40%] max-[1024px]:w-full max-[1024px]:order-2 flex flex-col justify-center px-10 max-[768px]:px-5 py-20 max-[1024px]:py-12">
        <div className="max-w-[520px]">
          {/* Sale Tagline */}
          <div
            ref={taglineRef}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[rgba(255,0,110,0.15)] border border-[rgba(255,0,110,0.3)] mb-6"
          >
            <span className="fire-pulse inline-block">🔥</span>
            <span className="text-[#FF9B85] text-sm font-medium">
              Ofertas de temporada: hasta -40% OFF
            </span>
          </div>

          {/* Headline */}
          <h1
            ref={headlineRef}
            className="text-white text-[56px] max-[768px]:text-[36px] font-medium leading-[1.2] tracking-[-1.68px]"
          >
            Transforma tu{' '}
            <span className="text-gradient-aurora shimmer-text">Setup</span>
          </h1>

          {/* Description */}
          <p
            ref={descRef}
            className="text-[rgba(255,255,255,0.55)] text-lg leading-relaxed mt-5"
          >
            Los mejores gadgets tecnológicos al mejor precio. Audio, Gaming,
            Streaming y más.
          </p>
          <p className="text-[#E4FF1A] text-lg font-medium mt-2">
            Envío gratis en compras +$60.000 COP
          </p>

          {/* CTAs */}
          <div ref={ctaRef} className="flex flex-wrap gap-4 mt-8">
            <button
              onClick={() => scrollTo('productos')}
              className="gradient-hero-cta text-white px-8 py-3.5 rounded-full font-medium flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,180,216,0.35)] transition-all duration-300"
            >
              Explorar Tienda <ArrowRight size={18} />
            </button>
            <button
              onClick={() => scrollTo('ofertas')}
              className="text-white px-8 py-3.5 rounded-full font-medium border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.08)] transition-all duration-300 flex items-center gap-2"
            >
              <Tag size={16} /> Ver Ofertas
            </button>
          </div>

          {/* Stats Row */}
          <div
            ref={statsRef}
            className="flex items-center gap-6 mt-12 max-[480px]:overflow-x-auto max-[480px]:pb-2"
          >
            {[
              { value: '500+', label: 'PRODUCTOS' },
              { value: '2.3K', label: 'CLIENTES FELICES' },
              { value: '99%', label: 'ENVÍOS EXITOSOS' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-6">
                <div>
                  <div className="text-white text-[28px] font-semibold tracking-[-0.5px]">
                    {stat.value}
                  </div>
                  <div className="text-[rgba(255,255,255,0.55)] text-xs font-medium tracking-[1.12px] uppercase mt-1">
                    {stat.label}
                  </div>
                </div>
                {i < 2 && (
                  <div className="w-px h-10 bg-[rgba(255,255,255,0.12)] max-[480px]:hidden" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Video Zone */}
      <div className="relative w-[60%] max-[1024px]:w-full max-[1024px]:h-[50vh] max-[768px]:h-[40vh]">
        {/* Ambient glow */}
        <div
          className="absolute -left-[100px] top-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none z-[1] opacity-60"
          style={{
            background:
              'radial-gradient(ellipse, rgba(0,180,216,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Video */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-0"
        >
          <source
            src="/videos/hero-keyboard-aurora.mp4"
            type="video/mp4"
          />
        </video>

        {/* Left edge gradient overlay */}
        <div
          className="absolute inset-y-0 left-0 w-[25%] z-[2] pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, #03045E 0%, transparent 100%)',
          }}
        />

        {/* Category Orbit */}
        <div
          ref={orbitRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[3] w-[320px] h-[320px] max-[1024px]:scale-75 max-[768px]:hidden"
        >
          {/* Center Badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full gradient-sale flex items-center justify-center z-10">
            <span className="text-white text-sm font-semibold text-center leading-tight">
              Hasta
              <br />
              -40%
            </span>
          </div>

          {/* Orbit container */}
          <div className="orbit-rotate absolute inset-0">
            {categories.map((cat, i) => {
              const rad = (cat.angle * Math.PI) / 180;
              const x = Math.cos(rad) * 130;
              const y = Math.sin(rad) * 130;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 group cursor-pointer"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  }}
                >
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap">
                    <span className="text-white text-sm font-medium">
                      {cat.name}
                    </span>
                  </div>
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.1)] backdrop-blur-sm border border-[rgba(255,255,255,0.12)] flex items-center justify-center text-2xl group-hover:scale-[1.15] group-hover:bg-[rgba(0,180,216,0.2)] group-hover:border-[#00B4D8] transition-all duration-300">
                    {cat.icon}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        ref={indicatorRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center opacity-0"
      >
        <div className="w-px h-10 bg-[rgba(255,255,255,0.55)] relative overflow-hidden">
          <div className="scroll-dot absolute top-0 left-0 w-full h-2 bg-white rounded-full" />
        </div>
      </div>
    </section>
  );
}
