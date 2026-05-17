import Link from 'next/link';

export const mockFooterLinks = [
  { id: 'audio', label: 'Audio', href: '/store/tienda-demo' },
  { id: 'gaming', label: 'Gaming', href: '/store/tienda-demo' },
  { id: 'streaming', label: 'Streaming', href: '/store/tienda-demo' },
  { id: 'wearables', label: 'Wearables', href: '/store/tienda-demo' },
  { id: 'electronica', label: 'Electronica', href: '/store/tienda-demo' },
];

export const mockFooterLegalLinks = [
  { id: 'terminos', label: 'Terminos', href: '#' },
  { id: 'privacidad', label: 'Privacidad', href: '#' },
  { id: 'contacto', label: 'Contacto', href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-10 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
                <span className="text-white font-extrabold text-lg">S</span>
              </div>
              <span className="text-xl font-extrabold tracking-wider">SarahBits</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
              Gadgets tecnologicos premium para tu setup diario. Los mejores productos al mejor precio con envio a toda Colombia.
            </p>
            <div className="flex gap-3">
              {['instagram', 'facebook', 'twitter'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-indigo-600 flex items-center justify-center transition-colors"
                  aria-label={social}
                >
                  <span className="text-sm capitalize">{social[0].toUpperCase()}</span>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-slate-300">Categorias</h4>
            <ul className="space-y-2.5">
              {mockFooterLinks.map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-slate-300">Legal</h4>
            <ul className="space-y-2.5">
              {mockFooterLegalLinks.map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} SarahBits. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>🇨🇴 Hecho en Colombia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
