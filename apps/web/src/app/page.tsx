import AnnouncementBar from '@/components/features/home/AnnouncementBar';
import Header from '@/components/features/home/Header';
import Hero from '@/components/features/home/Hero';
import AsSeenOn from '@/components/features/home/AsSeenOn';
import CategoryGrid from '@/components/features/home/CategoryGrid';
import Features from '@/components/features/home/Features';
import CTABanner from '@/components/features/home/CTABanner';
import Footer from '@/components/features/home/Footer';

export default function HomePage() {
  return (
    <div className="bg-white text-text">
      <AnnouncementBar />
      <Header />
      <main>
        <Hero />
        <AsSeenOn />
        <CategoryGrid />
        <Features />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
