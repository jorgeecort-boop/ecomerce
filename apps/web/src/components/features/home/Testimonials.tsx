'use client';

import { useInView } from '@/hooks/useInView';

const testimonials = [
  {
    name: 'Carlos M.',
    location: 'Bogota',
    text: 'Los audifonos ANC llegaron en 2 dias y la calidad de sonido es increible. Mejor precio que en otras tiendas.',
    rating: 5,
    product: 'Audifonos Bluetooth 5.3',
    avatar: '👨‍💻',
  },
  {
    name: 'Maria L.',
    location: 'Medellin',
    text: 'El ring light con tripode transformo mis streams. La calidad es profesional y el precio muy accesible.',
    rating: 5,
    product: 'Kit Ring Light 26cm',
    avatar: '👩‍🎨',
  },
  {
    name: 'Andres R.',
    location: 'Cali',
    text: 'El smartwatch supero mis expectativas. Monitor cardiaco preciso y la bateria dura una semana completa.',
    rating: 5,
    product: 'Smartwatch Deportivo HD',
    avatar: '🏃',
  },
  {
    name: 'Laura P.',
    location: 'Barranquilla',
    text: 'Compre el hub USB-C para mi laptop y es exactamente lo que necesitaba. HDMI 4K funciona perfecto.',
    rating: 5,
    product: 'Hub USB-C 7 en 1',
    avatar: '👩‍💼',
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section ref={ref} className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider mb-3">
            Resenas
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Miles de clientes satisfechos con sus compras
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`bg-white rounded-2xl p-6 shadow-lg shadow-slate-100 border border-slate-100 transition-all duration-700 hover:-translate-y-2 hover:shadow-xl ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-xl">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                  <div className="text-slate-400 text-xs">{t.location}</div>
                </div>
              </div>

              <Stars count={t.rating} />

              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-indigo-600 font-semibold">
                  Compro: {t.product}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
