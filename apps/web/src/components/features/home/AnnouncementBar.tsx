'use client';

import Link from 'next/link';

export function AnnouncementBar() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 py-2.5 text-center text-sm font-medium text-white">
      {/* Animated shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite]" style={{ backgroundSize: '200% 100%' }} />

      <div className="relative mx-auto max-w-site px-4 flex items-center justify-center gap-2">
        <span className="animate-pulse">🔥</span>
        <span>Ofertas de temporada: hasta <strong>-40% OFF</strong></span>
        <span className="hidden sm:inline mx-2 opacity-50">|</span>
        <Link href="/store/tienda-demo" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
          Comprar ahora →
        </Link>
      </div>
    </div>
  );
}

export default AnnouncementBar;
