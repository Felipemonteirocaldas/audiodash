import ClinicalEvidence from './ClinicalEvidence';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EarReflexData, ReflexFrequency, EarTonalData } from '@/db/db';
import {
  analyzeStapedialReflexes,
  getNumericThreshold
} from '@/lib/audiologyCalculations';
const REFLEX_FREQS: ReflexFrequency[] = ['500', '1000', '2000', '4000'];

interface Props {
  reflexes: {
    right: Partial<EarReflexData>;
    left: Partial<EarReflexData>;
    sondaOD?: string;
    sondaOE?: string;
    earConvention?: '' | 'stimulated' | 'probe';
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
    earConvention?: '' | 'stimulated' | 'probe';
  }) => void;
}

export default function StapedialReflexExam({ reflexes, tonalData, onChange }: Props) {
  // Diferenças calculadas a partir dos resultados registrados.
  const rightAnalysis = useMemo(() => {
    return analyzeStapedialReflexes(reflexes.right, tonalData?.right, 'right', { convention: reflexes.earConvention, otherEarTonal: tonalData?.left });
  }, [reflexes.right, reflexes.earConvention, tonalData?.right, tonalData?.left]);

  const leftAnalysis = useMemo(() => {
    return analyzeStapedialReflexes(reflexes.left, tonalData?.left, 'left', { convention: reflexes.earConvention, otherEarTonal: tonalData?.right });
  }, [reflexes.left, reflexes.earConvention, tonalData?.left, tonalData?.right]);

  const updateReflex = (
    ear: 'right' | 'left',
    freq: ReflexFrequency,
    field: 'limiar' | 'contra' | 'dif' | 'ipsi' | 'decay',
    value: string
  ) => {
    // Se o usuário digitou o reflexo ipsi ou contra, calculamos a diferença com a VA se existir
    const currentPoint = reflexes[ear]?.[freq] || {};
    let calculatedDif = currentPoint.dif;
    if (field === 'ipsi' || field === 'limiar') calculatedDif = '';

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

  return (
    <div className="space-y-6">
      <ClinicalEvidence sources={['SBFA_IMIT_2025', 'BSA_TYMP_2026', 'AAA_2020']} />
      <p className="text-sm text-slate-600">A coluna "Ipsi − VA" é a diferença entre o reflexo ipsilateral e o limiar de via aérea da mesma orelha. O critério numérico de Metz (SBFa, 2025) usa o reflexo contralateral e a VA da orelha estimulada; por isso, registre o que as colunas representam. A interpretação clínica deve ser documentada pelo profissional.</p>
      <label className="block text-xs font-semibold max-w-xl">As colunas OD/OE dos reflexos contralaterais indicam<select aria-label="Convenção das colunas de reflexo" className="block mt-1 border rounded-lg p-2 w-full bg-white font-normal" value={reflexes.earConvention || ''} onChange={e => onChange({ ...reflexes, earConvention: e.target.value as '' | 'stimulated' | 'probe' })}><option value="">Não informado — Metz não calculado</option><option value="stimulated">Orelha estimulada (estímulo na orelha da coluna)</option><option value="probe">Orelha da sonda (estímulo na orelha oposta)</option></select></label>

      {/* Matriz de Reflexos Estapedianos */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              Pesquisa do Reflexo Acústico Estapediano
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registro dos limiares de reflexo ipsilaterais e contralaterais (dB NA), diferença ipsi − VA e resultado do decay informado pelo profissional.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
                <th className="p-1.5 text-center" title="Diferença reflexo ipsilateral − limiar de VA da mesma orelha">Ipsi − VA</th>
                <th className="p-1.5 text-center border-r border-slate-200" title="Deterioração do Reflexo / Decay">Decay</th>

                <th className="p-1.5 text-center font-bold" title="Reflexo Ipsilateral">Ipsilateral</th>
                <th className="p-1.5 text-center font-bold" title="Reflexo Contralateral">Contralateral</th>
                <th className="p-1.5 text-center" title="Diferença reflexo ipsilateral − limiar de VA da mesma orelha">Ipsi − VA</th>
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
                        value={rPoint.ipsi !== undefined ? rPoint.ipsi : (rPoint.limiar ?? '')}
                        onChange={e => updateReflex('right', freq, 'ipsi', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-16 h-8 text-xs text-center text-red-700 bg-white"
                        placeholder="dB"
                        value={rPoint.contra ?? ''}
                        onChange={e => updateReflex('right', freq, 'contra', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-14 h-8 text-xs text-center bg-slate-50 text-slate-600 font-semibold"
                        placeholder="SL dB"
                        value={rightAnalysis.find(m => m.freq === freq)?.sensationLevel ?? ''}
                        readOnly
                      />
                    </td>
                    <td className="p-1.5 text-center border-r border-slate-200">
                      <Input
                        className="w-20 h-8 text-xs text-center bg-white"
                        placeholder="Resultado"
                        value={rPoint.decay ?? ''}
                        onChange={e => updateReflex('right', freq, 'decay', e.target.value)}
                      />
                    </td>

                    {/* OE */}
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-16 h-8 text-xs text-center font-bold text-blue-700 bg-white"
                        placeholder="dB"
                        value={lPoint.ipsi !== undefined ? lPoint.ipsi : (lPoint.limiar ?? '')}
                        onChange={e => updateReflex('left', freq, 'ipsi', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-16 h-8 text-xs text-center text-blue-700 bg-white"
                        placeholder="dB"
                        value={lPoint.contra ?? ''}
                        onChange={e => updateReflex('left', freq, 'contra', e.target.value)}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-14 h-8 text-xs text-center bg-slate-50 text-slate-600 font-semibold"
                        placeholder="SL dB"
                        value={leftAnalysis.find(m => m.freq === freq)?.sensationLevel ?? ''}
                        readOnly
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <Input
                        className="w-20 h-8 text-xs text-center bg-white"
                        placeholder="Resultado"
                        value={lPoint.decay ?? ''}
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
                    <span className="text-xs font-semibold text-red-700 shrink-0">Observações OD:</span>
                    <Input
                      className="h-8 text-xs bg-white flex-1"
                      placeholder="Condições de pesquisa e observações"
                      value={reflexes.sondaOD ?? ''}
                      onChange={e => updateSonda('sondaOD', e.target.value)}
                    />
                  </div>
                </td>
                <td colSpan={4} className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-700 shrink-0">Observações OE:</span>
                    <Input
                      className="h-8 text-xs bg-white flex-1"
                      placeholder="Condições de pesquisa e observações"
                      value={reflexes.sondaOE ?? ''}
                      onChange={e => updateSonda('sondaOE', e.target.value)}
                    />
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
          {[...rightAnalysis, ...leftAnalysis].length > 0 && <ul className="p-4 space-y-1 text-xs text-slate-700 border-t">{[...rightAnalysis, ...leftAnalysis].map(result => <li key={`${result.ear}-${result.freq}`}><strong>{result.ear === 'right' ? 'OD' : 'OE'} · {result.freq} Hz:</strong> {result.interpretation}</li>)}</ul>}
        </CardContent>
      </Card>
    </div>
  );
}
