import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crear cuenta — SaraTech',
  description: 'Registrate en SaraTech y descubre productos innovadores con envio a toda Colombia.',
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
