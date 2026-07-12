'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';

const navItems = [
  { name: 'Mi Perfil', href: '/account' },
  { name: 'Mis Órdenes', href: '/account/orders' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#03045E' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-[#00B4D8] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#03045E' }}>
      <header className="border-b border-[rgba(255,255,255,0.1)]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-white">
                SarahBits
              </Link>
              <nav className="hidden md:flex gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'text-[#00B4D8]'
                        : 'text-[rgba(255,255,255,0.6)] hover:text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[rgba(255,255,255,0.6)]">{user.email}</span>
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="text-sm text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-[1200px] mx-auto px-6 lg:px-10 py-8">{children}</main>
    </div>
  );
}
