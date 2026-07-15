import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { ApiWarmup } from '@/components/shared/ApiWarmup';

export const metadata: Metadata = {
  title: 'Ecomerce - Dropshipping Platform',
  description: 'Automated dropshipping platform for high-volume stores',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://ecomerce-api-zulc.onrender.com" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <ApiWarmup />
        <Script
          defer
          data-domain="ecomerce-web.vercel.app"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
