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
  Award,
  X,
  Printer,
  Download,
  Sparkles,
  Volume2,
  FileCheck2
} from 'lucide-react';

const FREQUENCY_LINES = [0, 20, 40, 60, 80, 100];
const AUDIOGRAM_POINTS = [
  { freq: '250', od: '40dB' },
  { freq: '500', od: '45dB' },
  { freq: '1k', od: '50dB' },
  { freq: '2k', od: '65dB' },
  { freq: '4k', od: '70dB' },
  { freq: '8k', od: '80dB' },
];

export default function HeroSection() {
  const [activeTab, setActiveTab] = useState<'tonal' | 'vocal' | 'comparativo'>('tonal');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePdf = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsPdfModalOpen(true);
    }, 600);
  };

  return (
    <section className="relative pt-20 pb-12 sm:pt-32 sm:pb-20 md:pt-40 md:pb-32 overflow-hidden bg-[#fafafa]">
      {/* Background Soft Natural Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-blue-100/50 via-sky-50/40 to-slate-100/30 rounded-full blur-[140px] pointer-events-none -z-10"></div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Human Headline & Empathy Copywriting */}
        <div className="text-center max-w-6xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Sistema Especializado para Clínicas de Fonoaudiologia</span>
          </div>

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
              <span>Entrar no Sistema</span>
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
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 bg-slate-50/90 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="hidden sm:block w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="hidden sm:block w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="hidden sm:block w-3 h-3 rounded-full bg-slate-300"></div>
                <span className="sm:ml-3 text-[10px] sm:text-xs font-medium text-slate-500 flex items-center gap-1.5 sm:gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Prontuário Fonoaudiológico — </span>Exame #302
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] bg-blue-50 text-blue-700 font-medium px-2 sm:px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span className="hidden sm:inline">Dra. Camila Rocha (CRFa 4-18920)</span>
                  <span className="sm:hidden">Dra. Camila</span>
                </span>
              </div>
            </div>

            {/* Inner Clinical Screen */}
            <div className="bg-white rounded-b-2xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              
              {/* Patient Header Box */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs sm:text-sm">
                    AM
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                      Ana Clara Mendes
                      <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-600 font-normal px-2 sm:px-2.5 py-0.5 rounded-full">42 anos</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500">Audiometria Tonal Liminar e Vocal • 03/08/2026</p>
                  </div>
                </div>

                {/* Tab Switchers */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setActiveTab('tonal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      activeTab === 'tonal'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tonal
                  </button>
                  <button
                    onClick={() => setActiveTab('vocal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      activeTab === 'vocal'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Vocal (Logoaudiometria)
                  </button>
                  <button
                    onClick={() => setActiveTab('comparativo')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      activeTab === 'comparativo'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Evolução (2024 vs 2026)
                  </button>
                </div>
              </div>

              {/* Dynamic Visualization Area depending on Tab */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Interactive Chart Box */}
                <div className="lg:col-span-2 bg-[#fafafa] border border-slate-200 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                  
                  {activeTab === 'tonal' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 tracking-wide flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span> Orelha Direita (OD)
                          <span className="w-3 h-3 rounded-full bg-blue-600 ml-3"></span> Orelha Esquerda (OE)
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Frequências (250Hz - 8000Hz)</span>
                      </div>

                      {/* Tonal Chart */}
                      <div className="h-48 sm:h-56 relative flex items-end justify-between px-2 pt-6 pb-2 border-l border-b border-slate-300 bg-white rounded-bl-lg">
                        {FREQUENCY_LINES.map((val) => (
                          <div
                            key={val}
                            className="absolute left-0 right-0 border-t border-slate-200 flex items-center justify-between text-[9px] font-mono text-slate-400"
                            style={{ top: `${(val / 100) * 100}%` }}
                          >
                            <span className="-mt-2.5 ml-1 font-semibold">{val}dB</span>
                          </div>
                        ))}

                        <svg className="absolute inset-0 w-full h-full p-6 overflow-visible pointer-events-none">
                          <path
                            d="M 20 40 L 90 45 L 160 50 L 230 65 L 300 70 L 370 75 L 440 80"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3"
                          />
                          <path
                            d="M 20 30 L 90 35 L 160 40 L 230 45 L 300 55 L 370 60 L 440 65"
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3"
                            strokeDasharray="4 4"
                          />
                        </svg>

                        {AUDIOGRAM_POINTS.map((item, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1 z-10">
                            <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-md"></div>
                            <span className="text-[10px] font-mono font-semibold text-slate-500 mt-2">{item.freq}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>Conclusão: <strong className="text-slate-900 font-semibold">Perda Sensorioneural Leve a Moderada</strong></span>
                        </span>
                        <button 
                          onClick={() => setIsPdfModalOpen(true)}
                          className="text-blue-600 font-semibold hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Ver Laudo em PDF →
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'vocal' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 tracking-wide flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-blue-600" /> Logoaudiometria / Discriminação Vocal
                        </span>
                        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Excelente Discriminação
                        </span>
                      </div>

                      {/* Vocal Test Results Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* OD Vocal */}
                        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Orelha Direita (OD)
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">Monossílabos</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-600">
                              <span>Limiar de Recepção de Fala (SRT):</span>
                              <span className="font-bold text-slate-900 font-mono">45 dB</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Índice Percentual (IPRF):</span>
                              <span className="font-bold text-emerald-600 font-mono">96% em 75dB</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Limiar de Desconforto (UCL):</span>
                              <span className="font-bold text-slate-700 font-mono">95 dB</span>
                            </div>
                          </div>
                        </div>

                        {/* OE Vocal */}
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Orelha Esquerda (OE)
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">Monossílabos</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-600">
                              <span>Limiar de Recepção de Fala (SRT):</span>
                              <span className="font-bold text-slate-900 font-mono">40 dB</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Índice Percentual (IPRF):</span>
                              <span className="font-bold text-emerald-600 font-mono">100% em 70dB</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Limiar de Desconforto (UCL):</span>
                              <span className="font-bold text-slate-700 font-mono">100 dB</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>Índice Vocal Compatível com o Grau de Perda Auditiva Tonal</span>
                        </span>
                        <button 
                          onClick={() => setIsPdfModalOpen(true)}
                          className="text-blue-600 font-semibold hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Ver Laudo em PDF →
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'comparativo' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 tracking-wide flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-600" /> Sobreposição de Exames Anteriores
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Comparando 2024 vs 2026</span>
                      </div>

                      {/* Comparative Curve Chart */}
                      <div className="h-48 sm:h-56 relative flex items-end justify-between px-2 pt-6 pb-2 border-l border-b border-slate-300 bg-white rounded-bl-lg">
                        {FREQUENCY_LINES.map((val) => (
                          <div
                            key={val}
                            className="absolute left-0 right-0 border-t border-slate-200 flex items-center justify-between text-[9px] font-mono text-slate-400"
                            style={{ top: `${(val / 100) * 100}%` }}
                          >
                            <span className="-mt-2.5 ml-1 font-semibold">{val}dB</span>
                          </div>
                        ))}

                        <svg className="absolute inset-0 w-full h-full p-6 overflow-visible pointer-events-none">
                          {/* 2024 Past baseline (Gray dashed) */}
                          <path
                            d="M 20 35 L 90 40 L 160 45 L 230 60 L 300 65 L 370 70 L 440 75"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="2.5"
                            strokeDasharray="6 4"
                          />
                          {/* 2026 Current exam (Red Solid) */}
                          <path
                            d="M 20 40 L 90 45 L 160 50 L 230 65 L 300 70 L 370 75 L 440 80"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3"
                          />
                        </svg>

                        {AUDIOGRAM_POINTS.map((item, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1 z-10">
                            <div className="w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow-xs"></div>
                            <span className="text-[10px] font-mono font-semibold text-slate-500 mt-2">{item.freq}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 font-semibold text-slate-500">
                            <span className="w-3 h-0.5 bg-slate-400"></span> 2024 (Exame Anterior)
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-rose-600 ml-2">
                            <span className="w-3 h-0.5 bg-rose-500"></span> 2026 (Exame Atual)
                          </span>
                        </div>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          Variação &lt; 5dB (Estável)
                        </span>
                      </div>
                    </div>
                  )}

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
                        <span className="text-slate-500">PDF Oficial</span>
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
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Comparativo 2024 vs 2026
                      </span>
                      <span className="text-emerald-600 font-mono font-bold">Curva Estável</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Imprimir ou Enviar Laudo</h4>
                      <p className="text-[11px] text-blue-700">Com timbre e carimbo do profissional</p>
                    </div>
                    <button
                      onClick={handleGeneratePdf}
                      disabled={isGenerating}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Gerando...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Gerar Laudo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>

      {/* PDF Clinical Report Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Visualização do Laudo Audiológico Oficial</h3>
              </div>
              <button 
                onClick={() => setIsPdfModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Body Preview */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-[#fafafa]">
              {/* Clinic Header */}
              <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">CLÍNICA DE FONOAUDIOLOGIA AUDIODASH</h4>
                  <p className="text-xs text-slate-500">Av. Paulista, 1000 • São Paulo/SP • Tel: (11) 99999-8888</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 block">Dra. Camila Rocha</span>
                  <span className="text-[11px] text-blue-600 font-medium">CRFa 4-18920</span>
                </div>
              </div>

              {/* Patient info */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Paciente</span>
                  <span className="font-bold text-slate-800">Ana Clara Mendes</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Idade</span>
                  <span className="font-bold text-slate-800">42 anos</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Data do Exame</span>
                  <span className="font-bold text-slate-800">03/08/2026</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Médico Solicitante</span>
                  <span className="font-bold text-slate-800">Dr. Roberto Silveira (CRM 10492)</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tipo do Exame</span>
                  <span className="font-bold text-slate-800">Audiometria Tonal e Vocal</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Equipamento</span>
                  <span className="font-bold text-slate-800">Interacoustics AC40 (Calibrado)</span>
                </div>
              </div>

              {/* Clinical Conclusion */}
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 text-xs space-y-2">
                <span className="font-bold text-blue-900 block">PARECER AUDIOLÓGICO & CONCLUSÃO:</span>
                <p className="text-slate-700 leading-relaxed">
                  Orelha Direita e Esquerda apresentam perda auditiva do tipo sensorioneural de grau leve a moderado em frequências agudas (3kHz - 8kHz). Discriminação da fala (IPRF) compatível em ambas as orelhas (OD 96% e OE 100%). Quadro auditivo estável em relação ao exame anterior de 2024.
                </p>
              </div>

              {/* Signature stamp */}
              <div className="pt-4 flex justify-end">
                <div className="text-center border-t border-slate-300 pt-2 px-8">
                  <span className="text-xs font-bold text-slate-800 block">Dra. Camila Rocha</span>
                  <span className="text-[10px] text-slate-500">Fonoaudióloga • CRFa 4-18920</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Pronto para arquivar no prontuário ou enviar por e-mail/WhatsApp.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Testar no Sistema Completo</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
