import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar sesion — SaraTech',
  description: 'Accede a tu cuenta de SaraTech para ver tus ordenes y gestionar tus compras.',
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
