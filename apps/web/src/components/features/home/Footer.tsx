import Link from 'next/link';

export interface FooterLink {
  id: string;
  label: string;
  href: string;
}

export interface FooterProps {
  brand?: string;
  links?: FooterLink[];
  legalLinks?: FooterLink[];
}

export const mockFooterLinks: FooterLink[] = [
  { id: 'maquinas', label: 'Maquinas', href: '/store/tienda-demo' },
  { id: 'capsulas', label: 'Capsulas', href: '/store/tienda-demo' },
  { id: 'accesorios', label: 'Accesorios', href: '/store/tienda-demo' },
  { id: 'suscripcion', label: 'Suscripcion', href: '/register' },
];

export const mockFooterLegalLinks: FooterLink[] = [
  { id: 'terminos', label: 'Terminos', href: '/login' },
  { id: 'privacidad', label: 'Privacidad', href: '/login' },
  { id: 'cookies', label: 'Cookies', href: '/login' },
];

export function Footer({
  brand = 'MARCA®',
  links = mockFooterLinks,
  legalLinks = mockFooterLegalLinks,
}: FooterProps) {
  return (
    <footer aria-label="Footer principal" className="border-t border-black/10 bg-white py-10">
      <div className="mx-auto w-full max-w-site px-4 sm:px-6 lg:px-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xl font-extrabold tracking-[0.12em] text-primary">{brand}</p>
            <p className="mt-2 text-sm text-secondary">
              Cafe excepcional y tecnologia para crecer tu e-commerce.
            </p>
          </div>

          <nav aria-label="Footer navegacion principal">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {links.map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className="text-sm font-semibold text-primary hover:opacity-85">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-black/10 pt-4 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {brand}. Todos los derechos reservados.</p>
          <nav aria-label="Footer enlaces legales">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {legalLinks.map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className="hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
