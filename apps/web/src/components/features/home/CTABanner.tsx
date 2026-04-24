import Link from 'next/link';

export interface CTABannerProps {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function CTABanner({
  title = 'Listo para vender mas en tu tienda?',
  subtitle = 'Activa tu catalogo, automatiza pedidos y mejora conversion desde hoy.',
  primaryLabel = 'Comenzar ahora',
  primaryHref = '/register',
  secondaryLabel = 'Ver demo',
  secondaryHref = '/store/tienda-demo',
}: CTABannerProps) {
  return (
    <section aria-label="Llamado a la accion final" className="bg-primary py-14 text-white">
      <div className="mx-auto flex w-full max-w-site flex-col items-center px-4 text-center sm:px-6 lg:px-10">
        <h2 className="mb-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h2>
        <p className="mb-8 max-w-2xl text-sm text-white/90 sm:text-base">{subtitle}</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primaryHref}
            className="inline-flex min-h-12 items-center justify-center rounded-pill border-2 border-accent bg-accent px-8 py-3 text-base font-bold text-white transition hover:-translate-y-0.5 hover:opacity-95"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex min-h-12 items-center justify-center rounded-pill border-2 border-white/90 bg-transparent px-8 py-3 text-base font-bold text-white transition hover:-translate-y-0.5 hover:opacity-95"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CTABanner;
