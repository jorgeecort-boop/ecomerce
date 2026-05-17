'use client';

import { useInView } from '@/hooks/useInView';

const trustItems = [
  { icon: '🚚', title: 'Envio Gratis', desc: 'En compras +$60.000' },
  { icon: '🔒', title: 'Pago Seguro', desc: 'SSL y encriptacion' },
  { icon: '↩️', title: 'Devoluciones', desc: '30 dias de garantia' },
  { icon: '💬', title: 'Soporte 24/7', desc: 'Chat y WhatsApp' },
];

export function TrustBanner() {
  const { ref, isInView } = useInView(0.2);

  return (
    <section ref={ref} className="bg-gradient-to-r from-slate-50 to-indigo-50 py-8 border-y border-slate-200">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {trustItems.map((item, i) => (
            <div
              key={item.title}
              className={`flex items-center gap-4 transition-all duration-700 ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center text-2xl">
                {item.icon}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{item.title}</div>
                <div className="text-slate-500 text-xs">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustBanner;
