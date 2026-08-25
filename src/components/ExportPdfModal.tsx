import { useState } from 'react';
import { Audiometry, Patient } from '@/db/db';
import { exportToPdf, PdfExportOptions } from '@/lib/exportPdf';
import { Button } from '@/components/ui/button';
import {
  FileText,
  X,
  Sparkles,
  Download
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exam: Audiometry;
  patient: Patient;
}

export default function ExportPdfModal({ isOpen, onClose, exam, patient }: Props) {
  if (!isOpen) return null;

  // Auto-detecção de exames preenchidos
  const hasMeatoscopy = !!(exam.meatoscopy?.right || exam.meatoscopy?.left);
  const hasTonal = !!(exam.tonalData?.right?.['1000']?.va !== undefined || exam.tonalData?.left?.['1000']?.va !== undefined);
  const hasLogo = !!(exam.logoAudiometry?.right?.srt?.db || exam.logoAudiometry?.left?.srt?.db || exam.logoAudiometry?.right?.irf?.mono?.percentage);
  const hasImmitance = !!(exam.tympanometry?.right?.peak || exam.tympanometry?.left?.peak || exam.reflexes?.right?.['1000']?.ipsi || exam.reflexes?.sondaOD);
  const hasComplementary = !!(exam.complementary?.weber || exam.complementary?.eoa?.right || exam.complementary?.bera?.right);

  const [options, setOptions] = useState<PdfExportOptions>({
    includeMeatoscopy: hasMeatoscopy,
    includeTonalChart: hasTonal || true,
    includeTonalTable: hasTonal || true,
    includePTA: true,
    includeLogo: hasLogo,
    includeImmitance: hasImmitance,
    includeComplementary: hasComplementary,
    includeOpinion: true
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const toggleOption = (key: keyof PdfExportOptions) => {
    setOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const applyPreset = (preset: 'auto' | 'all' | 'ocupacional' | 'tonal') => {
    if (preset === 'auto') {
      setOptions({
        includeMeatoscopy: hasMeatoscopy,
        includeTonalChart: true,
        includeTonalTable: true,
        includePTA: true,
        includeLogo: hasLogo,
        includeImmitance: hasImmitance,
        includeComplementary: hasComplementary,
        includeOpinion: true
      });
    } else if (preset === 'all') {
      setOptions({
        includeMeatoscopy: true,
        includeTonalChart: true,
        includeTonalTable: true,
        includePTA: true,
        includeLogo: true,
        includeImmitance: true,
        includeComplementary: true,
        includeOpinion: true
      });
    } else if (preset === 'ocupacional') {
      setOptions({
        includeMeatoscopy: hasMeatoscopy,
        includeTonalChart: true,
        includeTonalTable: true,
        includePTA: true,
        includeLogo: false,
        includeImmitance: false,
        includeComplementary: false,
        includeOpinion: true
      });
    } else if (preset === 'tonal') {
      setOptions({
        includeMeatoscopy: false,
        includeTonalChart: true,
        includeTonalTable: true,
        includePTA: true,
        includeLogo: false,
        includeImmitance: false,
        includeComplementary: false,
        includeOpinion: true
      });
    }
  };

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      await exportToPdf(exam, patient, options);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Opções de Exportação do PDF</h3>
              <p className="text-xs text-slate-500">
                Selecione os exames e seções que deseja incluir no laudo oficial.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Presets Rápidos */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Modelos Rápidos (Presets)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('auto')}
                className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 font-semibold text-center transition-all flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto (Realizados)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-center transition-all"
              >
                Todos os Exames
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ocupacional')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-center transition-all"
              >
                NR-7 Ocupacional
              </button>
              <button
                type="button"
                onClick={() => applyPreset('tonal')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-center transition-all"
              >
                Apenas Tonal
              </button>
            </div>
          </div>

          {/* Lista de Checkboxes de Exames */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Seções do Laudo
            </label>

            {/* Meatoscopia */}
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!!options.includeMeatoscopy}
                  onChange={() => toggleOption('includeMeatoscopy')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">1. Meatoscopia (Otoscopia)</span>
                  <span className="text-[10px] text-slate-500">Inspeção do meato e membrana timpânica</span>
                </div>
              </div>
              {hasMeatoscopy && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-100">
                  Preenchido
                </span>
              )}
            </label>

            {/* Audiometria Tonal (Gráfico) */}
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!!options.includeTonalChart}
                  onChange={() => toggleOption('includeTonalChart')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">2. Gráfico do Audiograma</span>
                  <span className="text-[10px] text-slate-500">Curvas visuais de VA, VO e Campo Livre</span>
                </div>
              </div>
              {hasTonal && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-100">
                  Preenchido
                </span>
              )}
            </label>

            {/* Tabela de Limiares e Médias */}
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!!options.includeTonalTable}
                  onChange={() => toggleOption('includeTonalTable')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">3. Tabela de Limiares &amp; Médias (PTA)</span>
                  <span className="text-[10px] text-slate-500">Valores em dB NA e Médias Tritonal/Quadritonal</span>
                </div>
              </div>
            </label>

            {/* Logoaudiometria */}
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!!options.includeLogo}
                  onChange={() => toggleOption('includeLogo')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">4. Logoaudiometria</span>
                  <span className="text-[10px] text-slate-500">LRF / SRT, LDV e IPRF (%)</span>
                </div>
              </div>
              {hasLogo && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-100">
                  Preenchido
                </span>
              )}
            </label>

            {/* Imitanciometria */}
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!!options.includeImmitance}
                  onChange={() => toggleOption('includeImmitance')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">5. Imitanciometria (Timpanometria &amp; Reflexos)</span>
                  <span className="text-[10px] text-slate-500">Curva Jerger, Pressão, Volume e Reflexos Estapedianos</span>
                </div>
              </div>
              {hasImmitance && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-100">
                  Preenchido
                </span>
              )}
            </label>

            {/* Testes Complementares */}
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!!options.includeComplementary}
                  onChange={() => toggleOption('includeComplementary')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">6. Testes Especiais / Complementares</span>
                  <span className="text-[10px] text-slate-500">Weber, Tone Decay, EOA e PEATE</span>
                </div>
              </div>
              {hasComplementary && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-100">
                  Preenchido
                </span>
              )}
            </label>

            {/* Parecer & Conduta */}
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!!options.includeOpinion}
                  onChange={() => toggleOption('includeOpinion')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">7. Parecer Fonoaudiológico &amp; Conduta</span>
                  <span className="text-[10px] text-slate-500">Conclusão diagnóstica, conduta e assinatura</span>
                </div>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                Recomendado
              </span>
            </label>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 rounded-xl border-slate-200 text-slate-600"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleExport}
            disabled={isGenerating}
            className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-sm"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Baixar PDF Oficial
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
