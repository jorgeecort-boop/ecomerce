'use client';

import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Send, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function NewsletterSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.fromTo(
      sectionRef.current.children[0],
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setEmail(''); }, 3000);
  };

  return (
    <section ref={sectionRef} className="py-20 px-6 lg:px-10" style={{ backgroundColor: '#03045E' }}>
      <div className="max-w-[600px] mx-auto text-center relative">
        {/* Glow */}
        <div className="absolute inset-0 bg-[rgba(0,180,216,0.06)] rounded-3xl blur-3xl -z-10" />

        <div className="p-8 md:p-12 rounded-3xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.12)] backdrop-blur-sm">
          <div className="w-14 h-14 rounded-full bg-[rgba(0,180,216,0.12)] flex items-center justify-center mx-auto mb-6">
            <Send size={24} className="text-[#90E0EF]" />
          </div>

          <h3 className="text-white text-2xl font-medium tracking-[-0.5px] mb-2">
            Mantente al día
          </h3>
          <p className="text-[rgba(255,255,255,0.55)] text-sm mb-8">
            Recibe ofertas exclusivas, novedades y descuentos directo a tu correo
          </p>

          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Check size={20} />
              <span className="font-medium">¡Gracias por suscribirte!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3 max-[480px]:flex-col">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="flex-1 px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-white text-sm placeholder-[rgba(255,255,255,0.35)] outline-none focus:border-[#00B4D8] focus:shadow-[0_0_15px_rgba(0,180,216,0.1)] transition-all"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl gradient-hero-cta text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Suscribirme
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
