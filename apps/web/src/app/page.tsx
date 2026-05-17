'use client';

import { useState } from 'react';
import AnnouncementBar from '@/components/features/home/AnnouncementBar';
import Header from '@/components/features/home/Header';
import Hero from '@/components/features/home/Hero';
import TrustBanner from '@/components/features/home/TrustBanner';
import TrendingProducts from '@/components/features/home/TrendingProducts';
import CategoryGrid from '@/components/features/home/CategoryGrid';
import Features from '@/components/features/home/Features';
import Testimonials from '@/components/features/home/Testimonials';
import CTABanner from '@/components/features/home/CTABanner';
import Footer from '@/components/features/home/Footer';
import CartDrawer from '@/components/features/home/CartDrawer';
import { useCart } from '@/hooks/useCart';

const STORE_SLUG = 'tienda-demo';

export default function HomePage() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cartCount } = useCart(STORE_SLUG);

  const handleCartClick = () => setIsCartOpen(true);
  const handleSearchClick = () => {
    window.location.href = '/store/tienda-demo';
  };

  return (
    <div className="bg-white">
      <AnnouncementBar />
      <Header
        cartCount={cartCount}
        onCartClick={handleCartClick}
        onSearchClick={handleSearchClick}
      />
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        storeSlug={STORE_SLUG}
      />
      <main>
        <Hero />
        <TrustBanner />
        <TrendingProducts />
        <CategoryGrid />
        <Features />
        <Testimonials />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
