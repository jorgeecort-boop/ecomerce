import Link from 'next/link';

export interface AnnouncementBarProps {
  prefixText?: string;
  linkText?: string;
  linkHref?: string;
}

export function AnnouncementBar({
  prefixText = 'Envio gratis a partir de $69',
  linkText = 'Descubre nuestras nuevas Capsulas Premium.',
  linkHref = '#',
}: AnnouncementBarProps) {
  return (
    <div className="bg-primary px-4 py-2 text-center text-xs font-medium tracking-[0.02em] text-white sm:text-sm">
      <div className="mx-auto flex max-w-site items-center justify-center gap-2">
        <span>{prefixText} ·</span>
        <span>
          <Link
            href={linkHref}
            className="underline underline-offset-2 hover:opacity-90"
          >
            {linkText}
          </Link>
        </span>
      </div>
    </div>
  );
}

export default AnnouncementBar;
