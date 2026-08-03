import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Heart } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-12 text-[#86868b] text-xs">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#0071e3] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-[#1d1d1f] tracking-tight">
                Audio<span className="text-[#0071e3]">Dash</span>
              </span>
            </Link>

            <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
              A plataforma definitiva para exames de audiometria, anamnese e emissão rápida de laudos fonoaudiológicos com elegância e rigor técnico.
            </p>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Criptografia de Dados
              </span>
              <span>•</span>
              <span>100% Adequado à LGPD</span>
            </div>
          </div>

          {/* Nav Column 1 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Navegação</h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <a href="#recursos" className="hover:text-blue-600 transition-colors">
                  Recursos do Sistema
                </a>
              </li>
              <li>
                <a href="#bento" className="hover:text-blue-600 transition-colors">
                  Funcionalidades da Clínica
                </a>
              </li>
              <li>
                <a href="#comparativo" className="hover:text-blue-600 transition-colors">
                  Sua Rotina
                </a>
              </li>
              <li>
                <a href="#precos" className="hover:text-[#0071e3] transition-colors">
                  Plano & Preços
                </a>
              </li>
            </ul>
          </div>

          {/* Nav Column 2 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider">Acesso Rápido</h4>
            <ul className="space-y-2 text-[#86868b]">
              <li>
                <Link to="/login" className="hover:text-[#0071e3] transition-colors">
                  Área do Fonoaudiólogo (Login)
                </Link>
              </li>
              <li>
                <a href="#precos" className="hover:text-[#0071e3] transition-colors">
                  Assinar Plano Pro (R$ 50/mês)
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#0071e3] transition-colors">
                  Perguntas Frequentes
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} AudioDash. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1 text-slate-500">
            <span>
              Um produto{' '}
              <a 
                href="https://www.blackdogbr.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-semibold text-slate-700 hover:text-[#0071e3] transition-colors"
              >
                Black Dog
              </a>
              {' '}• Desenvolvido com excelência para a Fonoaudiologia
            </span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
        </div>

      </div>
    </footer>
  );
}
