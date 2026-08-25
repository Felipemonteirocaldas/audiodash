import { Link } from 'react-router-dom';
import { ShieldCheck, Heart } from 'lucide-react';
import { LogoAD } from '../LogoAD';

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-12 text-slate-500 text-xs">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center p-1.5 shadow-md shadow-slate-900/10">
                <LogoAD className="w-full h-full" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                Audio<span className="text-blue-600">Dash</span>
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
                <a href="#comparativo" className="hover:text-blue-600 transition-colors">
                  Sua Rotina
                </a>
              </li>
              <li>
                <a href="#precos" className="hover:text-blue-600 transition-colors">
                  Plano & Preços
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-blue-600 transition-colors">
                  Perguntas Frequentes
                </a>
              </li>
            </ul>
          </div>

          {/* Nav Column 2 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Acesso Rápido</h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link to="/login" className="hover:text-blue-600 transition-colors font-medium">
                  Área do Fonoaudiólogo (Login)
                </Link>
              </li>
              <li>
                <a href="#precos" className="hover:text-blue-600 transition-colors">
                  Assinar Plano Pro (R$ 50/mês)
                </a>
              </li>
              <li>
                <Link to="/manual" className="hover:text-blue-600 transition-colors">
                  Manual de Instruções
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Legal Links Bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-500 pt-4 border-t border-slate-100">
          <Link to="/termos" className="hover:text-blue-600 transition-colors font-medium">
            Termos de Uso
          </Link>
          <Link to="/privacidade" className="hover:text-blue-600 transition-colors font-medium">
            Política de Privacidade
          </Link>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Conformidade LGPD
          </span>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} AudioDash. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1 text-slate-500">
            <span>
              Um produto{' '}
              <a 
                href="https://www.blackdogbr.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-semibold text-slate-700 hover:text-blue-600 transition-colors"
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
