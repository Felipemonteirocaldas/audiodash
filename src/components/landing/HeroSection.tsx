import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  FileSpreadsheet, 
  Activity, 
  Ear, 
  Users, 
  Award 
} from 'lucide-react';

export default function HeroSection() {
  const [activeTab, setActiveTab] = useState<'tonal' | 'vocal' | 'comparativo'>('tonal');

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-[#fafafa]">
      {/* Background Soft Natural Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-blue-100/50 via-sky-50/40 to-slate-100/30 rounded-full blur-[140px] pointer-events-none -z-10"></div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        


        {/* Human Headline & Empathy Copywriting */}
        <div className="text-center max-w-6xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.15] text-balance">
            Mais tempo para seus pacientes. <span className="text-blue-600">Menos tempo digitando laudos.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-4xl mx-auto">
            O <strong className="text-slate-900 font-semibold">AudioDash</strong> simplifica o lançamento de audiometrias tonais e vocais, gera laudos oficiais em PDF em 1 clique e organiza o histórico dos seus pacientes sem complicação.
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
              <span>Ver Exemplo Prático</span>
            </Link>
          </div>

          {/* Real Social Proof Badge */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Utilizado em mais de 120 consultórios</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Conforme Resoluções do CFFa</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Emissão do laudo em 3 minutos</span>
            </div>
          </div>
        </div>

        {/* Real Clinical Audiogram Interface Card */}
        <div className="mt-14 relative max-w-7xl mx-auto">
          {/* Outer Glass Card */}
          <div className="relative rounded-3xl p-3 bg-white border border-slate-200/90 shadow-2xl">
            
            {/* Top Browser/App Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/90 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <span className="ml-3 text-xs font-medium text-slate-500 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  Prontuário Fonoaudiológico — Exame #302
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-blue-50 text-blue-700 font-medium px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  Dra. Camila Rocha (CRFa 4-18920)
                </span>
              </div>
            </div>

            {/* Inner Clinical Screen */}
            <div className="bg-white rounded-b-2xl p-6 sm:p-8 space-y-6">
              
              {/* Patient Header Box */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                    AM
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Ana Clara Mendes
                      <span className="text-xs bg-slate-100 text-slate-600 font-normal px-2.5 py-0.5 rounded-full">42 anos</span>
                    </div>
                    <p className="text-xs text-slate-500">Audiometria Tonal Liminar e Vocal • Data: 03/08/2026</p>
                  </div>
                </div>

                {/* Tab Switchers */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setActiveTab('tonal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      activeTab === 'tonal'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Audiograma Tonal
                  </button>
                  <button
                    onClick={() => setActiveTab('vocal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      activeTab === 'vocal'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Audiometria Vocal
                  </button>
                  <button
                    onClick={() => setActiveTab('comparativo')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      activeTab === 'comparativo'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Evolução Gráfica
                  </button>
                </div>
              </div>

              {/* Graphic Audiogram Visualization */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Audiogram Chart Box */}
                <div className="lg:col-span-2 bg-[#fafafa] border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-slate-700 tracking-wide flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span> Orelha Direita (OD)
                      <span className="w-3 h-3 rounded-full bg-blue-600 ml-3"></span> Orelha Esquerda (OE)
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Frequências (250Hz - 8000Hz)</span>
                  </div>

                  {/* Clean Audiogram Chart */}
                  <div className="h-48 sm:h-56 relative flex items-end justify-between px-2 pt-6 pb-2 border-l border-b border-slate-300 bg-white rounded-bl-lg">
                    {/* Horizontal Freq Lines */}
                    {[0, 20, 40, 60, 80, 100].map((val) => (
                      <div
                        key={val}
                        className="absolute left-0 right-0 border-t border-slate-200 flex items-center justify-between text-[9px] font-mono text-slate-400"
                        style={{ top: `${(val / 100) * 100}%` }}
                      >
                        <span className="-mt-2.5 ml-1 font-semibold">{val}dB</span>
                      </div>
                    ))}

                    {/* SVG Audiogram curves */}
                    <svg className="absolute inset-0 w-full h-full p-6 overflow-visible pointer-events-none">
                      {/* Red line OD */}
                      <path
                        d="M 20 40 L 90 45 L 160 50 L 230 65 L 300 70 L 370 75 L 440 80"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                      />
                      {/* Blue line OE */}
                      <path
                        d="M 20 30 L 90 35 L 160 40 L 230 45 L 300 55 L 370 60 L 440 65"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeDasharray="4 4"
                      />
                    </svg>

                    {/* Frequency Dots */}
                    {[
                      { freq: '250', od: '40dB' },
                      { freq: '500', od: '45dB' },
                      { freq: '1k', od: '50dB' },
                      { freq: '2k', od: '65dB' },
                      { freq: '4k', od: '70dB' },
                      { freq: '8k', od: '80dB' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 z-10">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-md"></div>
                        <span className="text-[10px] font-mono font-semibold text-slate-500 mt-2">{item.freq}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Conclusão: <strong className="text-slate-900 font-semibold">Perda Auditiva Sensorioneural Leve a Moderada</strong>
                    </span>
                    <span className="text-blue-600 font-semibold hover:underline cursor-pointer">
                      Ver Laudo em PDF →
                    </span>
                  </div>
                </div>

                {/* Right Clinical Summary Panel */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="bg-[#fafafa] border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Status do Prontuário</span>
                      <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">Pronto para Imprimir</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-700 font-medium flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" /> Formatos de Laudo
                        </span>
                        <span className="text-slate-500">PDF</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full w-full"></div>
                      </div>
                    </div>
                    <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Discriminação Vocal (IPRF):</span>
                      <span className="text-slate-900 font-bold">100% em 70dB</span>
                    </div>
                  </div>

                  <div className="bg-[#fafafa] border border-slate-200 rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Acompanhamento Longitudinal
                    </span>
                    <div className="flex items-center justify-between text-xs text-slate-700 pt-1">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Comparativo 2025 vs 2026
                      </span>
                      <span className="text-emerald-600 font-mono font-bold">Curva Estável</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Imprimir ou Enviar Laudo</h4>
                      <p className="text-[11px] text-blue-700">Com timbre e carimbo do profissional</p>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm">
                      Gerar
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
