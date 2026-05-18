import Navigation from '@/sections/Navigation';
import HeroSection from '@/sections/HeroSection';
import TrustBar from '@/sections/TrustBar';
import ProductCarousel from '@/sections/ProductCarousel';
import CategoryGrid from '@/sections/CategoryGrid';
import StatsSection from '@/sections/StatsSection';
import BenefitsSection from '@/sections/BenefitsSection';
import TestimonialsSection from '@/sections/TestimonialsSection';
import FlashSaleCTA from '@/sections/FlashSaleCTA';
import Footer from '@/sections/Footer';

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#03045E' }}>
      <Navigation />
      <HeroSection />
      <TrustBar />
      <ProductCarousel />
      <CategoryGrid />
      <StatsSection />
      <BenefitsSection />
      <TestimonialsSection />
      <FlashSaleCTA />
      <Footer />
    </div>
  );
}
