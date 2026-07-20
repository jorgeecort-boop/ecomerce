import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout — SaraTech',
  description: 'Completa tu compra de forma segura con envio a toda Colombia.',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
