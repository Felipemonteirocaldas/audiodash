import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import BentoGridSection from '../components/landing/BentoGridSection';
import BeforeAfterSection from '../components/landing/BeforeAfterSection';
import PricingSection from '../components/landing/PricingSection';
import FAQSection from '../components/landing/FAQSection';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0071e3] selection:text-white font-['Inter',sans-serif]">
      {/* Top Floating Glass Navigation */}
      <LandingNavbar />

      <main>
        {/* Apple Style Hero with Interactive Audiogram Preview */}
        <HeroSection />

        {/* Bento Grid Feature Section (Stripe / Apple Style) */}
        <BentoGridSection />

        {/* Before vs After Productivity Section */}
        <BeforeAfterSection />

        {/* Pricing & Checkout Section */}
        <PricingSection />

        {/* FAQ Accordion Section */}
        <FAQSection />
      </main>

      {/* Institutional Footer */}
      <LandingFooter />
    </div>
  );
}
