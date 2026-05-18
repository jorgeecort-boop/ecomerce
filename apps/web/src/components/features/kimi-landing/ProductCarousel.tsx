'use client';

import dynamic from 'next/dynamic';

const ProductCarousel3D = dynamic(() => import('./ProductCarousel3D'), {
  ssr: false,
  loading: () => (
    <section id="productos" className="relative py-20" style={{ backgroundColor: '#03045E' }}>
      <div className="relative z-10 px-10 max-[768px]:px-5 mb-8">
        <div className="flex items-end justify-between max-w-[1200px] mx-auto">
          <div>
            <span className="inline-block px-3 py-1 rounded-lg text-xs font-medium tracking-[0.48px] uppercase bg-[rgba(228,255,26,0.15)] text-[#E4FF1A] mb-4">
              🔥 TENDENCIA
            </span>
            <h2 className="text-white text-[42px] max-[768px]:text-[28px] font-medium tracking-[-1.26px]">
              Productos más vendidos
            </h2>
          </div>
        </div>
      </div>
      <div className="relative z-10 w-full h-[600px] max-[1024px]:h-[500px] max-[768px]:h-[420px] flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Cargando productos 3D...</div>
      </div>
    </section>
  ),
});

export default function ProductCarousel() {
  return <ProductCarousel3D />;
}
