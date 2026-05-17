'use client';

import { useInView } from '@/hooks/useInView';

interface FeatureItem {
  id: string;
  icon: string;
  gradient: string;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    id: 'quality',
    icon: '✨',
    gradient: 'from-violet-500 to-purple-600',
    title: 'Calidad Garantizada',
    description: 'Cada producto pasa por control de calidad antes del envio.',
  },
  {
    id: 'shipping',
    icon: '🚀',
    gradient: 'from-cyan-500 to-blue-600',
    title: 'Envio Express',
    description: 'Entrega en 24-48h en las principales ciudades de Colombia.',
  },
  {
    id: 'warranty',
    icon: '🛡️',
    gradient: 'from-amber-500 to-orange-600',
    title: 'Garantia Extendida',
    description: '30 dias de devolucion sin preguntas y garantia de fabrica.',
  },
  {
    id: 'support',
    icon: '💬',
    gradient: 'from-emerald-500 to-teal-600',
    title: 'Soporte Dedicado',
    description: 'Atencion por WhatsApp y chat en tiempo real.',
  },
];

export function Features() {
  const { ref, isInView } = useInView(0.1);

  return (
    <section ref={ref} className="py-20 bg-gradient-to-b from-white to-indigo-50/50">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider mb-3">
            Ventajas
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
            Por que elegirnos
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Nos diferenciamos por la calidad, velocidad y atencion personalizada
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item, i) => (
            <div
              key={item.id}
              className={`group relative bg-white rounded-2xl p-6 shadow-lg shadow-slate-100 border border-slate-100 transition-all duration-700 hover:-translate-y-2 hover:shadow-xl ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-2xl mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {item.icon}
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>

              {/* Hover accent */}
              <div className={`absolute bottom-0 left-6 right-6 h-1 rounded-full bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
