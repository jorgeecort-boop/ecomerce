'use client';

import Image from 'next/image';

const defaultHeroImage =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2a4a6b" />
          <stop offset="50%" stop-color="#527293" />
          <stop offset="100%" stop-color="#7ba4c0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1200" fill="url(#bg)" />
      <circle cx="1180" cy="260" r="180" fill="#f58a6c" fill-opacity="0.28" />
      <circle cx="360" cy="900" r="260" fill="#edf8f8" fill-opacity="0.12" />
      <path d="M520 820c140-280 390-430 620-410 110 10 220 60 310 150v640H160V980c110-40 250-80 360-160z" fill="#163a59" fill-opacity="0.38" />
    </svg>
  `);

export interface HeroProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  imageSrc?: string;
  imageAlt?: string;
  badgeTitle?: string;
  badgePrice?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

export function Hero({
  eyebrow = '¡Sorpresa, sorbo, hurra!',
  title = 'Por tiempo limitado, consigue tu maquina por solo $159.',
  subtitle = 'Requiere una compra inicial de 3 cajas de capsulas con entrega automatica.',
  primaryCtaLabel = 'Reclamar oferta',
  secondaryCtaLabel = 'Ver como funciona',
  imageSrc = defaultHeroImage,
  imageAlt = 'Persona disfrutando cafe',
  badgeTitle = 'Suscribete y ahorra',
  badgePrice = '$179',
  onPrimaryAction,
  onSecondaryAction,
}: HeroProps) {
  return (
    <section
      aria-label="Oferta principal"
      className="relative flex min-h-[92vh] items-center justify-center overflow-hidden bg-secondary md:min-h-[96vh]"
    >
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-hero-fallback mix-blend-multiply"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-overlay/15" />

      <div
        aria-hidden="true"
        className="absolute right-[8%] top-[15%] flex h-[clamp(80px,12vw,130px)] w-[clamp(80px,12vw,130px)] flex-col items-center justify-center rounded-full bg-accent p-2 text-center text-[clamp(0.6rem,1.5vw,0.85rem)] font-extrabold uppercase leading-[1.3] text-white shadow-badge"
      >
        <span>{badgeTitle}</span>
        <strong className="text-[1.45em] leading-none">{badgePrice}</strong>
      </div>

      <div className="relative z-10 mx-auto flex max-w-site flex-col items-center px-4 py-8 text-center text-white sm:px-6 lg:px-10">
        <div className="max-w-[720px]">
          <p className="mb-4 text-[clamp(0.75rem,2vw,0.9rem)] font-semibold uppercase tracking-[0.1em] opacity-90">
            {eyebrow}
          </p>
          <h1 className="mb-4 text-[clamp(2rem,6vw,4rem)] font-extrabold leading-[1.15]">
            {title}
          </h1>
          <p className="mx-auto mb-10 max-w-[540px] text-[clamp(1rem,2.5vw,1.25rem)] opacity-90">
            {subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="inline-flex min-h-12 items-center justify-center rounded-pill border-2 border-accent bg-accent px-8 py-3.5 text-base font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:opacity-95"
            >
              {primaryCtaLabel}
            </button>

            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border-2 border-white bg-transparent px-8 py-3.5 text-base font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:opacity-95"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
              <span>{secondaryCtaLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
