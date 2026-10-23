import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Ear, Award } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative pt-20 pb-12 sm:pt-32 sm:pb-20 md:pt-40 md:pb-32 overflow-hidden bg-[#fafafa]">
      {/* Background Soft Natural Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-blue-100/50 via-sky-50/40 to-slate-100/30 rounded-full blur-[140px] pointer-events-none -z-10"></div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Human Headline & Empathy Copywriting */}
        <div className="text-center max-w-6xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-xs">
            <span>Sistema Especializado para Clínicas de Fonoaudiologia</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.15] text-balance">
            Mais tempo para seus pacientes. <span className="text-blue-600">Menos tempo digitando laudos.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-4xl mx-auto">
            O <strong className="text-slate-900 font-semibold">AudioDash</strong> simplifica o lançamento de audiometrias tonais e vocais, gera laudos em PDF a partir dos dados registrados e organiza o histórico dos seus pacientes sem complicação.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="#precos"
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              <span>Começar no seu Consultório</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>

            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-4 rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
            >
              <Ear className="w-4 h-4 text-blue-600" />
              <span>Entrar no Sistema</span>
            </Link>
          </div>

          {/* Real Social Proof Badge */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Referências clínicas citadas no registro</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Exportação em PDF e Excel</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
