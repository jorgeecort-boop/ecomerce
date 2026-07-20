import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'SaraTech — Tecnologia inteligente para tu hogar y tu dia a dia',
  description:
    'Descubre productos innovadores con envio a toda Colombia. Tecnologia para el hogar, gadgets, accesorios y mas.',
  openGraph: {
    title: 'SaraTech — Tecnologia inteligente para tu hogar',
    description:
      'Descubre productos innovadores con envio a toda Colombia. Tecnologia para el hogar, gadgets, accesorios y mas.',
    url: 'https://ecomerce-web.vercel.app',
    siteName: 'SaraTech',
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SaraTech — Tecnologia inteligente para tu hogar',
    description:
      'Descubre productos innovadores con envio a toda Colombia.',
  },
};

export default function HomePage() {
  return <HomeClient />;
}
