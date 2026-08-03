import { 
  Activity, 
  TrendingUp, 
  FileText, 
  WifiOff, 
  Database, 
  UserCheck, 
  Zap, 
  ShieldCheck, 
  Download,
  BarChart3,
  Sliders
} from 'lucide-react';

export default function BentoGridSection() {
  return (
    <section id="bento" className="py-24 bg-white relative">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-5xl mx-auto mb-16 space-y-4">

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight text-balance">
            Tudo o que você precisa na rotina da <span className="text-blue-600">Fonoaudiologia e Audiometria</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Ferramentas pensadas para simplificar o seu atendimento, reduzir a carga de trabalho administrativo e entregar exames impecáveis.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Audiometria Tonal & Vocal (Col Span 2) */}
          <div className="md:col-span-2 group relative rounded-2xl p-8 bg-[#fafafa] border border-slate-200/90 hover:border-blue-300 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Exame Principal</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">Lançamento Ágil de Audiometria Tonal & Vocal</h3>
                <p className="text-base text-slate-600 mt-2 max-w-xl">
                  Lance frequências via aérea, via óssea, mascaramento, SRT, IPRF e Weber com facilidade. Cálculo automático das médias tritonal e quadritonal.
                </p>
              </div>
            </div>

            {/* Inner Feature Boxes */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Sliders className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="text-[11px] text-slate-500 block">Mascaramento</span>
                  <span className="text-xs font-bold text-slate-900">Orientado</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-[11px] text-slate-500 block">Médias Tonais</span>
                  <span className="text-xs font-bold text-slate-900">Automáticas</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-600" />
                <div>
                  <span className="text-[11px] text-slate-500 block">Tempo Médio</span>
                  <span className="text-xs font-bold text-slate-900">3 Min / Exame</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Comparativo Evolutivo (Col Span 1) */}
          <div className="group relative rounded-2xl p-8 bg-[#fafafa] border border-slate-200/90 hover:border-blue-300 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Histórico Clínico</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">Comparativo de Evolução</h3>
                <p className="text-sm text-slate-600 mt-2">
                  Sobreponha audiogramas antigos e atuais em um único gráfico para avaliar a progressão da audição e a indicação de AASI.
                </p>
              </div>
            </div>

            <div className="mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex flex-wrap justify-between gap-1 text-[11px] font-semibold text-slate-600">
                <span>Evolução 2024 vs 2026</span>
                <span className="text-emerald-700 font-bold">Curva Estável</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full w-4/5"></div>
              </div>
            </div>
          </div>

          {/* Card 3: Laudos PDF & Word (Col Span 1) */}
          <div className="group relative rounded-2xl p-8 bg-[#fafafa] border border-slate-200/90 hover:border-blue-300 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Documentação Profissional</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">Laudos em PDF</h3>
                <p className="text-sm text-slate-600 mt-2">
                  Imprima ou exporte laudos formatados com o timbre da sua clínica, carimbo do CFFa e gráficos em alta resolução.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-3 py-1.5 rounded-full border border-blue-200 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> PDF Oficial
              </span>
            </div>
          </div>

          {/* Card 4: Prontuário & Anamnese Integrada (Col Span 1) */}
          <div className="group relative rounded-2xl p-8 bg-[#fafafa] border border-slate-200/90 hover:border-blue-300 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Atendimento Completo</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">Prontuário & Anamnese</h3>
                <p className="text-sm text-slate-600 mt-2">
                  Guarde históricos de queixas sobre zumbido, otalgia, tontura e exposição a ruídos ocupacionais em um único lugar.
                </p>
              </div>
            </div>

            <div className="mt-6 text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-medium shadow-sm">
              ✓ Histórico de Anamnese Integrado
            </div>
          </div>

          {/* Card 5: Modo Offline PWA & Nuvem (Col Span 1) */}
          <div className="group relative rounded-2xl p-8 bg-[#fafafa] border border-slate-200/90 hover:border-blue-300 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600">
                <WifiOff className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Mobilidade no Atendimento</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">Offline & Nuvem</h3>
                <p className="text-sm text-slate-600 mt-2">
                  Realize atendimentos sem sinal. O AudioDash salva os exames localmente e sincroniza na nuvem com segurança.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Criptografia Bancária
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <Database className="w-4 h-4 text-blue-600" />
                Backups Diários
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Conformidade LGPD
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
