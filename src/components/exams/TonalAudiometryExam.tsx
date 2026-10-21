import ClinicalEvidence from './ClinicalEvidence';
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
  assessNR7Audiogram,
  classifyWHOGlobal,
  DegreeStandard
} from '@/lib/audiologyCalculations';
import {
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
  transducer: 'supra' | 'insert';
  onTransducerChange: (value: 'supra' | 'insert') => void;
  allowInterpretation?: boolean;
  allowDegree?: boolean;
  isChild?: boolean;
  interpretationBlockedReason?: string;
  showAverages?: boolean;
  protocol?: 'BSA_2018';
  responseType?: '' | 'threshold' | 'minimum_response';
}

export default function TonalAudiometryExam({
  tonalData,
  tonalMasking,
  freeField,
  onChangeTonal,
  onChangeMasking,
  onChangeFreeField,
  category = 'clinico',
  standard = 'OMS_2021',
  transducer,
  onTransducerChange,
  allowInterpretation = false,
  allowDegree = allowInterpretation,
  isChild = false,
  interpretationBlockedReason = 'Classificação a definir pelo profissional.',
  showAverages = false,
  protocol,
  responseType
}: Props) {
  type DrawingTool = 'OD_VA' | 'OD_VO' | 'OE_VA' | 'OE_VO' | 'FREE_FIELD' | null;
  const [activeTool, setActiveTool] = useState<DrawingTool>('OD_VA');
  const [isMasked, setIsMasked] = useState(false);
  const [isNR, setIsNR] = useState(false);
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [showMaskingAdvisor, setShowMaskingAdvisor] = useState(false);
  const [mobileEarView, setMobileEarView] = useState<'all' | 'right' | 'left'>('all');
  const [quickFreq, setQuickFreq] = useState<TonalFrequency>('1000');

  // Cálculos Audiológicos em tempo real
  const rightPTA = useMemo(() => calculatePTA(showAverages ? tonalData.right : undefined), [tonalData.right, showAverages]);
  const leftPTA = useMemo(() => calculatePTA(showAverages ? tonalData.left : undefined), [tonalData.left, showAverages]);

  const rightDegree = useMemo(() => allowDegree ? classifyDegree(rightPTA, standard, isChild) : { degree: 'Definido pelo profissional', code: 'NA' }, [rightPTA, standard, allowDegree, isChild]);
  const leftDegree = useMemo(() => allowDegree ? classifyDegree(leftPTA, standard, isChild) : { degree: 'Definido pelo profissional', code: 'NA' }, [leftPTA, standard, allowDegree, isChild]);
  const whoGlobal = useMemo(() => allowDegree && standard === 'OMS_2021' ? classifyWHOGlobal(rightPTA, leftPTA) : null, [allowDegree, standard, rightPTA, leftPTA]);

  const rightType = useMemo(() => allowInterpretation ? classifyType(tonalData.right) : 'A interpretar', [tonalData.right, allowInterpretation]);
  const leftType = useMemo(() => allowInterpretation ? classifyType(tonalData.left) : 'A interpretar', [tonalData.left, allowInterpretation]);

  const rightConfig = useMemo(() => classifyConfiguration(tonalData.right), [tonalData.right]);
  const leftConfig = useMemo(() => classifyConfiguration(tonalData.left), [tonalData.left]);

  const maskingAlerts = useMemo(() => {
    return checkMaskingNecessity(tonalData.right, tonalData.left, transducer, protocol);
  }, [tonalData.right, tonalData.left, transducer, protocol]);

  const occupational = useMemo(() => ({ right: assessNR7Audiogram(tonalData.right), left: assessNR7Audiogram(tonalData.left) }), [tonalData.right, tonalData.left]);

  // Manipuladores de alteração de limiar
  const handleThresholdChange = (
    ear: 'right' | 'left',
    freq: TonalFrequency,
    field: 'va' | 'vo',
    value: string
  ) => {
    if (field === 'vo' && !VO_FREQUENCIES.includes(freq)) return;
    const key = `${ear}-${freq}-${field}`;
    setInputDrafts(previous => ({ ...previous, [key]: value }));
    const raw = value.trim().toUpperCase();
    let finalVal: number | 'NR' | undefined = undefined;
    if (raw === 'NR' || raw === 'N' || raw === 'SR' || raw === 'X') {
      finalVal = 'NR';
    } else if (raw !== '') {
      const parsed = Number(raw);
      finalVal = /^-?\d+$/.test(raw) && Number.isFinite(parsed) ? parsed : undefined;
    }

    const updatedEarData = {
      ...tonalData[ear],
      [freq]: {
        ...(tonalData[ear]?.[freq] || {}),
        [field]: finalVal,
        [field === 'va' ? 'nrLevelVa' : 'nrLevelVo']: finalVal === 'NR' ? (typeof tonalData[ear]?.[freq]?.[field] === 'number' ? tonalData[ear][freq]![field] : tonalData[ear]?.[freq]?.[field === 'va' ? 'nrLevelVa' : 'nrLevelVo']) : undefined
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
        [field]: checked,
        [field === 'maskedVa' ? 'unmaskedVa' : 'unmaskedVo']: checked ? (tonalData[ear]?.[freq]?.[field === 'maskedVa' ? 'unmaskedVa' : 'unmaskedVo'] ?? (typeof tonalData[ear]?.[freq]?.[field === 'maskedVa' ? 'va' : 'vo'] === 'number' ? tonalData[ear][freq]![field === 'maskedVa' ? 'va' : 'vo'] : undefined)) : tonalData[ear]?.[freq]?.[field === 'maskedVa' ? 'unmaskedVa' : 'unmaskedVo']
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
    setInputDrafts({});

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
          nrLevelVa: valToSet === 'NR' ? dbVal : undefined,
          va: valToSet === 'NR' ? 'NR' : (valToSet === undefined ? undefined : parseInt(valToSet.toString(), 10))
        }
      });
      return;
    }

    const isRight = activeTool.startsWith('OD');
    const isVA = activeTool.endsWith('VA');
    const ear = isRight ? 'right' : 'left';

    if (!isVA && !VO_FREQUENCIES.includes(freq as TonalFrequency)) return;
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
    const previousValue = isVA ? currentPoint?.va : currentPoint?.vo;
    const unmaskedField = isVA ? 'unmaskedVa' : 'unmaskedVo';
    // Ao lançar um valor mascarado sobre um limiar sem mascaramento, preserva o limiar inicial (usado nos alertas BSA).
    const unmaskedValue = maskedToSet && !(isVA ? currentPoint?.maskedVa : currentPoint?.maskedVo) && typeof previousValue === 'number' ? previousValue : currentPoint?.[unmaskedField];

    const updatedEarData = {
      ...tonalData[ear],
      [freq]: {
        ...(tonalData[ear]?.[freq as TonalFrequency] || {}),
        [isVA ? 'va' : 'vo']: finalVal,
        [isVA ? 'maskedVa' : 'maskedVo']: maskedToSet,
        [unmaskedField]: unmaskedValue,
        [isVA ? 'nrLevelVa' : 'nrLevelVo']: valToSet === 'NR' ? dbVal : undefined
      }
    };

    onChangeTonal({
      ...tonalData,
      [ear]: updatedEarData
    });
  };

  const clearEarData = (ear: 'right' | 'left' | 'freeField', field?: 'va' | 'vo') => {
    setInputDrafts({});
    if (ear === 'freeField') {
      onChangeFreeField({});
      return;
    }
    if (!field) { onChangeTonal({ ...tonalData, [ear]: {} }); return; }
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
      <ClinicalEvidence sources={['CFFA_GUIA_2023', 'WHO_2021', 'BSA_2018', 'ASHA_SYMBOLS', 'NR7_ANEXO2']} />
      <p className="text-xs text-slate-500">Os alertas dependem de dados sem mascaramento disponíveis. Ausência de alerta não confirma dispensa de mascaramento nem platô observado.</p>
      {!protocol && <p className="text-xs text-slate-600">Selecione a referência de procedimento para habilitar os alertas de mascaramento. Ausência de alerta não confirma que o mascaramento é dispensável.</p>}
      {!allowInterpretation && <p className="text-xs rounded-lg bg-slate-50 border p-2 text-slate-700">{allowDegree ? 'Grau sugerido pela referência pediátrica selecionada; tipo e configuração definidos pelo profissional.' : 'Tipo e grau automáticos não aplicados:'} {allowDegree ? '' : interpretationBlockedReason}</p>}
      {whoGlobal && <p className="text-xs rounded-lg bg-slate-50 border p-2 text-slate-700"><strong>Classificação global OMS 2021 (melhor orelha):</strong> {whoGlobal.label} Os graus por orelha abaixo usam as faixas da OMS aplicadas à média de cada orelha.</p>}
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
            <span><strong>Grau (média OD):</strong> {rightDegree.degree}</span>
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
            <span><strong>Grau (média OE):</strong> {leftDegree.degree}</span>
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
                <span>Alertas de mascaramento · BSA 2018 ({maskingAlerts.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMaskingAdvisor(!showMaskingAdvisor)}
                className="text-xs font-semibold text-amber-800 underline flex items-center gap-1"
              >
                {showMaskingAdvisor ? 'Ocultar Detalhes' : 'Ver alertas de revisão'}
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
                          Observação: {alert.plateauRange}
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
          <div className="p-3 rounded-xl border flex items-start gap-2.5 text-xs font-medium bg-slate-50 border-slate-200 text-slate-700">
            <Volume2 className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block">Análise descritiva ocupacional · NR-7, Anexo II (item 5)</strong>
              <span className="block"><strong>OD:</strong> {occupational.right.reason}</span>
              <span className="block"><strong>OE:</strong> {occupational.left.reason}</span>
              <span className="block text-slate-500">Desencadeamento e agravamento exigem comparação com o exame de referência (tela Comparar exames). O diagnóstico conclusivo e a aptidão cabem ao médico do trabalho (item 6).</span>
            </div>
          </div>
        )}
      </div>

      {(['right', 'left'] as const).map(ear => Object.entries(tonalData[ear]).map(([freq, point]) => (['va', 'vo'] as const).map(via => point[via] === 'NR' ? <label key={`${ear}-${freq}-${via}`} className="block text-xs font-semibold bg-amber-50 border border-amber-200 rounded-lg p-3">Sem resposta · {ear === 'right' ? 'OD' : 'OE'} · {freq} Hz · {via.toUpperCase()} — nível apresentado (dB NA)
        <Input type="number" min={-10} max={120} step={5} aria-label={`Nível sem resposta ${ear} ${freq} ${via}`} value={point[via === 'va' ? 'nrLevelVa' : 'nrLevelVo'] ?? ''} onChange={e => onChangeTonal({ ...tonalData, [ear]: { ...tonalData[ear], [freq]: { ...point, [via === 'va' ? 'nrLevelVa' : 'nrLevelVo']: e.target.value === '' ? undefined : Number(e.target.value) } } })} />
      </label> : null)))}

      {/* Tabela de Lançamento Tonal + Audiograma Interativo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabela de Limiares */}
        <Card className="lg:col-span-7 border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
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
                  onChange={e => onTransducerChange(e.target.value as any)}
                >
                  <option value="supra">Supra-aural</option>
                  <option value="insert">Inserção (registrar modelo)</option>
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
                              aria-label="VA OD"
                              value={inputDrafts[`right-${freq}-va`] ?? tonalData.right?.[freq]?.va ?? ''}
                              onBlur={() => setInputDrafts(previous => { const next = { ...previous }; delete next[`right-${freq}-va`]; return next; })}
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
                                aria-label="VO OD"
                              value={inputDrafts[`right-${freq}-vo`] ?? tonalData.right?.[freq]?.vo ?? ''}
                              onBlur={() => setInputDrafts(previous => { const next = { ...previous }; delete next[`right-${freq}-vo`]; return next; })}
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
                              aria-label="VA OE"
                              value={inputDrafts[`left-${freq}-va`] ?? tonalData.left?.[freq]?.va ?? ''}
                              onBlur={() => setInputDrafts(previous => { const next = { ...previous }; delete next[`left-${freq}-va`]; return next; })}
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
                                aria-label="VO OE"
                              value={inputDrafts[`left-${freq}-vo`] ?? tonalData.left?.[freq]?.vo ?? ''}
                              onBlur={() => setInputDrafts(previous => { const next = { ...previous }; delete next[`left-${freq}-vo`]; return next; })}
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
                  Entrada por toque
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
                    onClick={() => clearEarData('right')}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Limpar OD
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => clearEarData('left')}
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
              <p className="text-xs font-semibold text-slate-700 mb-2">{responseType === 'minimum_response' ? 'Níveis mínimos de resposta · não equivalem automaticamente a limiares' : responseType === 'threshold' ? 'Limiares auditivos registrados' : 'Tipo de resposta ainda não informado'}</p>
              <AudiogramSVG
                rightData={tonalData.right}
                leftData={tonalData.left}
                freeFieldData={freeField}
                onPointClick={handleAudiogramClick}
              />
              <p className="text-xs text-slate-600 mt-3">OD: O / △ mascarada · OE: X / □ mascarada · VO: &lt; / &gt; e [ / ] mascarada · S: campo livre, sem lateralidade. Seta: ausência de resposta no nível informado; não é limiar. VO sem mascaramento não identifica isoladamente a cóclea respondente. O alcance da escala não define a saída máxima do equipamento.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Registro Formal de Mascaramento */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
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
                    placeholder="Nível aplicado"
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
                    placeholder="Nível aplicado"
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
                    placeholder="Nível aplicado"
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
                    placeholder="Nível aplicado"
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
