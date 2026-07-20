import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="text-center">
        <p className="text-[120px] font-extrabold text-[#a8adb8] leading-none select-none">404</p>
        <h1 className="text-2xl font-bold text-white mt-4">Pagina no encontrada</h1>
        <p className="text-[rgba(255,255,255,0.5)] text-sm mt-2 max-w-md">
          La pagina que buscas no existe o fue movida.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link
            href="/"
            className="px-6 py-3 rounded-full bg-[#a8adb8] text-white font-semibold text-sm hover:opacity-80 transition-opacity"
          >
            Ir al inicio
          </Link>
          <Link
            href="/store"
            className="px-6 py-3 rounded-full border border-[rgba(255,255,255,0.15)] text-white font-semibold text-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            Ver tiendas
          </Link>
        </div>
      </div>
    </div>
  );
}
