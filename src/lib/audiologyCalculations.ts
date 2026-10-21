import type { EarTonalData, TonalFrequency, TympanometryData, EarReflexData, ReflexFrequency } from '@/db/db';

/**
 * Regras clínicas do AudioDash. Cada regra está descrita em docs/MATRIZ-REGRAS-CLINICAS.md
 * (identificador entre colchetes nos comentários). Validação clínica por fonoaudiólogo responsável
 * continua pendente para todas as regras; testes de software não substituem essa validação.
 */

// Classificações de grau apresentadas no Guia CFFa (2023). O profissional escolhe e cita a adotada (p. 17).
// 'OMS_2014' é a chave histórica armazenada nos exames; corresponde à graduação OMS anterior a 2021 (graus 0–4).
export type DegreeStandard = 'OMS_2021' | 'LLOYD_KAPLAN' | 'KAPLAN_1993' | 'DAVIS_1970' | 'BIAP_1996' | 'NORTHERN_DOWNS_2005' | 'OMS_2014';

export const DEGREE_STANDARD_LABELS: Record<DegreeStandard, string> = {
  OMS_2021: 'OMS 2021 · média 500/1k/2k/4k Hz (adultos e crianças)',
  LLOYD_KAPLAN: 'Lloyd e Kaplan (1978) · média 500/1k/2k Hz',
  KAPLAN_1993: 'Kaplan, Gladstone e Lloyd (1993) · média 500/1k/2k Hz',
  DAVIS_1970: 'Davis (1970) · média 500/1k/2k Hz',
  BIAP_1996: 'BIAP (1996) · média 500/1k/2k/4k Hz',
  NORTHERN_DOWNS_2005: 'Northern e Downs (2005) · crianças · média 500/1k/2k Hz',
  OMS_2014: 'OMS anterior a 2021 (graus 0–4, substituída em 2021) · média 500/1k/2k/4k Hz'
};

/**
 * Uso indicado no Guia CFFa (2023): Quadros 14–15 na seção de audiologia infantil ('child'/'both'); Quadros 3–6 sem população
 * especificada, escolhidos pelo profissional ('adult' aqui significa "não indicado pelo Guia para crianças").
 */
export const DEGREE_STANDARD_POPULATION: Record<DegreeStandard, 'adult' | 'child' | 'both'> = {
  OMS_2021: 'both', LLOYD_KAPLAN: 'adult', KAPLAN_1993: 'adult', DAVIS_1970: 'adult', BIAP_1996: 'adult', NORTHERN_DOWNS_2005: 'child', OMS_2014: 'adult'
};

/** Média usada por cada tabela. */
export const DEGREE_STANDARD_AVERAGE: Record<DegreeStandard, 'tritonal' | 'quadritonal'> = {
  OMS_2021: 'quadritonal', LLOYD_KAPLAN: 'tritonal', KAPLAN_1993: 'tritonal', DAVIS_1970: 'tritonal', BIAP_1996: 'quadritonal', NORTHERN_DOWNS_2005: 'tritonal', OMS_2014: 'quadritonal'
};

/** Limite superior da faixa "dentro do padrão" de cada tabela (média). OMS 2021 usa "< 20". */
export function isAverageWithinNormal(average: number, standard: DegreeStandard): boolean {
  switch (standard) {
    case 'OMS_2021': return average < 20;
    case 'KAPLAN_1993': case 'NORTHERN_DOWNS_2005': return average <= 15;
    case 'BIAP_1996': return average <= 20;
    default: return average <= 25;
  }
}

export function degreeStandardLabel(standard: string | undefined): string {
  return standard && standard in DEGREE_STANDARD_LABELS ? DEGREE_STANDARD_LABELS[standard as DegreeStandard] : 'não registrada';
}

export interface CalculatedPTA {
  tritonal: number | null; // 500, 1000, 2000 Hz
  quadritonal: number | null; // 500, 1000, 2000, 4000 Hz (OMS 2021 / BIAP)
  highFreqs: number | null; // 3000, 4000, 6000 Hz (grupo de frequências do Anexo II da NR-7)
  extendedHighFreqs?: number | null;
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
  isSuggestiveNoiseInduced: boolean;
}

export interface JergerClassification {
  type: 'A' | 'As' | 'Ar' | 'Ad' | 'B' | 'C' | 'D' | 'Normal' | 'Alterada' | 'Inconclusivo';
  description: string;
  interpretation: string;
  isNormal: boolean;
}

export type MetzCriterion = 'met' | 'not_met' | 'not_assessable';
export interface MetzTestResult {
  freq: ReflexFrequency;
  ear: 'right' | 'left';
  /** Diferença reflexo ipsilateral − VA da mesma orelha (descritiva). Mantido o nome histórico. */
  sensationLevel: number | null;
  /** Diferença reflexo contralateral − VA da orelha estimulada, quando a convenção das colunas é conhecida. */
  contraDifference: number | null;
  stimulatedEar: 'right' | 'left' | null;
  metzCriterion: MetzCriterion;
  interpretation: string;
}

/**
 * Converte valor numérico ou 'NR' para número real ou null
 */
export function getNumericThreshold(val: number | 'NR' | string | undefined): number | null {
  if (val === undefined || val === null || val === '' || val === 'NR') return null;
  const text = String(val).trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

/** Numeric threshold within the supported audiogram scale; NR is never a threshold. */
export function getAudiometricThreshold(value: number | string | undefined): number | null {
  const number = getNumericThreshold(value);
  return number !== null && number >= -10 && number <= 120 && number % 5 === 0 ? number : null;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const roundForDisplay = (value: number) => Math.round(value * 10) / 10;

/**
 * [AUD-MED-01] Médias de VA. Exige todas as frequências prescritas com limiar numérico; NR nunca é substituído.
 * Os valores retornados são arredondados a 0,1 dB; com limiares em passos de 5 dB isso não altera nenhuma fronteira
 * das tabelas implementadas (ver matriz).
 */
export function calculatePTA(tonalData: Partial<EarTonalData> | undefined): CalculatedPTA {
  if (!tonalData) {
    return { tritonal: null, quadritonal: null, highFreqs: null, biap: null };
  }
  const getVal = (freq: TonalFrequency) => getAudiometricThreshold(tonalData[freq]?.va);
  const average = (freqs: TonalFrequency[]) => {
    const values = freqs.map(getVal);
    return values.every((v): v is number => v !== null) ? roundForDisplay(mean(values as number[])) : null;
  };
  const quadritonal = average(['500', '1000', '2000', '4000']);
  return {
    tritonal: average(['500', '1000', '2000']),
    quadritonal,
    highFreqs: average(['3000', '4000', '6000']),
    biap: quadritonal
  };
}

/**
 * [AUD-GRAU-01..03] Faixa de grau pela média de uma orelha — Guia CFFa (2023), Quadros 3–7 (adultos) e 14–15 (crianças).
 * Não existe "grau normal"; com média dentro do padrão, não se menciona grau.
 * OMS 2021: a classificação da pessoa é feita pela melhor orelha (ver classifyWHOGlobal); aqui é a faixa da média desta orelha.
 * isChild: tabelas apresentadas pelo Guia só para adultos não são aplicadas a crianças, e Northern e Downs não é aplicada a adultos.
 */
export function classifyDegree(
  pta: CalculatedPTA,
  standard: DegreeStandard = 'OMS_2021',
  isChild = false
): { degree: string; code: string } {
  const population = DEGREE_STANDARD_POPULATION[standard] ?? 'adult';
  if (isChild && population === 'adult') return { degree: 'Para crianças, o Guia CFFa indica Northern e Downs (2005) ou OMS (Quadros 14 e 15): selecione uma delas', code: 'NA' };
  if (!isChild && population === 'child') return { degree: 'Northern e Downs (2005) é referência pediátrica: selecione uma referência para adultos', code: 'NA' };
  const useTritonal = DEGREE_STANDARD_AVERAGE[standard] === 'tritonal';
  const average = useTritonal ? pta.tritonal : pta.quadritonal;
  const needed = useTritonal ? '500, 1000 e 2000 Hz' : '500, 1000, 2000 e 4000 Hz';

  if (average === null) {
    return { degree: `Grau não calculável: requer limiar numérico de VA em ${needed}`, code: 'NA' };
  }
  const withinNormal = { degree: 'Média dentro do padrão de normalidade (sem grau)', code: 'NORMAL' };
  if (isAverageWithinNormal(average, standard)) return withinNormal;

  if (standard === 'KAPLAN_1993') {
    // Quadro 4: normal −10 a 15; discreto 16–25; leve 26–40; moderado 41–55; moderadamente severo 56–70; severo 71–90; profundo ≥ 91.
    if (average <= 25) return { degree: 'Grau discreto (Kaplan, Gladstone e Lloyd)', code: 'DISCRETA' };
    if (average <= 40) return { degree: 'Grau leve (Kaplan, Gladstone e Lloyd)', code: 'LEVE' };
    if (average <= 55) return { degree: 'Grau moderado (Kaplan, Gladstone e Lloyd)', code: 'MODERADA' };
    if (average <= 70) return { degree: 'Grau moderadamente severo (Kaplan, Gladstone e Lloyd)', code: 'MOD_SEVERA' };
    if (average <= 90) return { degree: 'Grau severo (Kaplan, Gladstone e Lloyd)', code: 'SEVERA' };
    return { degree: 'Grau profundo (Kaplan, Gladstone e Lloyd)', code: 'PROFUNDA' };
  }
  if (standard === 'DAVIS_1970') {
    // Quadro 5: normal ≤ 25; leve 26–40; moderado 41–55; marcado/acentuado 56–70; severo 71–90; profundo > 90.
    if (average <= 40) return { degree: 'Grau leve (Davis)', code: 'LEVE' };
    if (average <= 55) return { degree: 'Grau moderado (Davis)', code: 'MODERADA' };
    if (average <= 70) return { degree: 'Grau acentuado (Davis)', code: 'ACENTUADA' };
    if (average <= 90) return { degree: 'Grau severo (Davis)', code: 'SEVERA' };
    return { degree: 'Grau profundo (Davis)', code: 'PROFUNDA' };
  }
  if (standard === 'BIAP_1996') {
    // Quadro 6: normal ≤ 20; leve 21–40; moderado I 41–55, II 56–70; severo I 71–80, II 81–90; muito severo 1º 91–100, 2º 101–110, 3º 111–120; cofose > 120.
    if (average <= 40) return { degree: 'Perda leve (BIAP)', code: 'LEVE' };
    if (average <= 55) return { degree: 'Perda moderada de 1º grau (BIAP)', code: 'MODERADA' };
    if (average <= 70) return { degree: 'Perda moderada de 2º grau (BIAP)', code: 'MODERADA' };
    if (average <= 80) return { degree: 'Perda severa de 1º grau (BIAP)', code: 'SEVERA' };
    if (average <= 90) return { degree: 'Perda severa de 2º grau (BIAP)', code: 'SEVERA' };
    if (average <= 100) return { degree: 'Perda muito severa de 1º grau (BIAP)', code: 'PROFUNDA' };
    if (average <= 110) return { degree: 'Perda muito severa de 2º grau (BIAP)', code: 'PROFUNDA' };
    if (average <= 120) return { degree: 'Perda muito severa de 3º grau (BIAP)', code: 'PROFUNDA' };
    return { degree: 'Cofose (BIAP)', code: 'COMPLETA' };
  }
  if (standard === 'NORTHERN_DOWNS_2005') {
    // Quadro 14 (crianças): normal ≤ 15; discreta 16–25; leve 26–30; moderada 31–50; severa 51–70; profunda ≥ 71.
    if (average <= 25) return { degree: 'Grau discreto (Northern e Downs)', code: 'DISCRETA' };
    if (average <= 30) return { degree: 'Grau leve (Northern e Downs)', code: 'LEVE' };
    if (average <= 50) return { degree: 'Grau moderado (Northern e Downs)', code: 'MODERADA' };
    if (average <= 70) return { degree: 'Grau severo (Northern e Downs)', code: 'SEVERA' };
    return { degree: 'Grau profundo (Northern e Downs)', code: 'PROFUNDA' };
  }

  if (standard === 'OMS_2021') {
    if (average < 20) return withinNormal;
    if (average < 35) return { degree: 'Grau leve (OMS 2021)', code: 'LEVE' };
    if (average < 50) return { degree: 'Grau moderado (OMS 2021)', code: 'MODERADA' };
    if (average < 65) return { degree: 'Grau moderadamente severo (OMS 2021)', code: 'MOD_SEVERA' };
    if (average < 80) return { degree: 'Grau severo (OMS 2021)', code: 'SEVERA' };
    if (average < 95) return { degree: 'Grau profundo (OMS 2021)', code: 'PROFUNDA' };
    return { degree: 'Perda completa / surdez (OMS 2021)', code: 'COMPLETA' };
  }

  if (standard === 'OMS_2014') {
    if (average <= 25) return withinNormal;
    if (average <= 40) return { degree: 'Grau leve (OMS, graduação anterior a 2021)', code: 'LEVE' };
    if (average <= 60) return { degree: 'Grau moderado (OMS, graduação anterior a 2021)', code: 'MODERADA' };
    if (average <= 80) return { degree: 'Grau severo (OMS, graduação anterior a 2021)', code: 'SEVERA' };
    return { degree: 'Grau profundo (OMS, graduação anterior a 2021)', code: 'PROFUNDA' };
  }
  // Lloyd e Kaplan (1978), Quadro 3 do Guia CFFa (2023): média de 500, 1000 e 2000 Hz.
  if (average <= 25) return withinNormal;
  if (average <= 40) return { degree: 'Grau leve (Lloyd e Kaplan)', code: 'LEVE' };
  if (average <= 55) return { degree: 'Grau moderado (Lloyd e Kaplan)', code: 'MODERADA' };
  if (average <= 70) return { degree: 'Grau moderadamente severo (Lloyd e Kaplan)', code: 'MOD_SEVERA' };
  if (average <= 90) return { degree: 'Grau severo (Lloyd e Kaplan)', code: 'SEVERA' };
  return { degree: 'Grau profundo (Lloyd e Kaplan)', code: 'PROFUNDA' };
}

/**
 * [AUD-GRAU-04] Classificação global OMS 2021 pela melhor orelha, com a categoria unilateral
 * (melhor orelha < 20 dB e pior orelha ≥ 35 dB). Exige a média quadritonal das duas orelhas.
 */
export function classifyWHOGlobal(right: CalculatedPTA, left: CalculatedPTA): { label: string; code: string; betterEar: 'right' | 'left' | 'equal' | null } {
  const r = right.quadritonal, l = left.quadritonal;
  if (r === null || l === null) return { label: 'Classificação global OMS 2021 indisponível: requer média de 500, 1000, 2000 e 4000 Hz nas duas orelhas.', code: 'NA', betterEar: null };
  const better = Math.min(r, l), worse = Math.max(r, l);
  const betterEar = r === l ? 'equal' : r < l ? 'right' : 'left';
  if (better < 20 && worse >= 35) return { label: 'Perda auditiva unilateral (OMS 2021: melhor orelha < 20 dB e pior orelha ≥ 35 dB).', code: 'UNILATERAL', betterEar };
  const grade = classifyDegree({ ...right, quadritonal: better }, 'OMS_2021');
  return { label: grade.code === 'NORMAL' ? 'Melhor orelha com média < 20 dB (OMS 2021); verificar a outra orelha e as frequências isoladas.' : `${grade.degree} pela melhor orelha (média ${better} dB).`, code: grade.code, betterEar };
}

const TYPE_CORE: TonalFrequency[] = ['500', '1000', '2000', '4000'];
const TYPE_WITH_BONE: TonalFrequency[] = ['500', '1000', '2000', '3000', '4000'];

/**
 * [AUD-TIPO-01] Tipo de perda por orelha — Silman e Silverman (1997), Quadro 2 do Guia CFFa (2023):
 * condutiva: VO ≤ 15, VA > 25 e gap ≥ 15; neurossensorial: VO > 15, VA > 25 e gap ≤ 10; mista: VO > 15, VA > 25 e gap > 10.
 * Analisa os limiares testados (não a média). 250, 6000 e 8000 Hz não têm VO no protocolo e não determinam o tipo.
 * Limite de normalidade de 25 dB NA: referência adulta; a tela só chama esta função para adultos.
 */
export function classifyType(tonalData: Partial<EarTonalData> | undefined): string {
  if (!tonalData) return 'Não avaliado';
  const recorded = Object.values(tonalData).filter(point => point?.va !== undefined && point?.va !== null && (point.va as unknown) !== '');
  if (!recorded.length) return 'Não avaliado';
  if (recorded.some(point => point.va === 'NR')) return 'Indeterminado (ausência de resposta registrada: definir pelo profissional)';
  const va = (f: TonalFrequency) => getAudiometricThreshold(tonalData[f]?.va);
  if (TYPE_CORE.some(f => va(f) === null)) return 'Indeterminado (VA incompleta em 500, 1000, 2000 e 4000 Hz)';
  const numbers = recorded.map(point => getAudiometricThreshold(point.va));
  if (numbers.some(v => v === null)) return 'Indeterminado (limiar inválido registrado)';
  if ((numbers as number[]).every(v => v <= 25)) return 'Limiares dentro do padrão de normalidade';
  const altered = TYPE_WITH_BONE.filter(f => (va(f) ?? -Infinity) > 25);
  if (!altered.length) return 'Indeterminado (alteração restrita a frequências sem via óssea: informar frequências alteradas, sem tipo)';
  const points = altered
    .map(f => ({ f, point: tonalData[f], va: va(f)!, vo: getAudiometricThreshold(tonalData[f]?.vo) }))
    .filter(p => p.f !== '3000' || p.vo !== null);
  if (points.some(p => p.vo === null)) return 'Indeterminado (via óssea ausente ou sem resposta em frequência alterada)';
  if (points.some(p => p.vo! > p.va + 10)) return 'Indeterminado (revisar VA/VO)';
  if (points.some(p => p.va - p.vo! > 10 && !p.point?.maskedVo)) return 'Indeterminado (revisar mascaramento da VO)';
  if (points.every(p => p.vo! <= 15 && p.va - p.vo! >= 15)) return 'Condutiva';
  if (points.every(p => p.vo! > 15 && p.va - p.vo! <= 10)) return 'Neurossensorial';
  if (points.every(p => p.vo! > 15 && p.va - p.vo! > 10)) return 'Mista';
  return 'Indeterminado (padrão heterogêneo entre frequências)';
}

const OCTAVES: TonalFrequency[] = ['250', '500', '1000', '2000', '4000', '8000'];

/**
 * [AUD-CONF-01] Configuração: o Guia CFFa (2023, Quadro 8) descreve os tipos de Silman e Silverman (1997) em termos
 * qualitativos por oitava. Sem operacionalização validada, o sistema mostra as variações entre oitavas e deixa
 * a classificação ao profissional.
 */
export function classifyConfiguration(tonalData: Partial<EarTonalData> | undefined): string {
  if (!tonalData) return 'Não avaliada';
  const steps: string[] = [];
  for (let i = 1; i < OCTAVES.length; i++) {
    const a = getAudiometricThreshold(tonalData[OCTAVES[i - 1]]?.va), b = getAudiometricThreshold(tonalData[OCTAVES[i]]?.va);
    if (a !== null && b !== null) steps.push(`${OCTAVES[i - 1]}→${OCTAVES[i]}: ${b - a > 0 ? '+' : ''}${b - a} dB`);
  }
  if (steps.length < 2) return 'Indeterminada (dados insuficientes)';
  return `Variação de VA entre oitavas (positivo = limiar pior): ${steps.join('; ')}. Classificar pelo Quadro 8 do Guia CFFa (Silman e Silverman, 1997).`;
}

// ---------------------------------------------------------------------------------------------
// NR-7, Anexo II (Portaria SEPRT 6.734/2020). Critérios descritivos; o diagnóstico conclusivo,
// diferencial e a aptidão cabem ao médico do trabalho (item 6).
// ---------------------------------------------------------------------------------------------
export const NR7_FREQUENCIES: TonalFrequency[] = ['500', '1000', '2000', '3000', '4000', '6000', '8000'];
export type NR7AudiogramStatus = 'not_assessable' | 'acceptable' | 'suggestive' | 'suggestive_air_only' | 'not_suggestive';
export interface NR7AudiogramResult { status: NR7AudiogramStatus; reason: string; }

/** [OCU-NR7-01] Item 5.1 (limites aceitáveis) e 5.2/5.2.1 (sugestivo de PAINPSE) para uma orelha. */
export function assessNR7Audiogram(ear: Partial<EarTonalData> | undefined): NR7AudiogramResult {
  const va = (f: TonalFrequency) => getAudiometricThreshold(ear?.[f]?.va);
  const missing = NR7_FREQUENCIES.filter(f => va(f) === null);
  if (missing.length) return { status: 'not_assessable', reason: `Não avaliável pelo Anexo II: VA sem limiar numérico em ${missing.join(', ')} Hz (item 3.6 exige 500 a 8000 Hz).` };
  if (NR7_FREQUENCIES.every(f => va(f)! <= 25)) return { status: 'acceptable', reason: 'Limiares ≤ 25 dB NA em 500–8000 Hz: dentro dos limites aceitáveis (item 5.1).' };
  const high: TonalFrequency[] = ['3000', '4000', '6000'];
  const others: TonalFrequency[] = ['500', '1000', '2000', '8000'];
  const peak = Math.max(...high.map(f => va(f)!));
  const otherMax = Math.max(...others.map(f => va(f)!));
  if (!(peak > 25 && peak > otherMax)) return { status: 'not_suggestive', reason: 'Alteração que não atende ao item 5.2 (3, 4 e/ou 6 kHz > 25 dB NA e mais elevados que as demais frequências): não sugestiva de PAINPSE (item 5.2.1).' };
  const boneFreqs = high.filter(f => f !== '6000' && va(f)! > 25);
  const vo = (f: TonalFrequency) => getAudiometricThreshold(ear?.[f]?.vo);
  const bonePeakValues = boneFreqs.map(vo).filter((v): v is number => v !== null);
  const boneOtherValues = (['500', '1000', '2000'] as TonalFrequency[]).map(vo).filter((v): v is number => v !== null);
  if (!bonePeakValues.length || !boneOtherValues.length) return { status: 'suggestive_air_only', reason: 'VA atende ao padrão do item 5.2. O item refere o padrão também na via óssea: registre VO (500–4000 Hz) para completar a análise descritiva.' };
  const bonePeak = Math.max(...bonePeakValues);
  if (bonePeak > 25 && bonePeak > Math.max(...boneOtherValues)) return { status: 'suggestive', reason: 'Padrão descrito no item 5.2 (VA e VO): sugestivo de PAINPSE. Diagnóstico conclusivo e aptidão cabem ao médico do trabalho (item 6).' };
  return { status: 'not_suggestive', reason: 'VA atende ao padrão do item 5.2, mas a VO registrada não reproduz o padrão: não atende ao item 5.2 nesta análise descritiva.' };
}

export type NR7ComparisonStatus = 'not_assessable' | 'triggering' | 'no_triggering' | 'aggravation' | 'no_aggravation' | 'out_of_scope';
export interface NR7Comparison {
  status: NR7ComparisonStatus;
  reason: string;
  meanShift346: number | null;
  meanShift05to2: number | null;
  frequencyShifts: Partial<Record<TonalFrequency, number>>;
}

/** [OCU-NR7-02] Comparação exame de referência × sequencial por orelha: desencadeamento (5.3/5.3.1) e agravamento (5.4). */
export function compareNR7(reference: Partial<EarTonalData> | undefined, sequential: Partial<EarTonalData> | undefined): NR7Comparison {
  const ref = assessNR7Audiogram(reference), seq = assessNR7Audiogram(sequential);
  const empty = { meanShift346: null, meanShift05to2: null, frequencyShifts: {} };
  if (ref.status === 'not_assessable' || seq.status === 'not_assessable') return { status: 'not_assessable', reason: `Comparação indisponível. Referência: ${ref.reason} Sequencial: ${seq.reason}`, ...empty };
  const r = (f: TonalFrequency) => getAudiometricThreshold(reference?.[f]?.va)!;
  const s = (f: TonalFrequency) => getAudiometricThreshold(sequential?.[f]?.va)!;
  const frequencyShifts = Object.fromEntries(NR7_FREQUENCIES.map(f => [f, s(f) - r(f)])) as Partial<Record<TonalFrequency, number>>;
  const group = (freqs: TonalFrequency[]) => mean(freqs.map(s)) - mean(freqs.map(r));
  const meanShift346 = group(['3000', '4000', '6000']);
  const meanShift05to2 = group(['500', '1000', '2000']);
  const values = { meanShift346: roundForDisplay(meanShift346), meanShift05to2: roundForDisplay(meanShift05to2), frequencyShifts };
  if (ref.status === 'acceptable') {
    const isolated = (['3000', '4000', '6000'] as TonalFrequency[]).filter(f => frequencyShifts[f]! >= 15);
    const met = meanShift346 >= 10 || isolated.length > 0;
    const item = seq.status === 'acceptable' ? '5.3' : '5.3.1';
    return met
      ? { status: 'triggering', reason: `Critério de desencadeamento atingido (item ${item}): ${meanShift346 >= 10 ? `média de 3, 4 e 6 kHz piorou ${roundForDisplay(meanShift346)} dB (≥ 10)` : ''}${meanShift346 >= 10 && isolated.length ? '; ' : ''}${isolated.length ? `piora ≥ 15 dB em ${isolated.join(', ')} Hz` : ''}. O sequencial passa a ser o novo referencial (item 5.5.1). Conclusão cabe ao médico do trabalho.`, ...values }
      : { status: 'no_triggering', reason: 'Critérios de desencadeamento (item 5.3) não atingidos.', ...values };
  }
  if (ref.status === 'suggestive') {
    const isolated = NR7_FREQUENCIES.filter(f => frequencyShifts[f]! >= 15);
    const met = meanShift05to2 >= 10 || meanShift346 >= 10 || isolated.length > 0;
    return met
      ? { status: 'aggravation', reason: `Critério numérico de agravamento atingido (item 5.4) — aplicável se a PAINPSE estiver confirmada pelo médico do trabalho: ${[meanShift05to2 >= 10 ? `média 0,5–2 kHz +${roundForDisplay(meanShift05to2)} dB` : '', meanShift346 >= 10 ? `média 3–6 kHz +${roundForDisplay(meanShift346)} dB` : '', isolated.length ? `piora ≥ 15 dB em ${isolated.join(', ')} Hz` : ''].filter(Boolean).join('; ')}.`, ...values }
      : { status: 'no_aggravation', reason: 'Critérios numéricos de agravamento (item 5.4) não atingidos.', ...values };
  }
  return { status: 'out_of_scope', reason: `Referência ${ref.status === 'suggestive_air_only' ? 'com padrão sugestivo apenas na VA (VO incompleta)' : 'alterada sem padrão sugestivo'}: os critérios dos itens 5.3 e 5.4 não se aplicam diretamente. Comparar e interpretar clinicamente.`, ...values };
}

/** @deprecated Mantido para compatibilidade; use assessNR7Audiogram. */
export function isSuggestivePAIR(
  rightData: Partial<EarTonalData> | undefined,
  leftData: Partial<EarTonalData> | undefined
): { isPAIR: boolean; reason: string } {
  const right = assessNR7Audiogram(rightData), left = assessNR7Audiogram(leftData);
  return { isPAIR: right.status === 'suggestive' || left.status === 'suggestive', reason: `OD: ${right.reason} OE: ${left.reason}` };
}

/**
 * [AUD-MASC-01] Alertas de mascaramento — BSA (2018), §8.6, regras 1–3. Usa limiares sem mascaramento.
 * Regra 2: VO sem mascaramento melhor que a VA de qualquer orelha em ≥ 10 dB.
 */
export function checkMaskingNecessity(
  rightTonal: Partial<EarTonalData> | undefined,
  leftTonal: Partial<EarTonalData> | undefined,
  transducer: 'supra' | 'insert' = 'supra',
  protocol?: 'BSA_2018'
): MaskingAlert[] {
  const alerts: MaskingAlert[] = [];
  if (protocol !== 'BSA_2018') return alerts;
  const ia = transducer === 'insert' ? 55 : 40;
  const freqs: TonalFrequency[] = ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000'];
  const initial = (data: Partial<EarTonalData> | undefined, freq: TonalFrequency, via: 'va' | 'vo') => {
    const p = data?.[freq];
    const saved = via === 'va' ? p?.unmaskedVa : p?.unmaskedVo;
    return getAudiometricThreshold(saved ?? (p?.[via === 'va' ? 'maskedVa' : 'maskedVo'] ? undefined : p?.[via]));
  };
  for (const [ear, own, contra] of [['right', rightTonal, leftTonal], ['left', leftTonal, rightTonal]] as const) {
    for (const freq of freqs) {
      const va = initial(own, freq, 'va'), contraVA = initial(contra, freq, 'va');
      const vo = initial(own, freq, 'vo'), contraVO = initial(contra, freq, 'vo');
      const bones = [vo, contraVO].filter((v): v is number => v !== null);
      const rule1 = va !== null && contraVA !== null && va - contraVA >= ia;
      const rule3 = !rule1 && va !== null && contraVO !== null && va - contraVO >= ia;
      if ((rule1 || rule3) && !own?.[freq]?.maskedVa) alerts.push({ ear, freq, type: 'VA', reason: `BSA 2018, §8.6: revisar mascaramento de VA em ${freq} Hz (regra ${rule1 ? '1' : '3'}, diferença ≥ ${ia} dB). Confirmar posicionamento e protocolo.` });
      if (va !== null && bones.length && va - Math.min(...bones) >= 10 && !own?.[freq]?.maskedVo) alerts.push({ ear, freq, type: 'VO', reason: `BSA 2018, §8.6, regra 2: VO sem mascaramento ≥ 10 dB melhor que a VA desta orelha em ${freq} Hz. A VO sem mascaramento pode refletir a outra cóclea.` });
    }
  }
  return alerts;
}

/**
 * [FALA-LRF-01] Diferença LRF − média tritonal. A ASHA (1988) espera concordância próxima, sem limite numérico;
 * o Guia CFFa (2023) não define critério. O sistema mostra a diferença e não emite veredito.
 */
export function validateSpeechConcordance(
  srtVal: number | string | undefined,
  ptaTritonal: number | null
): { isConcordant: boolean | null; diff: number | null; message: string; badgeColor: string } {
  const srt = getNumericThreshold(srtVal);
  if (srt === null || ptaTritonal === null) {
    return {
      isConcordant: null,
      diff: null,
      message: 'Diferença LRF − média tritonal indisponível: requer LRF e limiares numéricos em 500, 1000 e 2000 Hz.',
      badgeColor: 'text-slate-500 bg-slate-100'
    };
  }
  const diff = roundForDisplay(srt - ptaTritonal);
  return {
    isConcordant: null,
    diff,
    message: `Diferença LRF − média tritonal: ${diff > 0 ? '+' : ''}${diff} dB. Espera-se concordância próxima (ASHA, 1988); o limite de tolerância depende da referência adotada pelo profissional. Diferenças amplas pedem revisão de instruções, material e condições de resposta.`,
    badgeColor: 'text-slate-700 bg-slate-50 border-slate-200'
  };
}

/**
 * Classificação Clínica do IPRF / IRF (% de acertos)
 */
export function classifyIPRF(percentVal: number | string | undefined): { rating: string; interpretation: string; color: string } {
  const score = getNumericThreshold(percentVal);
  if (score === null) return { rating: 'Não avaliado', interpretation: '', color: 'text-slate-500' };
  if (score < 0 || score > 100) return { rating: 'Valor inválido (0–100%)', interpretation: 'Revise os acertos e o total de itens apresentados.', color: 'text-red-600' };
  return { rating: `${score}% de reconhecimento`, interpretation: 'Interpretar conforme material, intensidade, idioma e condições de apresentação. O percentual isolado não determina etiologia.', color: 'text-slate-700' };
}

const JERGER_226 = ['A', 'As', 'Ar', 'Ad', 'B', 'C'];

/**
 * [IMIT-TIMP-01] Classificação timpanométrica informada pelo profissional.
 * SBFa (2025): Jerger aplica-se à sonda de 226 Hz em orelhas não operadas; com 1000 Hz, curvas classificadas
 * apenas como normais ou alteradas. O sistema não classifica a curva automaticamente.
 */
export function classifyTympanometry(tympData: TympanometryData | undefined, _adultProtocol = false): JergerClassification {
  const pending: JergerClassification = { type: 'Inconclusivo', description: 'Aguardando interpretação documentada', interpretation: 'Informe a unidade, a sonda, a referência normativa e a classificação da curva medida. Não há limites numéricos universais neste módulo.', isNormal: false };
  if (!tympData) return pending;
  for (const field of ['peak', 'compliance200', 'volume'] as const) {
    const raw = tympData[field];
    if (raw !== undefined && raw !== '' && (getNumericThreshold(raw) === null || (field !== 'peak' && getNumericThreshold(raw)! < 0))) return { ...pending, description: 'Medida inválida', interpretation: 'Confira o valor e a unidade registrados.' };
  }
  const type = tympData.recordedType;
  if (type && tympData.probeFrequency === '1000' && JERGER_226.includes(type)) return { ...pending, description: 'Classificação incompatível com a sonda', interpretation: 'A classificação de Jerger aplica-se à sonda de 226 Hz (SBFa, 2025). Para 1000 Hz, registre curva normal ou alterada conforme a referência adotada.' };
  if (type && tympData.probeFrequency === '226' && (type === 'Normal' || type === 'Alterada')) return { ...pending, description: 'Classificação incompatível com a sonda', interpretation: 'Para 226 Hz, registre o tipo de curva (Jerger) conforme a referência adotada.' };
  if (type && tympData.normativeReference?.trim() && tympData.probeFrequency && tympData.admittanceUnit) {
    const label = type === 'Normal' || type === 'Alterada' ? `Curva ${type.toLowerCase()} (sonda ${tympData.probeFrequency} Hz, informada pelo profissional)` : `Tipo ${type === 'As' ? 'As (Ar)' : type} (informado pelo profissional)`;
    return { type, description: label, interpretation: `Referência informada: ${tympData.normativeReference}. Correlacionar com inspeção e demais procedimentos.`, isNormal: false };
  }
  return pending;
}

/**
 * [IMIT-REF-01] Reflexos: diferença ipsilateral − VA (descritiva) e critério numérico de Metz
 * (SBFa 2025: VA da orelha estimulada − limiar do reflexo contralateral ≤ 60 dB). O Metz só é calculado
 * quando a convenção das colunas (orelha estimulada ou orelha da sonda) foi registrada.
 */
export function analyzeStapedialReflexes(
  reflexData: Partial<EarReflexData> | undefined,
  tonalData: Partial<EarTonalData> | undefined,
  ear: 'right' | 'left',
  options: { convention?: '' | 'stimulated' | 'probe'; otherEarTonal?: Partial<EarTonalData> } = {}
): MetzTestResult[] {
  const freqs: ReflexFrequency[] = ['500', '1000', '2000', '4000'];
  const results: MetzTestResult[] = [];
  const stimulatedEar = options.convention === 'stimulated' ? ear : options.convention === 'probe' ? (ear === 'right' ? 'left' : 'right') : null;
  const stimulatedTonal = options.convention === 'stimulated' ? tonalData : options.convention === 'probe' ? options.otherEarTonal : undefined;

  freqs.forEach(freq => {
    const reflexIpsi = getNumericThreshold(reflexData?.[freq]?.ipsi ?? reflexData?.[freq]?.limiar);
    const reflexContra = getNumericThreshold(reflexData?.[freq]?.contra);
    const tonalVA = getAudiometricThreshold(tonalData?.[freq]?.va);
    const sensationLevel = reflexIpsi !== null && tonalVA !== null ? reflexIpsi - tonalVA : null;
    const stimulatedVA = getAudiometricThreshold(stimulatedTonal?.[freq]?.va);
    const contraDifference = reflexContra !== null && stimulatedVA !== null ? reflexContra - stimulatedVA : null;
    if (sensationLevel === null && contraDifference === null && reflexContra === null) return;

    const parts: string[] = [];
    if (sensationLevel !== null) parts.push(sensationLevel <= 0 ? 'Inconsistência: reflexo ipsilateral igual ou inferior ao limiar tonal. Revisar os dados.' : `Diferença reflexo ipsilateral − VA: ${sensationLevel} dB.`);
    let metzCriterion: MetzCriterion = 'not_assessable';
    if (reflexContra !== null && !stimulatedEar) parts.push('Metz não calculado: registre se as colunas indicam a orelha estimulada ou a orelha da sonda.');
    else if (contraDifference !== null && stimulatedEar) {
      if (contraDifference <= 0) parts.push('Inconsistência: reflexo contralateral igual ou inferior ao limiar tonal da orelha estimulada.');
      else {
        metzCriterion = contraDifference <= 60 ? 'met' : 'not_met';
        parts.push(`Contralateral (estímulo ${stimulatedEar === 'right' ? 'OD' : 'OE'}) − VA da orelha estimulada: ${contraDifference} dB; critério numérico de Metz (≤ 60 dB, SBFa 2025) ${metzCriterion === 'met' ? 'atingido' : 'não atingido'}. Interpretar com o tipo de perda e demais achados; não é diagnóstico isolado.`);
      }
    }
    results.push({ freq, ear, sensationLevel, contraDifference, stimulatedEar, metzCriterion, interpretation: parts.join(' ') || 'Interpretar em conjunto com as condições de pesquisa.' });
  });

  return results;
}
