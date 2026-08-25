import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TympanometryData } from '@/db/db';
import TympanogramSVG from '@/components/TympanogramSVG';
import {
  classifyTympanometry,
  JergerClassification
} from '@/lib/audiologyCalculations';
import {
  Activity,
  Sparkles
} from 'lucide-react';

interface Props {
  tympanometry: {
    right: TympanometryData;
    left: TympanometryData;
  };
  onChange: (data: { right: TympanometryData; left: TympanometryData }) => void;
}

export default function TympanometryExam({ tympanometry, onChange }: Props) {
  type TympTool = 'OD' | 'OE' | null;
  const [activeTool, setActiveTool] = useState<TympTool>('OD');

  const rightJerger = useMemo(() => {
    return classifyTympanometry(tympanometry.right);
  }, [tympanometry.right]);

  const leftJerger = useMemo(() => {
    return classifyTympanometry(tympanometry.left);
  }, [tympanometry.left]);

  const updateEar = (ear: 'right' | 'left', field: keyof TympanometryData, val: string) => {
    onChange({
      ...tympanometry,
      [ear]: {
        ...(tympanometry[ear] || {}),
        [field]: val
      }
    });
  };

  const handleTympanogramClick = (pressure: number, compliance: number) => {
    if (!activeTool) return;
    const ear = activeTool === 'OD' ? 'right' : 'left';
    onChange({
      ...tympanometry,
      [ear]: {
        ...(tympanometry[ear] || {}),
        peak: pressure.toString(),
        compliance200: compliance.toFixed(2),
        volume: tympanometry[ear]?.volume || '1.10'
      }
    });
  };

  const clearEar = (ear: 'right' | 'left') => {
    onChange({
      ...tympanometry,
      [ear]: {
        peak: '',
        compliance200: '',
        volume: ''
      }
    });
  };

  const applyPreset = (ear: 'right' | 'left', preset: 'A' | 'As' | 'Ad' | 'B_efusao' | 'B_perfuracao' | 'C') => {
    let peak = '0';
    let compliance = '0.80';
    let volume = '1.10';

    if (preset === 'A') {
      peak = '0';
      compliance = '0.85';
      volume = '1.10';
    } else if (preset === 'As') {
      peak = '-10';
      compliance = '0.18';
      volume = '1.05';
    } else if (preset === 'Ad') {
      peak = '+10';
      compliance = '2.20';
      volume = '1.20';
    } else if (preset === 'B_efusao') {
      peak = '';
      compliance = '0.08';
      volume = '0.95';
    } else if (preset === 'B_perfuracao') {
      peak = '';
      compliance = '0.05';
      volume = '3.40';
    } else if (preset === 'C') {
      peak = '-210';
      compliance = '0.65';
      volume = '1.15';
    }

    onChange({
      ...tympanometry,
      [ear]: {
        peak,
        compliance200: compliance,
        volume
      }
    });
  };

  const getJergerBadge = (classification: JergerClassification) => {
    if (classification.type === 'Inconclusivo') {
      return (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          Aguardando dados
        </span>
      );
    }
    const colorMap: Record<string, string> = {
      'A': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'As': 'bg-amber-100 text-amber-800 border-amber-300',
      'Ad': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'B': 'bg-red-100 text-red-800 border-red-300',
      'C': 'bg-purple-100 text-purple-800 border-purple-300'
    };

    return (
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${colorMap[classification.type] || 'bg-slate-100 text-slate-700'}`}>
        {classification.description}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Resumo Diagnóstico Jerger em Tempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OD Box */}
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              OD: Curva Timpanométrica (Jerger, 1970)
            </span>
            {getJergerBadge(rightJerger)}
          </div>
          <p className="text-xs text-slate-700 font-medium">{rightJerger.interpretation}</p>
        </div>

        {/* OE Box */}
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              OE: Curva Timpanométrica (Jerger, 1970)
            </span>
            {getJergerBadge(leftJerger)}
          </div>
          <p className="text-xs text-slate-700 font-medium">{leftJerger.interpretation}</p>
        </div>
      </div>

      {/* Grid: Controles de Medidas + Gráfico SVG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Medidas Físicas */}
        <Card className="lg:col-span-6 border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Parâmetros de Imitância Acústica
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registre a pressão de pico (daPa), admitância/complacência estática (ml) e volume equivalente (Vea).
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-6">
            {/* Orelha Direita */}
            <div className="p-3.5 rounded-xl border border-red-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-600">Orelha Direita (OD)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyPreset('right', 'A')}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 hover:bg-emerald-100"
                  >
                    Tipo A
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('right', 'As')}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200 hover:bg-amber-100"
                  >
                    Tipo As
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('right', 'B_efusao')}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100"
                  >
                    Tipo B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('right', 'C')}
                    className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200 hover:bg-purple-100"
                  >
                    Tipo C
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-0.5">Pressão do Pico</label>
                  <Input
                    className="h-8 text-xs font-bold text-red-700 bg-slate-50/50"
                    placeholder="Ex: 0 daPa"
                    value={tympanometry.right?.peak || ''}
                    onChange={e => updateEar('right', 'peak', e.target.value)}
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Normal: -100 a +100</span>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-0.5">Complacência (ml)</label>
                  <Input
                    className="h-8 text-xs font-bold text-red-700 bg-slate-50/50"
                    placeholder="Ex: 0.85 ml"
                    value={tympanometry.right?.compliance200 || ''}
                    onChange={e => updateEar('right', 'compliance200', e.target.value)}
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Normal: 0.3 a 1.75 ml</span>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-0.5">Volume (Vea ml)</label>
                  <Input
                    className="h-8 text-xs bg-slate-50/50"
                    placeholder="Ex: 1.10 ml"
                    value={tympanometry.right?.volume || ''}
                    onChange={e => updateEar('right', 'volume', e.target.value)}
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Normal: 0.65 a 1.75 ml</span>
                </div>
              </div>
            </div>

            {/* Orelha Esquerda */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600">Orelha Esquerda (OE)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => applyPreset('left', 'A')}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 hover:bg-emerald-100"
                  >
                    Tipo A
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('left', 'As')}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200 hover:bg-amber-100"
                  >
                    Tipo As
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('left', 'B_efusao')}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100"
                  >
                    Tipo B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('left', 'C')}
                    className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200 hover:bg-purple-100"
                  >
                    Tipo C
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-0.5">Pressão do Pico</label>
                  <Input
                    className="h-8 text-xs font-bold text-blue-700 bg-slate-50/50"
                    placeholder="Ex: 0 daPa"
                    value={tympanometry.left?.peak || ''}
                    onChange={e => updateEar('left', 'peak', e.target.value)}
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Normal: -100 a +100</span>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-0.5">Complacência (ml)</label>
                  <Input
                    className="h-8 text-xs font-bold text-blue-700 bg-slate-50/50"
                    placeholder="Ex: 0.85 ml"
                    value={tympanometry.left?.compliance200 || ''}
                    onChange={e => updateEar('left', 'compliance200', e.target.value)}
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Normal: 0.3 a 1.75 ml</span>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 block mb-0.5">Volume (Vea ml)</label>
                  <Input
                    className="h-8 text-xs bg-slate-50/50"
                    placeholder="Ex: 1.10 ml"
                    value={tympanometry.left?.volume || ''}
                    onChange={e => updateEar('left', 'volume', e.target.value)}
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Normal: 0.65 a 1.75 ml</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Curva Timpanométrica Dinâmica SVG */}
        <Card className="lg:col-span-6 border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Gráfico do Timpanograma
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTool('OD')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTool === 'OD'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                Desenhar OD
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('OE')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTool === 'OE'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                Desenhar OE
              </button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col items-center justify-center p-3 bg-white">
            <div className="w-full max-w-[450px]">
              <TympanogramSVG
                rightData={tympanometry.right}
                leftData={tympanometry.left}
                onPointClick={handleTympanogramClick}
              />
            </div>
            <div className="flex items-center justify-between w-full text-[11px] text-slate-500 pt-2 px-2 border-t border-slate-100">
              <span>* A área sombreada central representa a faixa de normalidade de Jerger (Tipo A).</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => clearEar('right')} className="text-red-500 hover:underline">Limpar OD</button>
                <span>|</span>
                <button type="button" onClick={() => clearEar('left')} className="text-blue-500 hover:underline">Limpar OE</button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
