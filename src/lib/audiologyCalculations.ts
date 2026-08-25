import { EarTonalData, TonalFrequency, TympanometryData, EarReflexData, ReflexFrequency, LogoAudiometryData, Meatoscopy, ComplementaryTests } from '@/db/db';

export type DegreeStandard = 'OMS_2021' | 'OMS_2014' | 'LLOYD_KAPLAN';

export interface CalculatedPTA {
  tritonal: number | null; // 500, 1000, 2000 Hz (Davis & Silverman / OMS tradicional)
  quadritonal: number | null; // 500, 1000, 2000, 4000 Hz (OMS 2021 / CFFa / BIAP)
  highFreqs: number | null; // 3000, 4000, 6000 Hz (Ocupacional / Portaria 19 / NR-7)
  extendedHighFreqs?: number | null; // 6000, 8000 Hz
  biap: number | null;
}

export interface MaskingAlert {
  freq: TonalFrequency;
  ear: 'right' | 'left';
  type: 'VA' | 'VO';
  reason: string;
  minMaskingDb?: number;
  maxMaskingDb?: number;
  plateauRange?: string;
}

export interface EarClassification {
  degree: string;
  degreeCode?: string;
  type: string;
  configuration: string;
  pta: CalculatedPTA;
  hasAirBoneGap: boolean;
  airBoneGapValues: Record<string, number>;
  isSuggestiveNoiseInduced: boolean; // Sugestivo de PAIR (NR-7)
}

export interface JergerClassification {
  type: 'A' | 'As' | 'Ad' | 'B' | 'C' | 'D' | 'Inconclusivo';
  description: string;
  interpretation: string;
  isNormal: boolean;
}

export interface MetzTestResult {
  freq: ReflexFrequency;
  ear: 'right' | 'left';
  sensationLevel: number | null;
  hasRecruitment: boolean; // Metz positivo se diferença <= 60 dB
  interpretation: string;
}

/**
 * Converte valor numérico ou 'NR' para número real ou null
 */
export function getNumericThreshold(val: number | 'NR' | string | undefined): number | null {
  if (val === undefined || val === null || val === '' || val === 'NR') return null;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? null : num;
}

/**
 * Calcula as médias audiométricas (PTA) para uma orelha
 */
export function calculatePTA(tonalData: Partial<EarTonalData> | undefined): CalculatedPTA {
  if (!tonalData) {
    return { tritonal: null, quadritonal: null, highFreqs: null, biap: null };
  }

  const getVal = (freq: TonalFrequency) => {
    const raw = tonalData[freq]?.va;
    if (raw === 'NR') return 120; // Trata Ausência de Resposta como intensidade máxima para fins de cálculo
    return getNumericThreshold(raw);
  };

  // Tritonal: 500, 1000, 2000
  const t500 = getVal('500');
  const t1000 = getVal('1000');
  const t2000 = getVal('2000');
  const t3000 = getVal('3000');
  const t4000 = getVal('4000');
  const t6000 = getVal('6000');

  // Média Tritonal (500, 1k, 2k)
  let tritonal: number | null = null;
  const triVals = [t500, t1000, t2000].filter((v): v is number => v !== null);
  if (triVals.length >= 2) {
    tritonal = Math.round((triVals.reduce((a, b) => a + b, 0) / triVals.length) * 10) / 10;
  }

  // Média Quadritonal (500, 1k, 2k, 4k)
  let quadritonal: number | null = null;
  const quadVals = [t500, t1000, t2000, t4000].filter((v): v is number => v !== null);
  if (quadVals.length >= 3) {
    quadritonal = Math.round((quadVals.reduce((a, b) => a + b, 0) / quadVals.length) * 10) / 10;
  }

  // Altas Frequências / Ocupacional (3k, 4k, 6k)
  let highFreqs: number | null = null;
  const highVals = [t3000, t4000, t6000].filter((v): v is number => v !== null);
  if (highVals.length >= 2) {
    highFreqs = Math.round((highVals.reduce((a, b) => a + b, 0) / highVals.length) * 10) / 10;
  }

  return {
    tritonal,
    quadritonal,
    highFreqs,
    biap: quadritonal
  };
}

/**
 * Classifica o grau de perda auditiva segundo diretrizes OMS 2021 ou OMS 2014 / Lloyd & Kaplan
 */
export function classifyDegree(
  pta: CalculatedPTA, 
  standard: DegreeStandard = 'OMS_2021', 
  isChild = false
): { degree: string; code: string } {
  const average = standard === 'OMS_2021' 
    ? (pta.quadritonal ?? pta.tritonal) 
    : (pta.tritonal ?? pta.quadritonal);

  if (average === null) {
    return { degree: 'Não avaliado', code: 'NA' };
  }

  if (standard === 'OMS_2021') {
    // Nova classificação mundial da OMS (World Report on Hearing, 2021)
    if (average < 20) return { degree: 'Audição Normal', code: 'NORMAL' };
    if (average < 35) return { degree: 'Perda Auditiva Leve (Grau 1)', code: 'LEVE' };
    if (average < 50) return { degree: 'Perda Auditiva Moderada (Grau 2)', code: 'MODERADA' };
    if (average < 65) return { degree: 'Perda Auditiva Moderadamente Severa (Grau 3)', code: 'MOD_SEVERA' };
    if (average < 80) return { degree: 'Perda Auditiva Severa (Grau 4)', code: 'SEVERA' };
    if (average < 95) return { degree: 'Perda Auditiva Profunda (Grau 5)', code: 'PROFUNDA' };
    return { degree: 'Perda Auditiva Completa / Surdez (Grau 6)', code: 'COMPLETA' };
  }

  // OMS 2014 / Davis & Silverman / Lloyd & Kaplan
  const normalLimit = isChild ? 15 : 25;
  if (average <= normalLimit) return { degree: 'Audição dentro dos padrões de normalidade', code: 'NORMAL' };
  if (average <= 40) return { degree: 'Perda Auditiva de Grau Leve', code: 'LEVE' };
  if (average <= 55) return { degree: 'Perda Auditiva de Grau Moderado', code: 'MODERADA' };
  if (average <= 70) return { degree: 'Perda Auditiva de Grau Moderadamente Severo', code: 'MOD_SEVERA' };
  if (average <= 90) return { degree: 'Perda Auditiva de Grau Severo', code: 'SEVERA' };
  return { degree: 'Perda Auditiva de Grau Profundo', code: 'PROFUNDA' };
}

/**
 * Classifica o tipo de perda auditiva (Silman & Silverman, 1997 / CFFa)
 */
export function classifyType(tonalData: Partial<EarTonalData> | undefined): string {
  if (!tonalData) return 'Não avaliado';

  const allFreqs: TonalFrequency[] = ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000'];
  let countVAAltered = 0;
  let countVOAltered = 0;
  let hasSignificantGap = false;
  let validPoints = 0;

  allFreqs.forEach(freq => {
    const rawVA = tonalData[freq]?.va;
    const rawVO = tonalData[freq]?.vo;
    const va = rawVA === 'NR' ? 120 : getNumericThreshold(rawVA);
    const vo = rawVO === 'NR' ? 120 : getNumericThreshold(rawVO);

    if (va !== null) {
      validPoints++;
      if (va > 25) countVAAltered++;
      if (vo !== null) {
        if (vo > 25) countVOAltered++;
        if (va - vo >= 15) hasSignificantGap = true;
      }
    }
  });

  if (validPoints === 0) return 'Não avaliado';

  if (countVAAltered === 0) {
    return 'Audição Normal';
  }

  if (countVOAltered === 0 && hasSignificantGap) {
    return 'Condutiva';
  }

  if (countVOAltered > 0 && !hasSignificantGap) {
    return 'Neurossensorial';
  }

  if (countVOAltered > 0 && hasSignificantGap) {
    return 'Mista';
  }

  // Se VA alterada em frequências agudas (ex: 6k ou 8k) e VO não foi registrada
  return 'Neurossensorial';
}

/**
 * Classifica a configuração audiométrica (Carhart, 1945 / Silman & Silverman, 1997)
 */
export function classifyConfiguration(tonalData: Partial<EarTonalData> | undefined): string {
  if (!tonalData) return 'Não avaliado';

  const freqs: TonalFrequency[] = ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000'];
  const values = freqs.map(f => ({ freq: f, val: getNumericThreshold(tonalData[f]?.va) })).filter(item => item.val !== null) as { freq: string; val: number }[];

  if (values.length < 3) return 'Indeterminada';

  // Verifica se há entalhe acústico típico de PAIR (queda em 3k, 4k ou 6k com recuperação em 8k)
  const val3k = getNumericThreshold(tonalData['3000']?.va);
  const val4k = getNumericThreshold(tonalData['4000']?.va);
  const val6k = getNumericThreshold(tonalData['6000']?.va);
  const val8k = getNumericThreshold(tonalData['8000']?.va);
  const val2k = getNumericThreshold(tonalData['2000']?.va);

  const notchFreqVal = Math.max(val3k ?? -999, val4k ?? -999, val6k ?? -999);
  if (notchFreqVal > 25 && val8k !== null && val2k !== null && (notchFreqVal - val8k >= 10) && (notchFreqVal - val2k >= 10)) {
    return 'Entalhe Acústico (em 3, 4 ou 6 kHz)';
  }

  // Diferença entre início e fim
  const firstVal = values[0].val;
  const lastVal = values[values.length - 1].val;
  const minVal = Math.min(...values.map(v => v.val));
  const maxVal = Math.max(...values.map(v => v.val));

  // Plana / Horizontal: variação máxima menor ou igual a 10 dB entre todas as frequências
  if (maxVal - minVal <= 10) {
    return 'Horizontal / Plana';
  }

  // Descendente Leve: piora progressiva de 5 a 10 dB por oitava
  // Descendente Acentuada (Rampa): piora de 15 a 20 dB ou mais por oitava
  if (lastVal - firstVal >= 25) {
    if (lastVal - firstVal >= 40) return 'Descendente Acentuada (em Rampa)';
    return 'Descendente Leve';
  }

  // Ascendente: melhora de 5 dB ou mais por oitava em direção às agudas
  if (firstVal - lastVal >= 15) {
    return 'Ascendente';
  }

  // Curva em U (Bacia) ou U invertido (Cúpula)
  const midFreqs = values.filter(v => ['1000', '2000', '3000'].includes(v.freq));
  if (midFreqs.length > 0) {
    const avgMid = midFreqs.reduce((acc, v) => acc + v.val, 0) / midFreqs.length;
    if (avgMid - firstVal >= 15 && avgMid - lastVal >= 15) {
      return 'Em U / Em Bacia (Frequências médias rebaixadas)';
    }
    if (firstVal - avgMid >= 15 && lastVal - avgMid >= 15) {
      return 'Em U Invertido / Cúpula';
    }
  }

  return 'Irregular';
}

/**
 * Avalia se o audiograma é sugestivo de PAIR (Perda Auditiva Induzida por Ruído - NR-7 Anexo II)
 */
export function isSuggestivePAIR(
  rightData: Partial<EarTonalData> | undefined, 
  leftData: Partial<EarTonalData> | undefined
): { isPAIR: boolean; reason: string } {
  if (!rightData || !leftData) return { isPAIR: false, reason: 'Dados insuficientes' };

  const checkEarNotch = (data: Partial<EarTonalData>) => {
    const v500 = getNumericThreshold(data['500']?.va) ?? 0;
    const v1k = getNumericThreshold(data['1000']?.va) ?? 0;
    const v2k = getNumericThreshold(data['2000']?.va) ?? 0;
    const v3k = getNumericThreshold(data['3000']?.va);
    const v4k = getNumericThreshold(data['4000']?.va);
    const v6k = getNumericThreshold(data['6000']?.va);
    const v8k = getNumericThreshold(data['8000']?.va);

    const highPeak = Math.max(v3k ?? -1, v4k ?? -1, v6k ?? -1);
    if (highPeak > 25 && v8k !== null && (highPeak - v8k >= 10) && v2k <= 25 && v1k <= 25 && v500 <= 25) {
      return true;
    }
    return false;
  };

  const rightNotch = checkEarNotch(rightData);
  const leftNotch = checkEarNotch(leftData);

  if (rightNotch && leftNotch) {
    return {
      isPAIR: true,
      reason: 'Audiograma sugestivo de PAIR: Perda neurossensorial bilateral com entalhe acústico em altas frequências (3, 4 ou 6 kHz) e recuperação em 8 kHz (critérios Portaria 19/NR-7).'
    };
  }

  if (rightNotch || leftNotch) {
    return {
      isPAIR: false,
      reason: 'Entalhe unilateral: Sugere investigação clínica complementar (não característico de PAIR típica ocupacional bilateral).'
    };
  }

  return { isPAIR: false, reason: 'Padrão não sugestivo de PAIR ocupacional.' };
}

/**
 * Calculadora de Mascaramento Clínico e Detecção de Risco de Audição Cruzada
 */
export function checkMaskingNecessity(
  rightTonal: Partial<EarTonalData> | undefined,
  leftTonal: Partial<EarTonalData> | undefined,
  transducer: 'supra' | 'insert' = 'supra'
): MaskingAlert[] {
  const alerts: MaskingAlert[] = [];
  const interauralAtten = transducer === 'insert' ? 60 : 40;
  const freqs: TonalFrequency[] = ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000'];

  const occlusionEffect: Record<string, number> = {
    '250': transducer === 'supra' ? 15 : 10,
    '500': transducer === 'supra' ? 15 : 10,
    '1000': transducer === 'supra' ? 10 : 5,
    '2000': 0, '3000': 0, '4000': 0, '6000': 0, '8000': 0
  };

  freqs.forEach(f => {
    const rVA = getNumericThreshold(rightTonal?.[f]?.va);
    const rVO = getNumericThreshold(rightTonal?.[f]?.vo);
    const lVA = getNumericThreshold(leftTonal?.[f]?.va);
    const lVO = getNumericThreshold(leftTonal?.[f]?.vo);

    // 1. Mascaramento de VA Orelha Direita: se VA_OD - VO_OE >= Atenuação Interaural
    const bestContraVO_OE = lVO ?? lVA ?? 0;
    if (rVA !== null && (rVA - bestContraVO_OE >= interauralAtten)) {
      const minMasc = (lVA ?? 0) + 10;
      const maxMasc = (rVO ?? rVA) + interauralAtten - 5;
      alerts.push({
        freq: f,
        ear: 'right',
        type: 'VA',
        reason: `Risco de audição cruzada na VA em ${f}Hz (Diferença OD/OE = ${rVA - bestContraVO_OE}dB ≥ AI ${interauralAtten}dB).`,
        minMaskingDb: minMasc,
        maxMaskingDb: maxMasc,
        plateauRange: `${minMasc} a ${maxMasc} dB NBN`
      });
    }

    // 2. Mascaramento de VA Orelha Esquerda: se VA_OE - VO_OD >= Atenuação Interaural
    const bestContraVO_OD = rVO ?? rVA ?? 0;
    if (lVA !== null && (lVA - bestContraVO_OD >= interauralAtten)) {
      const minMasc = (rVA ?? 0) + 10;
      const maxMasc = (lVO ?? lVA) + interauralAtten - 5;
      alerts.push({
        freq: f,
        ear: 'left',
        type: 'VA',
        reason: `Risco de audição cruzada na VA em ${f}Hz (Diferença OE/OD = ${lVA - bestContraVO_OD}dB ≥ AI ${interauralAtten}dB).`,
        minMaskingDb: minMasc,
        maxMaskingDb: maxMasc,
        plateauRange: `${minMasc} a ${maxMasc} dB NBN`
      });
    }

    // 3. Mascaramento de VO Orelha Direita: Gap Aéreo-Ósseo >= 15 dB
    if (rVA !== null && rVO !== null && (rVA - rVO >= 15)) {
      const oe = occlusionEffect[f] || 0;
      const minMasc = (lVA ?? 0) + oe + 10;
      alerts.push({
        freq: f,
        ear: 'right',
        type: 'VO',
        reason: `Gap aéreo-ósseo significativo em ${f}Hz (OD: ${rVA - rVO}dB ≥ 15dB). Mascaramento de VO mandatório.`,
        minMaskingDb: minMasc,
        plateauRange: `A partir de ${minMasc} dB NBN (com EO: +${oe}dB)`
      });
    }

    // 4. Mascaramento de VO Orelha Esquerda: Gap Aéreo-Ósseo >= 15 dB
    if (lVA !== null && lVO !== null && (lVA - lVO >= 15)) {
      const oe = occlusionEffect[f] || 0;
      const minMasc = (rVA ?? 0) + oe + 10;
      alerts.push({
        freq: f,
        ear: 'left',
        type: 'VO',
        reason: `Gap aéreo-ósseo significativo em ${f}Hz (OE: ${lVA - lVO}dB ≥ 15dB). Mascaramento de VO mandatório.`,
        minMaskingDb: minMasc,
        plateauRange: `A partir de ${minMasc} dB NBN (com EO: +${oe}dB)`
      });
    }
  });

  return alerts;
}

/**
 * Validação de Concordância Tonal-Vocal (SRT x Média Tritonal 500-1k-2k)
 */
export function validateSpeechConcordance(
  srtVal: number | string | undefined, 
  ptaTritonal: number | null
): { isConcordant: boolean; diff: number | null; message: string; badgeColor: string } {
  const srt = getNumericThreshold(srtVal);
  if (srt === null || ptaTritonal === null) {
    return {
      isConcordant: true,
      diff: null,
      message: 'Aguardando preenchimento do SRT e limiares tonais (500, 1k, 2k Hz).',
      badgeColor: 'text-slate-500 bg-slate-100'
    };
  }

  const diff = Math.abs(srt - ptaTritonal);
  if (diff <= 10) {
    return {
      isConcordant: true,
      diff,
      message: `Excelente concordância tonal-vocal (Diferença: ${diff.toFixed(1)} dB ≤ 10 dB).`,
      badgeColor: 'text-emerald-700 bg-emerald-100 border-emerald-300'
    };
  }

  return {
    isConcordant: false,
    diff,
    message: `Discordância tonal-vocal expressiva (Diferença: ${diff.toFixed(1)} dB > 10 dB). Recomenda-se retestar limiares ou investigar componente funcional/central.`,
    badgeColor: 'text-amber-800 bg-amber-100 border-amber-300'
  };
}

/**
 * Classificação Clínica do IPRF / IRF (% de acertos)
 */
export function classifyIPRF(percentVal: number | string | undefined): { rating: string; interpretation: string; color: string } {
  const score = getNumericThreshold(percentVal);
  if (score === null) return { rating: 'Não testado', interpretation: '', color: 'text-slate-500' };

  if (score >= 92) {
    return {
      rating: 'Excelente (92% a 100%)',
      interpretation: 'Sem dificuldade de discriminação de fala em ambiente silencioso (Padrão de audição normal ou perda condutiva pura).',
      color: 'text-emerald-600'
    };
  }
  if (score >= 80) {
    return {
      rating: 'Boa (80% a 90%)',
      interpretation: 'Discreta dificuldade de compreensão, principalmente em conversação competitiva ou ruidosa.',
      color: 'text-blue-600'
    };
  }
  if (score >= 60) {
    return {
      rating: 'Moderada (60% a 78%)',
      interpretation: 'Dificuldade evidente de discriminação em conversas cotidianas (Compatível com perda neurossensorial coclear).',
      color: 'text-amber-600'
    };
  }
  if (score >= 40) {
    return {
      rating: 'Pobre (40% a 58%)',
      interpretation: 'Dificuldade acentuada na compreensão verbal.',
      color: 'text-orange-600'
    };
  }
  return {
    rating: 'Muito Pobre (< 40%)',
    interpretation: 'Incapacidade quase total de discriminação fonêmica. Forte suspeita de acometimento retrococlear ou neuropatia auditiva.',
    color: 'text-red-600'
  };
}

/**
 * Classificação Timpanométrica Automática de Jerger (1970) / Jerger & Northern
 */
export function classifyTympanometry(tympData: TympanometryData | undefined): JergerClassification {
  if (!tympData) {
    return { type: 'Inconclusivo', description: 'Sem dados', interpretation: 'Preencha os valores da timpanometria.', isNormal: false };
  }

  const peak = getNumericThreshold(tympData.peak);
  const comp = getNumericThreshold(tympData.compliance200);
  const vol = getNumericThreshold(tympData.volume);

  if (peak === null && comp === null) {
    return { type: 'Inconclusivo', description: 'Não preenchido', interpretation: 'Insira o pico de pressão e a complacência.', isNormal: false };
  }

  // Curva Tipo B: Sem pico de pressão ou curva plana (complacência < 0.20 com pressão indefinida ou ausente)
  if (comp !== null && comp < 0.20 && (peak === null || peak <= -400 || peak >= 200)) {
    if (vol !== null && vol > 2.0) {
      return {
        type: 'B',
        description: 'Curva Tipo B (Volume Aumentado)',
        interpretation: 'Curva plana com volume equivalente aumentado (> 2.0 ml), sugestivo de Perfuração da Membrana Timpânica ou Tubo de Ventilação patente.',
        isNormal: false
      };
    }
    return {
      type: 'B',
      description: 'Curva Tipo B (Efusão / OMS)',
      interpretation: 'Curva plana sem ponto de máxima complacência, sugestivo de presença de líquido na orelha média (Otite Média Secretora/Serosa).',
      isNormal: false
    };
  }

  if (peak !== null && comp !== null) {
    // Tipo C: Pressão de pico negativa significativa (< -100 daPa) com complacência normal
    if (peak < -100) {
      return {
        type: 'C',
        description: 'Curva Tipo C (Disfunção Tubária)',
        interpretation: 'Pico de pressão negativo (< -100 daPa), indicativo de disfunção da tuba auditiva / pressão negativa na orelha média.',
        isNormal: false
      };
    }

    // Pressão normal (-100 a +100 daPa)
    if (peak >= -100 && peak <= 100) {
      if (comp < 0.30) {
        return {
          type: 'As',
          description: 'Curva Tipo As / Ar (Rigidez)',
          interpretation: 'Pico de pressão normal com complacência reduzida (< 0.30 ml), sugestivo de rigidez da cadeia ossicular (ex: Otoesclerose, Timpanosclerose).',
          isNormal: false
        };
      }
      if (comp > 1.75) {
        return {
          type: 'Ad',
          description: 'Curva Tipo Ad (Hipermobilidade)',
          interpretation: 'Pico de pressão normal com complacência aumentada (> 1.75 ml), sugestivo de hipermobilidade/flacidez timpânica ou desarticulação ossicular.',
          isNormal: false
        };
      }
      return {
        type: 'A',
        description: 'Curva Tipo A (Padrão de Normalidade)',
        interpretation: 'Pressão de pico e complacência dentro dos padrões de normalidade. Mobilidade do sistema tímpano-ossicular preservada.',
        isNormal: true
      };
    }
  }

  return {
    type: 'Inconclusivo',
    description: 'Valores Atípicos',
    interpretation: 'Revise os valores inseridos de pico e complacência.',
    isNormal: false
  };
}

/**
 * Avaliação do Reflexo Estapediano e Teste de Metz (Recrutamento Coclear)
 */
export function analyzeStapedialReflexes(
  reflexData: Partial<EarReflexData> | undefined,
  tonalData: Partial<EarTonalData> | undefined,
  ear: 'right' | 'left'
): MetzTestResult[] {
  const freqs: ReflexFrequency[] = ['500', '1000', '2000', '4000'];
  const results: MetzTestResult[] = [];

  freqs.forEach(freq => {
    const reflexIpsi = getNumericThreshold(reflexData?.[freq]?.ipsi ?? reflexData?.[freq]?.limiar);
    const tonalVA = getNumericThreshold(tonalData?.[freq]?.va);

    if (reflexIpsi !== null && tonalVA !== null) {
      const sensationLevel = reflexIpsi - tonalVA;
      const hasRecruitment = sensationLevel <= 60 && sensationLevel > 0;
      let interpretation = 'Normal (sensação 70 a 100 dB)';
      if (hasRecruitment) interpretation = 'Metz Positivo: Recrutamento de Loudness (Lesão Coclear)';
      else if (sensationLevel > 100) interpretation = 'Reflexo com nível aumentado / Rebaixado';

      results.push({
        freq,
        ear,
        sensationLevel,
        hasRecruitment,
        interpretation
      });
    }
  });

  return results;
}

/**
 * Gerador Inteligente de Laudo e Parecer Fonoaudiológico Completo
 */
export function generateSmartAudiologicalReport(params: {
  rightTonal?: Partial<EarTonalData>;
  leftTonal?: Partial<EarTonalData>;
  rightLogo?: LogoAudiometryData;
  leftLogo?: LogoAudiometryData;
  rightTymp?: TympanometryData;
  leftTymp?: TympanometryData;
  meatoscopy?: Meatoscopy;
  complementary?: ComplementaryTests;
  category?: 'clinico' | 'ocupacional';
  standard?: DegreeStandard;
}): {
  clinicalSummary: string;
  rightOpinion: { type: string; degree: string; configuration: string };
  leftOpinion: { type: string; degree: string; configuration: string };
  conductSuggestion: string;
} {
  const standard = params.standard || 'OMS_2021';
  const rPta = calculatePTA(params.rightTonal);
  const lPta = calculatePTA(params.leftTonal);

  const rDeg = classifyDegree(rPta, standard);
  const lDeg = classifyDegree(lPta, standard);

  const rType = classifyType(params.rightTonal);
  const lType = classifyType(params.leftTonal);

  const rConfig = classifyConfiguration(params.rightTonal);
  const lConfig = classifyConfiguration(params.leftTonal);

  const rTympClass = classifyTympanometry(params.rightTymp);
  const lTympClass = classifyTympanometry(params.leftTymp);

  const pairAnalysis = isSuggestivePAIR(params.rightTonal, params.leftTonal);

  // Construção do Laudo Fonoaudiológico Textual
  const lines: string[] = [];

  // Orelha Direita
  if (rDeg.code === 'NORMAL' && rType === 'Audição Normal') {
    lines.push(`• Orelha Direita (OD): Audição dentro dos padrões de normalidade (Média: ${rPta.quadritonal ?? rPta.tritonal ?? '--'} dB).`);
  } else {
    lines.push(`• Orelha Direita (OD): ${rType !== 'Não avaliado' ? `Perda auditiva do tipo ${rType.toLowerCase()}` : 'Alteração audiológica'}, de grau ${rDeg.degree.toLowerCase()}, com configuração ${rConfig.toLowerCase()} (Média: ${rPta.quadritonal ?? rPta.tritonal ?? '--'} dB).`);
  }

  // Orelha Esquerda
  if (lDeg.code === 'NORMAL' && lType === 'Audição Normal') {
    lines.push(`• Orelha Esquerda (OE): Audição dentro dos padrões de normalidade (Média: ${lPta.quadritonal ?? lPta.tritonal ?? '--'} dB).`);
  } else {
    lines.push(`• Orelha Esquerda (OE): ${lType !== 'Não avaliado' ? `Perda auditiva do tipo ${lType.toLowerCase()}` : 'Alteração audiológica'}, de grau ${lDeg.degree.toLowerCase()}, com configuração ${lConfig.toLowerCase()} (Média: ${lPta.quadritonal ?? lPta.tritonal ?? '--'} dB).`);
  }

  // Logoaudiometria
  const rSrt = getNumericThreshold(params.rightLogo?.srt?.db);
  const lSrt = getNumericThreshold(params.leftLogo?.srt?.db);
  const rIrf = getNumericThreshold(params.rightLogo?.irf?.mono?.percentage);
  const lIrf = getNumericThreshold(params.leftLogo?.irf?.mono?.percentage);

  if (rSrt !== null || lSrt !== null || rIrf !== null || lIrf !== null) {
    let logoStr = '• Logoaudiometria: ';
    if (rSrt !== null) logoStr += `OD com LRF a ${rSrt} dB e IPRF de ${rIrf ?? '--'}%. `;
    if (lSrt !== null) logoStr += `OE com LRF a ${lSrt} dB e IPRF de ${lIrf ?? '--'}%.`;
    lines.push(logoStr);
  }

  // Imitanciometria
  if (rTympClass.type !== 'Inconclusivo' || lTympClass.type !== 'Inconclusivo') {
    lines.push(`• Medidas de Imitância Acústica: Timpanometria com curva tipo ${rTympClass.type} em OD e tipo ${lTympClass.type} em OE.`);
  }

  // Ocupacional
  if (params.category === 'ocupacional') {
    lines.push(`• Avaliação Ocupacional (Portaria 19/NR-7): ${pairAnalysis.reason}`);
  }

  // Conduta Sugerida
  const conducts: string[] = [];
  if (params.meatoscopy?.referToENT || params.meatoscopy?.right === 'cerumen' || params.meatoscopy?.left === 'cerumen' || params.meatoscopy?.right === 'perforation' || params.meatoscopy?.left === 'perforation') {
    conducts.push('1. Encaminhamento para avaliação com Médico Otorrinolaringologista (avaliação de conduto e conduta médica).');
  }
  if (rDeg.code !== 'NORMAL' || lDeg.code !== 'NORMAL') {
    conducts.push('2. Acompanhamento audiológico periódico e investigação etiológica.');
    if (rDeg.code === 'MODERADA' || rDeg.code === 'MOD_SEVERA' || rDeg.code === 'SEVERA' || rDeg.code === 'PROFUNDA' || lDeg.code === 'MODERADA' || lDeg.code === 'MOD_SEVERA') {
      conducts.push('3. Avaliação para indicação e adaptação de Aparelho de Amplificação Sonora Individual (AASI).');
    }
  } else {
    conducts.push('1. Manutenção dos hábitos de saúde auditiva e reavaliação periódica anual.');
  }

  if (params.category === 'ocupacional') {
    conducts.push('4. Manutenção do uso correto e fiscalização de Equipamentos de Proteção Individual (EPI Auricular) e controle do PCA.');
  }

  return {
    clinicalSummary: lines.join('\n'),
    rightOpinion: {
      type: rType,
      degree: rDeg.degree,
      configuration: rConfig
    },
    leftOpinion: {
      type: lType,
      degree: lDeg.degree,
      configuration: lConfig
    },
    conductSuggestion: conducts.join('\n')
  };
}
