import { XCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BeforeAfterSection() {
  const comparisons = [
    {
      old: "Digitar tabelas de frequências manualmente e ajustar formatação no Word ou Excel",
      new: "Lançamento direto em grade intuitiva com cálculo imediato das médias tonais",
    },
    {
      old: "Desenhar gráficos de audiometria à mão ou escanear fichas de papel rasuradas",
      new: "Audiogramas coloridos gerados em alta resolução, prontos para impressão ou envio",
    },
    {
      old: "Procurar exames antigos em pastas físicas para analisar a evolução da perda auditiva",
      new: "Sobreposição gráfica instantânea da curva evolutiva do paciente na mesma tela",
    },
    {
      old: "Receito constante de perder arquivos ou danificar fichas médicas físicas",
      new: "Armazenamento em nuvem com conexão criptografada e backup manual exportável",
    },
    {
      old: "Redigir o laudo do zero depois da consulta, a partir de anotações soltas",
      new: "Registro estruturado e exportação em PDF ao final da avaliação, com revisão profissional",
    },
  ];

  return (
    <section id="comparativo" className="py-14 sm:py-24 bg-[#fafafa] relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-5xl mx-auto mb-10 sm:mb-16 space-y-3 sm:space-y-4">

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            A diferença no seu dia a dia de atendimento
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-600">
            Mais praticidade para você, mais agilidade para o seu paciente.
          </p>
        </div>

        {/* Mobile: Two separate grouped cards */}
        <div className="md:hidden max-w-7xl mx-auto space-y-6">
          {/* Card: Sem AudioDash */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-800">Sem o AudioDash</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {comparisons.map((item, idx) => (
                <div key={idx} className="p-4 flex items-start gap-3 text-slate-600 text-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 flex-shrink-0"></span>
                  <span>{item.old}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Com AudioDash */}
          <div className="bg-white border border-blue-200 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-5 bg-blue-50/60 border-b border-blue-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Com o AudioDash</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {comparisons.map((item, idx) => (
                <div key={idx} className="p-4 flex items-start gap-3 text-blue-950 text-sm font-semibold bg-blue-50/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{item.new}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop: Side-by-side comparison grid */}
        <div className="hidden md:block max-w-7xl mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
          
          {/* Header Row */}
          <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200">
            <div className="p-6 border-r border-slate-200 flex items-center gap-3">
              <XCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
              <h3 className="text-lg font-bold text-slate-800">Como você trabalha sem o AudioDash</h3>
            </div>
            <div className="p-6 flex items-center gap-3 bg-blue-50/60">
              <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">Com o AudioDash no seu Consultório</h3>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {comparisons.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 hover:bg-slate-50/50 transition-colors">
                
                {/* Old way */}
                <div className="p-6 border-r border-slate-100 flex items-start gap-3 text-slate-600 text-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 flex-shrink-0"></span>
                  <span>{item.old}</span>
                </div>

                {/* New AudioDash way */}
                <div className="p-6 flex items-start gap-3 text-blue-950 text-sm font-semibold bg-blue-50/30">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{item.new}</span>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Footer Callout */}
        <div className="max-w-7xl mx-auto mt-6 p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl md:rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="text-sm font-bold text-slate-900">Economize até 15 horas mensais na digitação de exames</h4>
            <p className="text-xs text-slate-500 mt-1">Dedique seu tempo ao atendimento humanizado dos seus pacientes.</p>
          </div>
          <a
            href="#precos"
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 whitespace-nowrap transition-transform active:scale-95"
          >
            Testar Gratuitamente <ArrowRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
}
