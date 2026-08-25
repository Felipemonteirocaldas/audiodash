import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EarReflexData, ReflexFrequency, EarTonalData } from '@/db/db';
import {
  analyzeStapedialReflexes,
  getNumericThreshold
} from '@/lib/audiologyCalculations';
import {
  Zap
} from 'lucide-react';

const REFLEX_FREQS: ReflexFrequency[] = ['500', '1000', '2000', '4000'];

interface Props {
  reflexes: {
    right: Partial<EarReflexData>;
    left: Partial<EarReflexData>;
    sondaOD?: string;
    sondaOE?: string;
  };
  tonalData?: {
    right: Partial<EarTonalData>;
    left: Partial<EarTonalData>;
  };
  onChange: (data: {
    right: Partial<EarReflexData>;
    left: Partial<EarReflexData>;
    sondaOD?: string;
    sondaOE?: string;
  }) => void;
}

export default function StapedialReflexExam({ reflexes, tonalData, onChange }: Props) {
  // Análise automática de Metz (Recrutamento Coclear)
  const rightMetz = useMemo(() => {
    return analyzeStapedialReflexes(reflexes.right, tonalData?.right, 'right');
  }, [reflexes.right, tonalData?.right]);

  const leftMetz = useMemo(() => {
    return analyzeStapedialReflexes(reflexes.left, tonalData?.left, 'left');
  }, [reflexes.left, tonalData?.left]);

  const hasRightRecruitment = rightMetz.some(m => m.hasRecruitment);
  const hasLeftRecruitment = leftMetz.some(m => m.hasRecruitment);

  const updateReflex = (
    ear: 'right' | 'left',
    freq: ReflexFrequency,
    field: 'limiar' | 'contra' | 'dif' | 'ipsi' | 'decay',
    value: string
  ) => {
    // Se o usuário digitou o reflexo ipsi ou contra, calculamos a diferença com a VA se existir
    const currentPoint = reflexes[ear]?.[freq] || {};
    let calculatedDif = currentPoint.dif;

    if (field === 'ipsi' || field === 'limiar') {
      const reflexVal = getNumericThreshold(value);
      const tonalVA = getNumericThreshold(tonalData?.[ear]?.[freq]?.va);
      if (reflexVal !== null && tonalVA !== null) {
        calculatedDif = (reflexVal - tonalVA).toString();
      }
    }

    onChange({
      ...reflexes,
      [ear]: {
        ...reflexes[ear],
        [freq]: {
          ...currentPoint,
          [field]: value,
          dif: calculatedDif
        }
      }
    });
  };

  const updateSonda = (ear: 'sondaOD' | 'sondaOE', val: string) => {
    onChange({
      ...reflexes,
      [ear]: val
    });
  };

  const applyPreset = (type: 'normal' | 'ausente') => {
    if (type === 'normal') {
      const normalVals: Partial<EarReflexData> = {
        '500': { limiar: '85', ipsi: '85', contra: '90', dif: '75', decay: 'Negativo' },
        '1000': { limiar: '85', ipsi: '85', contra: '90', dif: '75', decay: 'Negativo' },
        '2000': { limiar: '90', ipsi: '90', contra: '95', dif: '80', decay: 'Negativo' },
        '4000': { limiar: '90', ipsi: '90', contra: '95', dif: '80', decay: 'Negativo' }
      };
      onChange({
        right: { ...normalVals },
        left: { ...normalVals },
        sondaOD: 'Presentes em todos os modos testados',
        sondaOE: 'Presentes em todos os modos testados'
      });
    } else if (type === 'ausente') {
      const ausenteVals: Partial<EarReflexData> = {
        '500': { limiar: 'Ausente', ipsi: 'Ausente', contra: 'Ausente', dif: '--', decay: '--' },
        '1000': { limiar: 'Ausente', ipsi: 'Ausente', contra: 'Ausente', dif: '--', decay: '--' },
        '2000': { limiar: 'Ausente', ipsi: 'Ausente', contra: 'Ausente', dif: '--', decay: '--' },
        '4000': { limiar: 'Ausente', ipsi: 'Ausente', contra: 'Ausente', dif: '--', decay: '--' }
      };
      onChange({
        right: { ...ausenteVals },
        left: { ...ausenteVals },
        sondaOD: 'Ausentes nas intensidades máximas',
        sondaOE: 'Ausentes nas intensidades máximas'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas Diagnósticos e Teste de Metz */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OD Box */}
        <div className={`p-3.5 rounded-xl border space-y-1.5 ${
          hasRightRecruitment ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-red-50/30 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              OD: Topodiagnóstico / Teste de Metz
            </span>
            {hasRightRecruitment ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                Metz Positivo (Recrutamento Coclear)
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Padrão Fisiológico
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600">
            {hasRightRecruitment
              ? 'Diferença entre o reflexo e o limiar tonal ≤ 60 dB em OD. Indica fenômeno de recrutamento objetivo de Metz (origem coclear / CCE).'
              : 'Nível de sensação do reflexo dentro dos limites habituais (70 a 100 dB SL).'}
          </p>
        </div>

        {/* OE Box */}
        <div className={`p-3.5 rounded-xl border space-y-1.5 ${
          hasLeftRecruitment ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-blue-50/30 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              OE: Topodiagnóstico / Teste de Metz
            </span>
            {hasLeftRecruitment ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                Metz Positivo (Recrutamento Coclear)
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Padrão Fisiológico
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600">
            {hasLeftRecruitment
              ? 'Diferença entre o reflexo e o limiar tonal ≤ 60 dB em OE. Indica fenômeno de recrutamento objetivo de Metz (origem coclear / CCE).'
              : 'Nível de sensação do reflexo dentro dos limites habituais (70 a 100 dB SL).'}
          </p>
        </div>
      </div>

      {/* Matriz de Reflexos Estapedianos */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              Pesquisa do Reflexo Acústico Estapediano
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registro dos limiares de reflexo ipsilaterais, contralaterais, nível de sensação (DIF) e deterioração do reflexo (Decay a 500 e 1000 Hz).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset('normal')}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Preset Normal
            </button>
            <button
              type="button"
              onClick={() => applyPreset('ausente')}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
            >
              Ausentes
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200">
                <th className="p-2.5 font-bold border-r border-slate-200 text-slate-700" rowSpan={2}>
                  Hz
                </th>
                <th className="p-2 text-center text-red-600 font-bold border-r border-slate-200" colSpan={4}>
                  Orelha Direita (OD)
                </th>
                <th className="p-2 text-center text-blue-600 font-bold" colSpan={4}>
                  Orelha Esquerda (OE)
                </th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
                <th className="p-1.5 text-center font-bold" title="Reflexo Ipsilateral">Ipsilateral</th>
                <th className="p-1.5 text-center font-bold" title="Reflexo Contralateral">Contralateral</th>
                <th className="p-1.5 text-center" title="Nível de Sensação / Dif Reflexo - Limiar VA">Sensação (Dif)</th>
                <th className="p-1.5 text-center border-r border-slate-200" title="Deterioração do Reflexo / Decay">Decay</th>

                <th className="p-1.5 text-center font-bold" title="Reflexo Ipsilateral">Ipsilateral</th>
                <th className="p-1.5 text-center font-bold" title="Reflexo Contralateral">Contralateral</th>
                <th className="p-1.5 text-center" title="Nível de Sensação / Dif Reflexo - Limiar VA">Sensação (Dif)</th>
                <th className="p-1.5 text-center" title="Deterioração do Reflexo / Decay">Decay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {REFLEX_FREQS.map(freq => {
                const rPoint = reflexes.right?.[freq] || {};
                const lPoint = reflexes.left?.[freq] || {};

                return (
                  <tr key={freq} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                      {freq} Hz
                    </td>

                    {/* OD */}
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-16 h-8 text-xs text-center font-bold text-red-700 bg-white"
                        placeholder="dB"
                        value={rPoint.ipsi !== undefined ? rPoint.ipsi : (rPoint.limiar || '')}
                        onChange={e => updateReflex('right', freq, 'ipsi', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-16 h-8 text-xs text-center text-red-700 bg-white"
                        placeholder="dB"
                        value={rPoint.contra || ''}
                        onChange={e => updateReflex('right', freq, 'contra', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-14 h-8 text-xs text-center bg-slate-50 text-slate-600 font-semibold"
                        placeholder="SL dB"
                        value={rPoint.dif || ''}
                        onChange={e => updateReflex('right', freq, 'dif', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center border-r border-slate-200">
                      <Input
                        className="w-20 h-8 text-xs text-center bg-white"
                        placeholder="Negativo"
                        value={rPoint.decay || ''}
                        onChange={e => updateReflex('right', freq, 'decay', e.target.value)}
                      />
                    </td>

                    {/* OE */}
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-16 h-8 text-xs text-center font-bold text-blue-700 bg-white"
                        placeholder="dB"
                        value={lPoint.ipsi !== undefined ? lPoint.ipsi : (lPoint.limiar || '')}
                        onChange={e => updateReflex('left', freq, 'ipsi', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-16 h-8 text-xs text-center text-blue-700 bg-white"
                        placeholder="dB"
                        value={lPoint.contra || ''}
                        onChange={e => updateReflex('left', freq, 'contra', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-14 h-8 text-xs text-center bg-slate-50 text-slate-600 font-semibold"
                        placeholder="SL dB"
                        value={lPoint.dif || ''}
                        onChange={e => updateReflex('left', freq, 'dif', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-20 h-8 text-xs text-center bg-white"
                        placeholder="Negativo"
                        value={lPoint.decay || ''}
                        onChange={e => updateReflex('left', freq, 'decay', e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/80 border-t border-slate-200">
                <td colSpan={5} className="p-3 border-r border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-700 shrink-0">Sonda no Direito:</span>
                    <Input
                      className="h-8 text-xs bg-white flex-1"
                      placeholder="Ex: Presentes ipsi e contra em níveis normais"
                      value={reflexes.sondaOD || ''}
                      onChange={e => updateSonda('sondaOD', e.target.value)}
                    />
                  </div>
                </td>
                <td colSpan={4} className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-700 shrink-0">Sonda no Esquerdo:</span>
                    <Input
                      className="h-8 text-xs bg-white flex-1"
                      placeholder="Ex: Presentes ipsi e contra em níveis normais"
                      value={reflexes.sondaOE || ''}
                      onChange={e => updateSonda('sondaOE', e.target.value)}
                    />
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
