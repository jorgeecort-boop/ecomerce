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

export default function HomePage() {
  return (
    <div className="bg-white">
      <AnnouncementBar />
      <Header />
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
