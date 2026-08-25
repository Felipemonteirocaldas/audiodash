import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EarTonalData, TonalFrequency, MaskingData } from '@/db/db';
import AudiogramSVG from '@/components/AudiogramSVG';
import {
  calculatePTA,
  classifyDegree,
  classifyType,
  classifyConfiguration,
  checkMaskingNecessity,
  isSuggestivePAIR,
  DegreeStandard
} from '@/lib/audiologyCalculations';
import {
  Activity,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Volume2
} from 'lucide-react';

const FREQUENCIES: TonalFrequency[] = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
const VO_FREQUENCIES: TonalFrequency[] = ['250', '500', '1000', '2000', '3000', '4000'];

interface Props {
  tonalData: {
    right: Partial<EarTonalData>;
    left: Partial<EarTonalData>;
  };
  tonalMasking?: {
    right: MaskingData;
    left: MaskingData;
  };
  freeField?: Partial<EarTonalData>;
  onChangeTonal: (data: { right: Partial<EarTonalData>; left: Partial<EarTonalData> }) => void;
  onChangeMasking: (data: { right: MaskingData; left: MaskingData }) => void;
  onChangeFreeField: (data: Partial<EarTonalData>) => void;
  category?: 'clinico' | 'ocupacional';
  standard?: DegreeStandard;
}

export default function TonalAudiometryExam({
  tonalData,
  tonalMasking,
  freeField,
  onChangeTonal,
  onChangeMasking,
  onChangeFreeField,
  category = 'clinico',
  standard = 'OMS_2021'
}: Props) {
  type DrawingTool = 'OD_VA' | 'OD_VO' | 'OE_VA' | 'OE_VO' | 'FREE_FIELD' | null;
  const [activeTool, setActiveTool] = useState<DrawingTool>('OD_VA');
  const [isMasked, setIsMasked] = useState(false);
  const [isNR, setIsNR] = useState(false);
  const [transducer, setTransducer] = useState<'supra' | 'insert'>('supra');
  const [showMaskingAdvisor, setShowMaskingAdvisor] = useState(false);
  const [mobileEarView, setMobileEarView] = useState<'all' | 'right' | 'left'>('all');
  const [quickFreq, setQuickFreq] = useState<TonalFrequency>('1000');

  // Cálculos Audiológicos em tempo real
  const rightPTA = useMemo(() => calculatePTA(tonalData.right), [tonalData.right]);
  const leftPTA = useMemo(() => calculatePTA(tonalData.left), [tonalData.left]);

  const rightDegree = useMemo(() => classifyDegree(rightPTA, standard), [rightPTA, standard]);
  const leftDegree = useMemo(() => classifyDegree(leftPTA, standard), [leftPTA, standard]);

  const rightType = useMemo(() => classifyType(tonalData.right), [tonalData.right]);
  const leftType = useMemo(() => classifyType(tonalData.left), [tonalData.left]);

  const rightConfig = useMemo(() => classifyConfiguration(tonalData.right), [tonalData.right]);
  const leftConfig = useMemo(() => classifyConfiguration(tonalData.left), [tonalData.left]);

  const maskingAlerts = useMemo(() => {
    return checkMaskingNecessity(tonalData.right, tonalData.left, transducer);
  }, [tonalData.right, tonalData.left, transducer]);

  const pairAnalysis = useMemo(() => {
    return isSuggestivePAIR(tonalData.right, tonalData.left);
  }, [tonalData.right, tonalData.left]);

  // Manipuladores de alteração de limiar
  const handleThresholdChange = (
    ear: 'right' | 'left',
    freq: TonalFrequency,
    field: 'va' | 'vo',
    value: string
  ) => {
    const raw = value.trim().toUpperCase();
    let finalVal: number | 'NR' | undefined = undefined;
    if (raw === 'NR' || raw === 'SR' || raw === 'X') {
      finalVal = 'NR';
    } else if (raw !== '') {
      const parsed = parseInt(raw, 10);
      finalVal = isNaN(parsed) ? undefined : parsed;
    }

    const updatedEarData = {
      ...tonalData[ear],
      [freq]: {
        ...(tonalData[ear]?.[freq] || {}),
        [field]: finalVal
      }
    };

    onChangeTonal({
      ...tonalData,
      [ear]: updatedEarData
    });
  };

  const handleMaskingCheckbox = (
    ear: 'right' | 'left',
    freq: TonalFrequency,
    field: 'maskedVa' | 'maskedVo',
    checked: boolean
  ) => {
    const updatedEarData = {
      ...tonalData[ear],
      [freq]: {
        ...(tonalData[ear]?.[freq] || {}),
        [field]: checked
      }
    };

    onChangeTonal({
      ...tonalData,
      [ear]: updatedEarData
    });
  };

  // Clique no Audiograma Gráfico Interativo
  const handleAudiogramClick = (freq: string, dbVal: number) => {
    if (!activeTool) return;

    if (activeTool === 'FREE_FIELD') {
      const currentPoint = freeField?.[freq as TonalFrequency];
      let valToSet: string | number | undefined = isNR ? 'NR' : dbVal;
      if (currentPoint && currentPoint.va === valToSet) {
        valToSet = undefined;
      }
      onChangeFreeField({
        ...(freeField || {}),
        [freq]: {
          ...(freeField?.[freq as TonalFrequency] || {}),
          va: valToSet === 'NR' ? 'NR' : (valToSet === undefined ? undefined : parseInt(valToSet.toString(), 10))
        }
      });
      return;
    }

    const isRight = activeTool.startsWith('OD');
    const isVA = activeTool.endsWith('VA');
    const ear = isRight ? 'right' : 'left';

    const currentPoint = tonalData[ear]?.[freq as TonalFrequency];
    let valToSet: string | number | undefined = isNR ? 'NR' : dbVal;
    let maskedToSet = isMasked;

    if (currentPoint) {
      const fieldToCheck = isVA ? currentPoint.va : currentPoint.vo;
      const maskField = isVA ? currentPoint.maskedVa : currentPoint.maskedVo;
      if (fieldToCheck === valToSet && maskField === maskedToSet) {
        valToSet = undefined;
        maskedToSet = false;
      }
    }

    const finalVal = valToSet === 'NR' ? 'NR' : (valToSet === undefined ? undefined : parseInt(valToSet.toString(), 10));

    const updatedEarData = {
      ...tonalData[ear],
      [freq]: {
        ...(tonalData[ear]?.[freq as TonalFrequency] || {}),
        [isVA ? 'va' : 'vo']: finalVal,
        [isVA ? 'maskedVa' : 'maskedVo']: maskedToSet
      }
    };

    onChangeTonal({
      ...tonalData,
      [ear]: updatedEarData
    });
  };

  const clearEarData = (ear: 'right' | 'left' | 'freeField', field?: 'va' | 'vo') => {
    if (ear === 'freeField') {
      onChangeFreeField({});
      return;
    }
    const earData = { ...tonalData[ear] };
    FREQUENCIES.forEach(freq => {
      if (earData[freq] && field) {
        earData[freq] = {
          ...earData[freq],
          [field]: undefined,
          [field === 'va' ? 'maskedVa' : 'maskedVo']: false
        };
      }
    });
    onChangeTonal({
      ...tonalData,
      [ear]: earData
    });
  };

  return (
    <div className="space-y-6">
      {/* Resumo Diagnóstico e Indicadores em Tempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* OD Card */}
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-red-600 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              Orelha Direita (OD)
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {rightType}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded-lg border border-red-100">
              <span className="text-slate-500 block text-[10px]">Média Tritonal (500-2k)</span>
              <strong className="text-red-700 text-sm font-bold">
                {rightPTA.tritonal !== null ? `${rightPTA.tritonal} dB` : '--'}
              </strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-red-100">
              <span className="text-slate-500 block text-[10px]">Média Quadritonal</span>
              <strong className="text-red-700 text-sm font-bold">
                {rightPTA.quadritonal !== null ? `${rightPTA.quadritonal} dB` : '--'}
              </strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-red-100">
              <span className="text-slate-500 block text-[10px]">Altas Frequências (3-6k)</span>
              <strong className="text-red-700 text-sm font-bold">
                {rightPTA.highFreqs !== null ? `${rightPTA.highFreqs} dB` : '--'}
              </strong>
            </div>
          </div>

          <div className="text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-red-100/60">
            <span><strong>Grau:</strong> {rightDegree.degree}</span>
            <span><strong>Configuração:</strong> {rightConfig}</span>
          </div>
        </div>

        {/* OE Card */}
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-blue-600 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Orelha Esquerda (OE)
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {leftType}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded-lg border border-blue-100">
              <span className="text-slate-500 block text-[10px]">Média Tritonal (500-2k)</span>
              <strong className="text-blue-700 text-sm font-bold">
                {leftPTA.tritonal !== null ? `${leftPTA.tritonal} dB` : '--'}
              </strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-blue-100">
              <span className="text-slate-500 block text-[10px]">Média Quadritonal</span>
              <strong className="text-blue-700 text-sm font-bold">
                {leftPTA.quadritonal !== null ? `${leftPTA.quadritonal} dB` : '--'}
              </strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-blue-100">
              <span className="text-slate-500 block text-[10px]">Altas Frequências (3-6k)</span>
              <strong className="text-blue-700 text-sm font-bold">
                {leftPTA.highFreqs !== null ? `${leftPTA.highFreqs} dB` : '--'}
              </strong>
            </div>
          </div>

          <div className="text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-blue-100/60">
            <span><strong>Grau:</strong> {leftDegree.degree}</span>
            <span><strong>Configuração:</strong> {leftConfig}</span>
          </div>
        </div>
      </div>

      {/* Alertas de Mascaramento Inteligente & PAIR */}
      <div className="space-y-2">
        {maskingAlerts.length > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-900 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Indicação Clínica de Mascaramento Contralateral Detectada ({maskingAlerts.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMaskingAdvisor(!showMaskingAdvisor)}
                className="text-xs font-semibold text-amber-800 underline flex items-center gap-1"
              >
                {showMaskingAdvisor ? 'Ocultar Detalhes' : 'Ver Níveis Recomendados'}
                {showMaskingAdvisor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            {showMaskingAdvisor && (
              <ul className="text-xs space-y-1.5 pt-2 border-t border-amber-200">
                {maskingAlerts.map((alert, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-white/70 p-2 rounded-lg border border-amber-200/60">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      alert.ear === 'right' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.ear === 'right' ? 'OD' : 'OE'} {alert.type}
                    </span>
                    <div className="flex-1">
                      <span>{alert.reason}</span>
                      {alert.plateauRange && (
                        <span className="block font-semibold text-amber-950 mt-0.5">
                          Faixa de Platô Segura: {alert.plateauRange}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {category === 'ocupacional' && (
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
            pairAnalysis.isPAIR
              ? 'bg-orange-50 border-orange-200 text-orange-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <Volume2 className={`w-4 h-4 shrink-0 ${pairAnalysis.isPAIR ? 'text-orange-600' : 'text-slate-400'}`} />
            <div>
              <strong className="font-bold">Análise Ocupacional (Portaria 19/NR-7): </strong>
              <span>{pairAnalysis.reason}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Lançamento Tonal + Audiograma Interativo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabela de Limiares */}
        <Card className="lg:col-span-7 border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Matriz de Limiares Tonais (dB NA)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Insira valores de -10 a 120 dB ou 'NR' para ausência de resposta.
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Seletor de Orelha no Mobile */}
              <div className="flex lg:hidden items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMobileEarView('right')}
                  className={`px-2 py-1 rounded-md transition-all ${mobileEarView === 'right' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-700'}`}
                >
                  OD
                </button>
                <button
                  type="button"
                  onClick={() => setMobileEarView('left')}
                  className={`px-2 py-1 rounded-md transition-all ${mobileEarView === 'left' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'}`}
                >
                  OE
                </button>
                <button
                  type="button"
                  onClick={() => setMobileEarView('all')}
                  className={`px-2 py-1 rounded-md transition-all ${mobileEarView === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700'}`}
                >
                  Ambas
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <label className="text-slate-600 font-medium hidden sm:inline">Transdutor:</label>
                <select
                  className="h-7 text-xs rounded border border-slate-300 bg-white px-2 py-0.5"
                  value={transducer}
                  onChange={e => setTransducer(e.target.value as any)}
                >
                  <option value="supra">Supra-aural (40dB)</option>
                  <option value="insert">Inserção ER-3A (60dB)</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[320px]">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
                  <th className="p-2.5 font-bold border-r border-slate-200 w-16">Hz</th>
                  {(mobileEarView === 'all' || mobileEarView === 'right') && (
                    <th className="p-2 text-center text-red-600 font-bold border-r border-slate-200" colSpan={4}>
                      OD (Orelha Direita)
                    </th>
                  )}
                  {(mobileEarView === 'all' || mobileEarView === 'left') && (
                    <th className="p-2 text-center text-blue-600 font-bold" colSpan={4}>
                      OE (Orelha Esquerda)
                    </th>
                  )}
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
                  <th className="p-2 border-r border-slate-200"></th>
                  {(mobileEarView === 'all' || mobileEarView === 'right') && (
                    <>
                      <th className="p-1 text-center font-bold" title="Via Aérea Direita">VA</th>
                      <th className="p-1 text-center" title="Mascarado VA">M</th>
                      <th className="p-1 text-center font-bold" title="Via Óssea Direita">VO</th>
                      <th className="p-1 text-center border-r border-slate-200" title="Mascarado VO">M</th>
                    </>
                  )}
                  {(mobileEarView === 'all' || mobileEarView === 'left') && (
                    <>
                      <th className="p-1 text-center font-bold" title="Via Aérea Esquerda">VA</th>
                      <th className="p-1 text-center" title="Mascarado VA">M</th>
                      <th className="p-1 text-center font-bold" title="Via Óssea Esquerda">VO</th>
                      <th className="p-1 text-center" title="Mascarado VO">M</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {FREQUENCIES.map(freq => {
                  const isVoFreq = VO_FREQUENCIES.includes(freq);

                  return (
                    <tr key={freq} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2 font-bold text-slate-800 bg-slate-50/50 border-r border-slate-200">
                        {freq}
                      </td>

                      {/* OD - VA e VO */}
                      {(mobileEarView === 'all' || mobileEarView === 'right') && (
                        <>
                          <td className="p-1 text-center">
                            <Input
                              className="w-12 h-7 text-xs text-center p-0.5 bg-white border-red-200 focus:border-red-500 font-semibold text-red-700"
                              placeholder="-"
                              inputMode="text"
                              autoComplete="off"
                              value={tonalData.right?.[freq]?.va !== undefined ? tonalData.right[freq]?.va : ''}
                              onChange={e => handleThresholdChange('right', freq, 'va', e.target.value)}
                            />
                          </td>
                          <td className="p-1 text-center">
                            <input
                              type="checkbox"
                              title="VA Mascarada"
                              checked={tonalData.right?.[freq]?.maskedVa || false}
                              onChange={e => handleMaskingCheckbox('right', freq, 'maskedVa', e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300"
                            />
                          </td>
                          <td className="p-1 text-center">
                            {isVoFreq ? (
                              <Input
                                className="w-12 h-7 text-xs text-center p-0.5 bg-white border-red-200 focus:border-red-500 font-semibold text-red-700"
                                placeholder="-"
                                inputMode="text"
                                autoComplete="off"
                                value={tonalData.right?.[freq]?.vo !== undefined ? tonalData.right[freq]?.vo : ''}
                                onChange={e => handleThresholdChange('right', freq, 'vo', e.target.value)}
                              />
                            ) : (
                              <span className="text-slate-300 text-[10px]">--</span>
                            )}
                          </td>
                          <td className="p-1 text-center border-r border-slate-200">
                            {isVoFreq && (
                              <input
                                type="checkbox"
                                title="VO Mascarada"
                                checked={tonalData.right?.[freq]?.maskedVo || false}
                                onChange={e => handleMaskingCheckbox('right', freq, 'maskedVo', e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300"
                              />
                            )}
                          </td>
                        </>
                      )}

                      {/* OE - VA e VO */}
                      {(mobileEarView === 'all' || mobileEarView === 'left') && (
                        <>
                          <td className="p-1 text-center">
                            <Input
                              className="w-12 h-7 text-xs text-center p-0.5 bg-white border-blue-200 focus:border-blue-500 font-semibold text-blue-700"
                              placeholder="-"
                              inputMode="text"
                              autoComplete="off"
                              value={tonalData.left?.[freq]?.va !== undefined ? tonalData.left[freq]?.va : ''}
                              onChange={e => handleThresholdChange('left', freq, 'va', e.target.value)}
                            />
                          </td>
                          <td className="p-1 text-center">
                            <input
                              type="checkbox"
                              title="VA Mascarada"
                              checked={tonalData.left?.[freq]?.maskedVa || false}
                              onChange={e => handleMaskingCheckbox('left', freq, 'maskedVa', e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                          </td>
                          <td className="p-1 text-center">
                            {isVoFreq ? (
                              <Input
                                className="w-12 h-7 text-xs text-center p-0.5 bg-white border-blue-200 focus:border-blue-500 font-semibold text-blue-700"
                                placeholder="-"
                                inputMode="text"
                                autoComplete="off"
                                value={tonalData.left?.[freq]?.vo !== undefined ? tonalData.left[freq]?.vo : ''}
                                onChange={e => handleThresholdChange('left', freq, 'vo', e.target.value)}
                              />
                            ) : (
                              <span className="text-slate-300 text-[10px]">--</span>
                            )}
                          </td>
                          <td className="p-1 text-center">
                            {isVoFreq && (
                              <input
                                type="checkbox"
                                title="VO Mascarada"
                                checked={tonalData.left?.[freq]?.maskedVo || false}
                                onChange={e => handleMaskingCheckbox('left', freq, 'maskedVo', e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                              />
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Painel de Inserção Rápida Touch / Mobile */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 block lg:hidden space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Lançamento Rápido Touch
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {quickFreq} Hz • {activeTool?.replace('_', ' ')}: {' '}
                  <strong className="text-slate-800">
                    {(() => {
                      if (!activeTool) return '--';
                      const ear = activeTool.startsWith('OD') ? 'right' : 'left';
                      const field = activeTool.endsWith('VA') ? 'va' : 'vo';
                      const val = tonalData[ear]?.[quickFreq]?.[field];
                      return val !== undefined ? `${val} dB` : 'Não lançado';
                    })()}
                  </strong>
                </span>
              </div>

              {/* Seletor de Frequências (Scroll Horizontal) */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                {FREQUENCIES.map(f => (
                  <button
                    key={`quick-f-${f}`}
                    type="button"
                    onClick={() => setQuickFreq(f)}
                    className={`px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                      quickFreq === f
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Botões de Ação de Intensidade */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {/* Steppers -5 / +5 */}
                <button
                  type="button"
                  onClick={() => {
                    if (!activeTool) return;
                    const isRight = activeTool.startsWith('OD');
                    const isVA = activeTool.endsWith('VA');
                    const ear = isRight ? 'right' : 'left';
                    const cur = tonalData[ear]?.[quickFreq]?.[isVA ? 'va' : 'vo'];
                    const curNum = typeof cur === 'number' ? cur : 20;
                    const nextVal = Math.max(-10, curNum - 5);
                    handleThresholdChange(ear, quickFreq, isVA ? 'va' : 'vo', nextVal.toString());
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-xs text-slate-800 hover:bg-slate-100 shadow-sm"
                >
                  -5 dB
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!activeTool) return;
                    const isRight = activeTool.startsWith('OD');
                    const isVA = activeTool.endsWith('VA');
                    const ear = isRight ? 'right' : 'left';
                    const cur = tonalData[ear]?.[quickFreq]?.[isVA ? 'va' : 'vo'];
                    const curNum = typeof cur === 'number' ? cur : 20;
                    const nextVal = Math.min(120, curNum + 5);
                    handleThresholdChange(ear, quickFreq, isVA ? 'va' : 'vo', nextVal.toString());
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-xs text-slate-800 hover:bg-slate-100 shadow-sm"
                >
                  +5 dB
                </button>

                {/* Valores comuns rápidos */}
                {[0, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90].map(val => (
                  <button
                    key={`quick-val-${val}`}
                    type="button"
                    onClick={() => {
                      if (!activeTool) return;
                      const isRight = activeTool.startsWith('OD');
                      const isVA = activeTool.endsWith('VA');
                      handleThresholdChange(isRight ? 'right' : 'left', quickFreq, isVA ? 'va' : 'vo', val.toString());
                    }}
                    className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow-xs"
                  >
                    {val}
                  </button>
                ))}

                {/* NR */}
                <button
                  type="button"
                  onClick={() => {
                    if (!activeTool) return;
                    const isRight = activeTool.startsWith('OD');
                    const isVA = activeTool.endsWith('VA');
                    handleThresholdChange(isRight ? 'right' : 'left', quickFreq, isVA ? 'va' : 'vo', 'NR');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-800 border border-red-200 font-bold text-xs hover:bg-red-200"
                >
                  NR
                </button>

                {/* Limpar ponto */}
                <button
                  type="button"
                  onClick={() => {
                    if (!activeTool) return;
                    const isRight = activeTool.startsWith('OD');
                    const isVA = activeTool.endsWith('VA');
                    handleThresholdChange(isRight ? 'right' : 'left', quickFreq, isVA ? 'va' : 'vo', '');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-300"
                >
                  Limpar
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audiograma Gráfico Interativo */}
        <Card className="lg:col-span-5 border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Audiograma Interativo
              </CardTitle>
            </div>
            {/* Seletor de Ferramentas de Desenho */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveTool('OD_VA')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTool === 'OD_VA'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                OD VA (O)
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('OD_VO')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTool === 'OD_VO'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                OD VO (&lt;)
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('OE_VA')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTool === 'OE_VA'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                OE VA (X)
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('OE_VO')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTool === 'OE_VO'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                OE VO (&gt;)
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('FREE_FIELD')}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTool === 'FREE_FIELD'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Campo Livre (S)
              </button>

              <div className="w-full flex items-center justify-between gap-2 pt-1 border-t border-slate-100 mt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsMasked(!isMasked)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                      isMasked
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Mascarado {isMasked ? '✓' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNR(!isNR)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                      isNR
                        ? 'bg-slate-800 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Sem Resposta (NR) {isNR ? '✓' : ''}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => clearEarData('right', 'va')}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Limpar OD
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => clearEarData('left', 'va')}
                    className="text-[10px] text-blue-500 hover:underline"
                  >
                    Limpar OE
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex items-center justify-center p-3 bg-white">
            <div className="w-full max-w-[500px]">
              <AudiogramSVG
                rightData={tonalData.right}
                leftData={tonalData.left}
                freeFieldData={freeField}
                onPointClick={handleAudiogramClick}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Registro Formal de Mascaramento */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Registro de Mascaramento Utilizado (Nível de Ruído Narrow-Band)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OD Masking */}
            <div className="p-3 rounded-lg border border-red-100 bg-red-50/20 space-y-2">
              <span className="text-xs font-bold text-red-600 block">Ruído Mascarante Contralateral para Orelha Direita</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">VA Inicial (dBNB)</label>
                  <Input
                    className="h-7 text-xs bg-white"
                    placeholder="Ex: 50 dBNB"
                    value={tonalMasking?.right?.va1 || ''}
                    onChange={e => onChangeMasking({
                      ...tonalMasking!,
                      right: { ...(tonalMasking?.right || {}), va1: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">VO Inicial (dBNB)</label>
                  <Input
                    className="h-7 text-xs bg-white"
                    placeholder="Ex: 40 dBNB"
                    value={tonalMasking?.right?.vo1 || ''}
                    onChange={e => onChangeMasking({
                      ...tonalMasking!,
                      right: { ...(tonalMasking?.right || {}), vo1: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* OE Masking */}
            <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/20 space-y-2">
              <span className="text-xs font-bold text-blue-600 block">Ruído Mascarante Contralateral para Orelha Esquerda</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">VA Inicial (dBNB)</label>
                  <Input
                    className="h-7 text-xs bg-white"
                    placeholder="Ex: 50 dBNB"
                    value={tonalMasking?.left?.va1 || ''}
                    onChange={e => onChangeMasking({
                      ...tonalMasking!,
                      left: { ...(tonalMasking?.left || {}), va1: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">VO Inicial (dBNB)</label>
                  <Input
                    className="h-7 text-xs bg-white"
                    placeholder="Ex: 40 dBNB"
                    value={tonalMasking?.left?.vo1 || ''}
                    onChange={e => onChangeMasking({
                      ...tonalMasking!,
                      left: { ...(tonalMasking?.left || {}), vo1: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
