import { CheckCircle2, ShieldCheck, ArrowRight, Lock, Stethoscope } from 'lucide-react';

export default function PricingSection() {
  const handleCheckout = () => {
    window.location.href = 'https://test.checkout.dodopayments.com/buy/pdt_0NkP4tyyh4C0dF9wG6eUW';
  };

  return (
    <section id="precos" className="py-14 sm:py-24 bg-white relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-5xl mx-auto mb-10 sm:mb-16 space-y-3 sm:space-y-4">

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight text-balance">
            Um valor acessível para transformar <span className="text-blue-600">o seu consultório</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Cancele quando quiser com 1 clique. Sem fidelidade ou custos escondidos.
          </p>
        </div>

        {/* 2-Column Side-by-Side Pricing Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
          
          {/* Left Column: Value & Features (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-[#fafafa] border border-slate-200/90 rounded-3xl p-8 sm:p-10 flex flex-col justify-between space-y-8 shadow-sm">
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Sua clínica completa sem mensalidades abusivas
              </h3>
              <p className="text-slate-600 text-base mt-3 leading-relaxed">
                Acesso irrestrito a todas as funcionalidades do AudioDash. Crie exames, emita laudos e acompanhe o histórico dos pacientes com máxima agilidade.
              </p>

              {/* Grid of features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-200/80">
                {[
                  "Pacientes ilimitados no prontuário",
                  "Audiometrias Tonais e Vocais ilimitadas",
                  "Comparativo gráfico de evolução auditiva",
                  "Anamnese fonoaudiológica completa",
                  "Geração de laudos oficiais em PDF",
                  "Modo Offline PWA (funciona sem internet)",
                  "Sincronização em nuvem e backup",
                  "Suporte prioritário via WhatsApp e e-mail"
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm font-medium text-slate-800">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Trust Notes */}
            <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" /> Pagamento 100% Criptografado
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Conforme Normas CFFa
              </span>
            </div>
          </div>

          {/* Right Column: Checkout Pricing Card (lg:col-span-5) */}
          <div className="lg:col-span-5 relative rounded-3xl p-1 bg-gradient-to-b from-blue-400 via-blue-600 to-indigo-600 shadow-xl shadow-blue-500/10 flex flex-col justify-between">
            
            {/* Top Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-bold text-xs uppercase px-4 py-1.5 rounded-full shadow-md tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-white" /> Plano Profissional
            </div>

            {/* Card Body */}
            <div className="bg-white rounded-[23px] p-8 sm:p-10 flex flex-col justify-between h-full space-y-8">
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-900">AudioDash Pro</h3>
                <p className="text-sm text-slate-500">Para fonoaudiólogos autônomos e clínicas</p>
                
                <div className="pt-6 flex items-baseline justify-center gap-1">
                  <span className="text-sm text-slate-500 font-semibold uppercase">R$</span>
                  <span className="text-7xl font-extrabold text-slate-900 tracking-tight">50</span>
                  <span className="text-2xl font-bold text-slate-700">,00</span>
                  <span className="text-sm text-slate-500 font-medium ml-1">/ mês</span>
                </div>
                <p className="text-sm text-emerald-700 font-semibold pt-1">Sem taxa de adesão • Cancele a qualquer momento</p>
              </div>

              {/* Action Button */}
              <div className="space-y-4 pt-4">
                <button
                  onClick={handleCheckout}
                  className="w-full py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Assinar o AudioDash Pro</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-blue-600" /> Checkout Seguro
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Sem Contrato Fixo
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
