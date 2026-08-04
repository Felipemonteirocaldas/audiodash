import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ear, Menu, X, ArrowRight, Stethoscope } from 'lucide-react';

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 py-3.5 shadow-sm'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <Ear className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              Audio<span className="text-blue-600">Dash</span>
            </span>
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Fonoaudiologia & Audiometria
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#recursos"
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            Recursos
          </a>
          <a
            href="#bento"
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            O Sistema
          </a>
          <a
            href="#comparativo"
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            Sua Rotina
          </a>
          <a
            href="#precos"
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1.5"
          >
            Planos
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
              PRO
            </span>
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            Dúvidas
          </a>
        </nav>

        {/* Desktop Right CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-4 py-2 rounded-lg transition-colors"
          >
            Entrar no Sistema
          </Link>
          <a
            href="#precos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-95"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Testar no Consultório</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </a>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none"
          aria-label={mobileMenuOpen ? 'Fechar Menu' : 'Abrir Menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/98 backdrop-blur-xl border-b border-slate-200 px-6 py-6 space-y-4 shadow-xl">
          <a
            href="#recursos"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-800 hover:text-blue-600 py-1"
          >
            Recursos
          </a>
          <a
            href="#bento"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-800 hover:text-blue-600 py-1"
          >
            O Sistema
          </a>
          <a
            href="#comparativo"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-800 hover:text-blue-600 py-1"
          >
            Sua Rotina
          </a>
          <a
            href="#precos"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-800 hover:text-blue-600 py-1"
          >
            Planos
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-800 hover:text-blue-600 py-1"
          >
            Dúvidas Frequentes
          </a>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 font-semibold text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Entrar no Sistema
            </Link>
            <a
              href="#precos"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md shadow-blue-500/20"
            >
              Testar no Consultório
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
