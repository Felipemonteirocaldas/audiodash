import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogoAudiometryData, EarTonalData } from '@/db/db';
import {
  calculatePTA,
  validateSpeechConcordance,
  classifyIPRF,
  getNumericThreshold
} from '@/lib/audiologyCalculations';
import {
  MessageSquare,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface Props {
  logoData: {
    right: LogoAudiometryData;
    left: LogoAudiometryData;
  };
  tonalData?: {
    right: Partial<EarTonalData>;
    left: Partial<EarTonalData>;
  };
  onChange: (data: { right: LogoAudiometryData; left: LogoAudiometryData }) => void;
}

export default function LogoAudiometryExam({ logoData, tonalData, onChange }: Props) {
  const rightPTA = useMemo(() => calculatePTA(tonalData?.right), [tonalData?.right]);
  const leftPTA = useMemo(() => calculatePTA(tonalData?.left), [tonalData?.left]);

  // Concordância Tonal-Vocal
  const rightSRTConcordance = useMemo(() => {
    return validateSpeechConcordance(logoData.right?.srt?.db, rightPTA.tritonal);
  }, [logoData.right?.srt?.db, rightPTA.tritonal]);

  const leftSRTConcordance = useMemo(() => {
    return validateSpeechConcordance(logoData.left?.srt?.db, leftPTA.tritonal);
  }, [logoData.left?.srt?.db, leftPTA.tritonal]);

  // Classificação do IPRF
  const rightIPRFRating = useMemo(() => {
    return classifyIPRF(logoData.right?.irf?.mono?.percentage);
  }, [logoData.right?.irf?.mono?.percentage]);

  const leftIPRFRating = useMemo(() => {
    return classifyIPRF(logoData.left?.irf?.mono?.percentage);
  }, [logoData.left?.irf?.mono?.percentage]);

  // Checagem de necessidade de mascaramento de fala (Speech Noise)
  // Se Intensidade_Fala - Melhor_VO_Contralateral >= 45 dB
  const rightSpeechMaskingNeeded = useMemo(() => {
    const speechIntensity = getNumericThreshold(logoData.right?.irf?.mono?.db ?? logoData.right?.srt?.db);
    const contraVO = getNumericThreshold(tonalData?.left?.['1000']?.vo ?? tonalData?.left?.['1000']?.va) ?? 0;
    if (speechIntensity !== null && speechIntensity - contraVO >= 45) {
      return true;
    }
    return false;
  }, [logoData.right, tonalData?.left]);

  const leftSpeechMaskingNeeded = useMemo(() => {
    const speechIntensity = getNumericThreshold(logoData.left?.irf?.mono?.db ?? logoData.left?.srt?.db);
    const contraVO = getNumericThreshold(tonalData?.right?.['1000']?.vo ?? tonalData?.right?.['1000']?.va) ?? 0;
    if (speechIntensity !== null && speechIntensity - contraVO >= 45) {
      return true;
    }
    return false;
  }, [logoData.left, tonalData?.right]);

  const updateSRT = (ear: 'right' | 'left', key: 'db' | 'masking' | 'unit', val: string) => {
    onChange({
      ...logoData,
      [ear]: {
        ...logoData[ear],
        srt: {
          ...(logoData[ear]?.srt || {}),
          [key]: val
        }
      }
    });
  };

  const updateVoiceDetection = (ear: 'right' | 'left', key: 'db' | 'masking' | 'unit', val: string) => {
    onChange({
      ...logoData,
      [ear]: {
        ...logoData[ear],
        voiceDetection: {
          ...(logoData[ear]?.voiceDetection || {}),
          [key]: val
        }
      }
    });
  };

  const updateIRF = (ear: 'right' | 'left', type: 'mono' | 'dis' | 'tris', key: 'db' | 'percentage' | 'masking', val: string) => {
    onChange({
      ...logoData,
      [ear]: {
        ...logoData[ear],
        irf: {
          ...(logoData[ear]?.irf || {}),
          [type]: {
            ...(logoData[ear]?.irf?.[type] || {}),
            [key]: val
          }
        }
      }
    });
  };

  // Sugestão automática de intensidade do IPRF (Média Tritonal ou SRT + 40 dB SL)
  const suggestIPRFLevel = (ear: 'right' | 'left') => {
    const srtVal = getNumericThreshold(logoData[ear]?.srt?.db);
    const ptaVal = ear === 'right' ? rightPTA.tritonal : leftPTA.tritonal;
    const base = srtVal ?? ptaVal;
    if (base !== null) {
      const suggested = Math.min(100, base + 40);
      onChange({
        ...logoData,
        [ear]: {
          ...logoData[ear],
          irf: {
            ...(logoData[ear]?.irf || {}),
            mono: {
              ...(logoData[ear]?.irf?.mono || {}),
              db: suggested.toString(),
              percentage: logoData[ear]?.irf?.mono?.percentage || '100'
            }
          }
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas e Validações Clínicas em Tempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OD Feedback */}
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              OD: Análise Tonal-Vocal e Discriminação
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rightSRTConcordance.badgeColor}`}>
              {rightSRTConcordance.isConcordant ? 'LRF Concordante' : 'Atenção ao LRF'}
            </span>
          </div>
          <p className="text-xs text-slate-600">{rightSRTConcordance.message}</p>
          {logoData.right?.irf?.mono?.percentage && (
            <div className="text-xs pt-1 border-t border-red-100 flex items-center justify-between">
              <span><strong>Discriminação (Monossílabos):</strong> {rightIPRFRating.rating}</span>
            </div>
          )}
          {rightSpeechMaskingNeeded && (
            <div className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 p-1.5 rounded flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Indicação de mascaramento contralateral com Speech Noise (Diferença &ge; 45 dB).
            </div>
          )}
        </div>

        {/* OE Feedback */}
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              OE: Análise Tonal-Vocal e Discriminação
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${leftSRTConcordance.badgeColor}`}>
              {leftSRTConcordance.isConcordant ? 'LRF Concordante' : 'Atenção ao LRF'}
            </span>
          </div>
          <p className="text-xs text-slate-600">{leftSRTConcordance.message}</p>
          {logoData.left?.irf?.mono?.percentage && (
            <div className="text-xs pt-1 border-t border-blue-100 flex items-center justify-between">
              <span><strong>Discriminação (Monossílabos):</strong> {leftIPRFRating.rating}</span>
            </div>
          )}
          {leftSpeechMaskingNeeded && (
            <div className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 p-1.5 rounded flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Indicação de mascaramento contralateral com Speech Noise (Diferença &ge; 45 dB).
            </div>
          )}
        </div>
      </div>

      {/* 1. Limiar de Reconhecimento de Fala (LRF / SRT) e Detecção de Voz (LDV / SDT) */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            1. Limiares de Fala: LRF (SRT) e LDV (SDT)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            O LRF corresponde à intensidade com 50% de reconhecimento correto de dissílabos/trissílabos (concordante com a média de 500, 1k e 2k Hz).
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-2.5">Orelha</th>
                <th className="p-2">LRF / SRT (dB NA)</th>
                <th className="p-2">Masc. LRF (dB SN)</th>
                <th className="p-2">LDV / SDT (dB NA)</th>
                <th className="p-2">Masc. LDV (dB SN)</th>
                <th className="p-2">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {/* OD */}
              <tr className="hover:bg-slate-50/80">
                <td className="p-2.5 font-bold text-red-600">Orelha Direita (OD)</td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white font-semibold text-red-700"
                    placeholder={rightPTA.tritonal !== null ? `Média: ${rightPTA.tritonal} dB` : 'dB'}
                    value={logoData.right?.srt?.db || ''}
                    onChange={e => updateSRT('right', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.right?.srt?.masking || ''}
                    onChange={e => updateSRT('right', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white text-slate-700"
                    placeholder="dB"
                    value={logoData.right?.voiceDetection?.db || ''}
                    onChange={e => updateVoiceDetection('right', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.right?.voiceDetection?.masking || ''}
                    onChange={e => updateVoiceDetection('right', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <button
                    type="button"
                    onClick={() => suggestIPRFLevel('right')}
                    className="text-[11px] px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200 font-semibold"
                  >
                    Calcular IPRF (+40dB)
                  </button>
                </td>
              </tr>

              {/* OE */}
              <tr className="hover:bg-slate-50/80">
                <td className="p-2.5 font-bold text-blue-600">Orelha Esquerda (OE)</td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white font-semibold text-blue-700"
                    placeholder={leftPTA.tritonal !== null ? `Média: ${leftPTA.tritonal} dB` : 'dB'}
                    value={logoData.left?.srt?.db || ''}
                    onChange={e => updateSRT('left', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.left?.srt?.masking || ''}
                    onChange={e => updateSRT('left', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white text-slate-700"
                    placeholder="dB"
                    value={logoData.left?.voiceDetection?.db || ''}
                    onChange={e => updateVoiceDetection('left', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.left?.voiceDetection?.masking || ''}
                    onChange={e => updateVoiceDetection('left', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <button
                    type="button"
                    onClick={() => suggestIPRFLevel('left')}
                    className="text-[11px] px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 font-semibold"
                  >
                    Calcular IPRF (+40dB)
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 2. Índice Percentual de Reconhecimento de Fala (IPRF / IRF) */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            2. Índice Percentual de Reconhecimento de Fala (IPRF / IRF)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Apresentação de listas de palavras foneticamente balanceadas a 35-40 dB NS acima do LRF ou no nível de maior conforto.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-2.5">Orelha</th>
                <th className="p-2">Material Fonético</th>
                <th className="p-2">Intensidade (dB NA)</th>
                <th className="p-2">Reconhecimento (%)</th>
                <th className="p-2">Mascaramento (dB SN)</th>
                <th className="p-2">Classificação Diagnóstica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {/* OD - Monossílabos */}
              <tr className="hover:bg-slate-50/80">
                <td className="p-2.5 font-bold text-red-600" rowSpan={3}>OD</td>
                <td className="p-2 font-medium">Monossílabos</td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dB"
                    value={logoData.right?.irf?.mono?.db || ''}
                    onChange={e => updateIRF('right', 'mono', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white font-bold text-red-700"
                    placeholder="%"
                    value={logoData.right?.irf?.mono?.percentage || ''}
                    onChange={e => updateIRF('right', 'mono', 'percentage', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.right?.irf?.mono?.masking || ''}
                    onChange={e => updateIRF('right', 'mono', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-2 text-xs font-semibold text-slate-700">
                  {rightIPRFRating.rating}
                </td>
              </tr>

              {/* OD - Dissílabos */}
              <tr className="hover:bg-slate-50/80">
                <td className="p-2 font-medium">Dissílabos</td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dB"
                    value={logoData.right?.irf?.dis?.db || ''}
                    onChange={e => updateIRF('right', 'dis', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="%"
                    value={logoData.right?.irf?.dis?.percentage || ''}
                    onChange={e => updateIRF('right', 'dis', 'percentage', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.right?.irf?.dis?.masking || ''}
                    onChange={e => updateIRF('right', 'dis', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-2 text-xs text-slate-400">Opcional</td>
              </tr>

              {/* OD - Trissílabos */}
              <tr className="hover:bg-slate-50/80">
                <td className="p-2 font-medium">Trissílabos</td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dB"
                    value={logoData.right?.irf?.tris?.db || ''}
                    onChange={e => updateIRF('right', 'tris', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="%"
                    value={logoData.right?.irf?.tris?.percentage || ''}
                    onChange={e => updateIRF('right', 'tris', 'percentage', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.right?.irf?.tris?.masking || ''}
                    onChange={e => updateIRF('right', 'tris', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-2 text-xs text-slate-400">Opcional</td>
              </tr>

              {/* OE - Monossílabos */}
              <tr className="hover:bg-slate-50/80">
                <td className="p-2.5 font-bold text-blue-600" rowSpan={3}>OE</td>
                <td className="p-2 font-medium">Monossílabos</td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dB"
                    value={logoData.left?.irf?.mono?.db || ''}
                    onChange={e => updateIRF('left', 'mono', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white font-bold text-blue-700"
                    placeholder="%"
                    value={logoData.left?.irf?.mono?.percentage || ''}
                    onChange={e => updateIRF('left', 'mono', 'percentage', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.left?.irf?.mono?.masking || ''}
                    onChange={e => updateIRF('left', 'mono', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-2 text-xs font-semibold text-slate-700">
                  {leftIPRFRating.rating}
                </td>
              </tr>

              {/* OE - Dissílabos */}
              <tr className="hover:bg-slate-50/80">
                <td className="p-2 font-medium">Dissílabos</td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dB"
                    value={logoData.left?.irf?.dis?.db || ''}
                    onChange={e => updateIRF('left', 'dis', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="%"
                    value={logoData.left?.irf?.dis?.percentage || ''}
                    onChange={e => updateIRF('left', 'dis', 'percentage', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.left?.irf?.dis?.masking || ''}
                    onChange={e => updateIRF('left', 'dis', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-2 text-xs text-slate-400">Opcional</td>
              </tr>

              {/* OE - Trissílabos */}
              <tr className="hover:bg-slate-50/80">
                <td className="p-2 font-medium">Trissílabos</td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dB"
                    value={logoData.left?.irf?.tris?.db || ''}
                    onChange={e => updateIRF('left', 'tris', 'db', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="%"
                    value={logoData.left?.irf?.tris?.percentage || ''}
                    onChange={e => updateIRF('left', 'tris', 'percentage', e.target.value)}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="dBSN"
                    value={logoData.left?.irf?.tris?.masking || ''}
                    onChange={e => updateIRF('left', 'tris', 'masking', e.target.value)}
                  />
                </td>
                <td className="p-2 text-xs text-slate-400">Opcional</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
