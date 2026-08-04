import React, { useEffect, Suspense } from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';

const BentoGridSection = React.lazy(() => import('../components/landing/BentoGridSection'));
const BeforeAfterSection = React.lazy(() => import('../components/landing/BeforeAfterSection'));
const PricingSection = React.lazy(() => import('../components/landing/PricingSection'));
const FAQSection = React.lazy(() => import('../components/landing/FAQSection'));
const LandingFooter = React.lazy(() => import('../components/landing/LandingFooter'));

import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    document.title = "AudioDash | Software para Fonoaudiologia";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "AudioDash é o sistema completo para fonoaudiólogos. Agilize seus laudos, audiometrias e gestão de clínicas com nossa plataforma moderna e segura.");
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "AudioDash é o sistema completo para fonoaudiólogos. Agilize seus laudos, audiometrias e gestão de clínicas com nossa plataforma moderna e segura.";
      document.head.appendChild(meta);
    }
  }, []);

  // If user is already authenticated (e.g. returning from Google OAuth), go to dashboard
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/painel" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0071e3] selection:text-white font-['Inter',sans-serif]">
      {/* Top Floating Glass Navigation */}
      <LandingNavbar />

      <main>
        {/* Apple Style Hero with Interactive Audiogram Preview */}
        <HeroSection />

        <Suspense fallback={<div className="h-40 flex items-center justify-center text-slate-500">Carregando...</div>}>
          {/* Bento Grid Feature Section (Stripe / Apple Style) */}
          <BentoGridSection />

          {/* Before vs After Productivity Section */}
          <BeforeAfterSection />

          {/* Pricing & Checkout Section */}
          <PricingSection />

          {/* FAQ Accordion Section */}
          <FAQSection />
        </Suspense>
      </main>

      {/* Institutional Footer */}
      <Suspense fallback={<div />}>
        <LandingFooter />
      </Suspense>
    </div>
  );
}
