'use client';

import { useState } from 'react';
import { useLenis } from '@/hooks/useLenis';
import Navigation from '@/components/features/kimi-landing/Navigation';
import HeroSection from '@/components/features/kimi-landing/HeroSection';
import TrustBar from '@/components/features/kimi-landing/TrustBar';
import ProductCarousel from '@/components/features/kimi-landing/ProductCarousel';
import CategoryGrid from '@/components/features/kimi-landing/CategoryGrid';
import StatsSection from '@/components/features/kimi-landing/StatsSection';
import BenefitsSection from '@/components/features/kimi-landing/BenefitsSection';
import TestimonialsSection from '@/components/features/kimi-landing/TestimonialsSection';
import FlashSaleCTA from '@/components/features/kimi-landing/FlashSaleCTA';
import Footer from '@/components/features/kimi-landing/Footer';
import CartDrawer from '@/components/features/home/CartDrawer';
import { useCart } from '@/hooks/useCart';

const STORE_SLUG = 'tienda-demo';

export default function HomePage() {
  useLenis();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cartCount } = useCart(STORE_SLUG);

  const handleCartClick = () => setIsCartOpen(true);
  const handleStoreClick = () => {
    window.location.href = `/store/${STORE_SLUG}`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#03045E' }}>
      <Navigation
        cartCount={cartCount}
        onCartClick={handleCartClick}
        onStoreClick={handleStoreClick}
      />
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        storeSlug={STORE_SLUG}
      />
      <main>
        <HeroSection />
        <TrustBar />
        <ProductCarousel />
        <CategoryGrid />
        <StatsSection />
        <BenefitsSection />
        <TestimonialsSection />
        <FlashSaleCTA />
      </main>
      <Footer />
    </div>
  );
}
