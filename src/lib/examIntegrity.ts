import { assessRetest1000, calculateRecognitionScore } from './clinicalProtocol';
import { calculatePTA, NR7_FREQUENCIES, DEGREE_STANDARD_AVERAGE, isAverageWithinNormal } from './audiologyCalculations';
import type { Audiometry, ExamHeader, TonalPoint, TonalFrequency } from '@/db/db';

export const CLINICAL_RULES_VERSION = '2026-10-21.4';

/**
 * Elegibilidade única (tela, resumo e exportações) para aplicar as tabelas adultas de tipo e grau.
 * Crianças continuam com classificação definida pelo profissional; a matriz registra a pendência pediátrica.
 */
export function adultTablesEligibility(header: Partial<ExamHeader> | undefined, ageYears: number | undefined): { eligible: boolean; reason: string } {
  if (ageYears === undefined) return { eligible: false, reason: 'Idade no exame indisponível (verifique a data de nascimento).' };
  if (ageYears < 18) return { eligible: false, reason: 'Paciente com menos de 18 anos: classificação definida pelo profissional conforme idade, método e referência pediátrica.' };
  if (!header?.degreeStandard) return { eligible: false, reason: 'Selecione a referência de classificação.' };
  if (header.responseType !== 'threshold') return { eligible: false, reason: 'Tipo de resposta não é limiar auditivo: médias e grau não são aplicados a níveis mínimos de resposta.' };
  if (header.reliability !== 'good') return { eligible: false, reason: 'Confiabilidade não registrada como boa.' };
  if (!['conventional', 'play'].includes(header.assessmentMethod || '')) return { eligible: false, reason: 'Método não registrado como audiometria convencional ou lúdica condicionada.' };
  return { eligible: true, reason: '' };
}

/**
 * Elegibilidade da sugestão de GRAU (adultos e crianças). Exige limiares confiáveis; a tabela adequada à idade é
 * verificada em classifyDegree (Guia CFFa 2023: Quadros 14–15 para crianças). O TIPO continua só para adultos.
 */
export function degreeEligibility(header: Partial<ExamHeader> | undefined, ageYears: number | undefined): { eligible: boolean; isChild: boolean; reason: string } {
  if (ageYears === undefined) return { eligible: false, isChild: false, reason: 'Idade no exame indisponível (verifique a data de nascimento).' };
  const isChild = ageYears < 18;
  if (!header?.degreeStandard) return { eligible: false, isChild, reason: 'Selecione a referência de classificação.' };
  if (header.responseType !== 'threshold') return { eligible: false, isChild, reason: 'Tipo de resposta não é limiar auditivo: grau não é aplicado a níveis mínimos de resposta.' };
  if (header.reliability !== 'good') return { eligible: false, isChild, reason: 'Confiabilidade não registrada como boa.' };
  if (!['conventional', 'play'].includes(header.assessmentMethod || '')) return { eligible: false, isChild, reason: 'Método não registrado como audiometria convencional ou lúdica condicionada.' };
  return { eligible: true, isChild, reason: '' };
}

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function ageAtExam(birthDate: string | undefined, examDate: string) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  const exam = new Date(`${examDate}T12:00:00`);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(exam.getTime()) || localDate(birth) !== birthDate || localDate(exam) !== examDate || exam < birth) return null;
  let years = exam.getFullYear() - birth.getFullYear();
  if (exam.getMonth() < birth.getMonth() || (exam.getMonth() === birth.getMonth() && exam.getDate() < birth.getDate())) years--;
  const months = (exam.getFullYear() - birth.getFullYear()) * 12 + exam.getMonth() - birth.getMonth() - (exam.getDate() < birth.getDate() ? 1 : 0);
  const days = Math.round((Date.UTC(exam.getFullYear(), exam.getMonth(), exam.getDate()) - Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate())) / 86400000);
  return { years, months, days, label: months < 1 ? `${days} dias` : years < 2 ? `${months} meses` : `${years} anos` };
}

export function hasRecordedValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '' || value === false) return false;
  if (Array.isArray(value)) return value.some(hasRecordedValue);
  if (typeof value === 'object') return Object.values(value).some(hasRecordedValue);
  return true;
}

// Canonical serialization also survives JSON round-trips and property reordering in cloud storage.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}

export function reviewSignature(exam: Partial<Audiometry>): string {
  const { workflowStatus: _status, reviewedSignature: _signature, reviewedAt: _time, ...opinion } = exam.opinion || {};
  return JSON.stringify(canonical({ patientId: exam.patientId, examDate: exam.examDate, header: exam.header, examCategory: exam.examCategory, examPurpose: exam.examPurpose, meatoscopy: exam.meatoscopy, tonalData: exam.tonalData, tonalMasking: exam.tonalMasking, freeField: exam.freeField, logoAudiometry: exam.logoAudiometry, tympanometry: exam.tympanometry, reflexes: exam.reflexes, complementary: exam.complementary, opinion, resultAndConduct: exam.resultAndConduct }));
}

export const CLINICAL_STATUS_LABELS: Record<string, string> = {
  normal_bilateral: 'Dentro dos critérios de normalidade bilateral',
  altered: 'Alteração audiológica',
  inconclusive: 'Inconclusivo / avaliação incompleta'
};

/** Tipo, grau e configuração registrados pelo profissional (campos do parecer), para todas as exportações. */
export function professionalClassificationLines(exam: Partial<Audiometry>): string[] {
  const o = exam.opinion || {};
  const lines: string[] = [];
  for (const [label, type, degree, configuration] of [['OD', o.lossTypeRight, o.lossDegreeRight, o.configurationRight], ['OE', o.lossTypeLeft, o.lossDegreeLeft, o.configurationLeft]] as const) {
    const parts = [type && `tipo: ${type}`, degree && `grau: ${degree}`, configuration && `configuração: ${configuration}`].filter(Boolean);
    if (parts.length) lines.push(`${label} — ${parts.join('; ')}`);
  }
  return lines;
}

/** Identificação do profissional do exame; usa o cadastro em Configurações só quando o exame não informa. */
export function examProfessional(exam: Partial<Audiometry>, settings?: { professionalName?: string; crfaNumber?: string }): string {
  const fromExam = exam.header?.speechTherapist?.trim();
  if (fromExam) return fromExam;
  if (settings?.professionalName) return `${settings.professionalName}${settings.crfaNumber ? ` · CRFa ${settings.crfaNumber}` : ''}`;
  return 'Fonoaudiólogo(a) responsável não identificado(a)';
}

export function isReviewCurrent(exam: Partial<Audiometry>): boolean {
  return exam.header?.clinicalRulesVersion === CLINICAL_RULES_VERSION && exam.opinion?.workflowStatus === 'reviewed' && exam.opinion.reviewedSignature === reviewSignature(exam);
}

export function noResponseLevel(point: TonalPoint | undefined, via: 'va' | 'vo'): number | null {
  const value = via === 'va' ? point?.nrLevelVa : point?.nrLevelVo;
  return typeof value === 'number' && Number.isFinite(value) && value >= -10 && value <= 120 && value % 5 === 0 ? value : null;
}

export function formatTonalValue(point: TonalPoint | undefined, via: 'va' | 'vo'): string | number {
  if (point?.[via] !== 'NR') return point?.[via] ?? '-';
  const level = noResponseLevel(point, via);
  return level === null ? 'NR (nível não informado)' : `NR a ${level} dB NA`;
}

export function getReviewIssues(exam: Partial<Audiometry>): string[] {
  const issues: string[] = [];
  if (!exam.patientId) issues.push('Selecione o paciente.');
  if (!exam.examDate || !ageAtExam(exam.examDate, exam.examDate) || exam.examDate > localDate()) issues.push('Informe uma data de exame válida, até hoje.');
  if (!exam.header?.speechTherapist?.trim()) issues.push('Identifique o profissional responsável e o CRFa.');
  if (!exam.header?.degreeStandard) issues.push('Selecione a referência de classificação utilizada neste exame.');
  if (!exam.header?.assessmentMethod || !exam.header?.responseType || !exam.header?.reliability) issues.push('Informe método, tipo de resposta e confiabilidade.');
  if (!exam.resultAndConduct?.trim()) issues.push('Redija ou revise o parecer e a conduta.');
  if (!exam.opinion?.clinicalStatus) issues.push('Selecione a situação clínica revisada.');
  for (const [ear, data] of Object.entries({ OD: exam.tonalData?.right, OE: exam.tonalData?.left, 'Campo livre': exam.freeField })) {
    for (const [freq, point] of Object.entries(data || {})) {
      for (const via of ['va', 'vo'] as const) {
        const value = point[via];
        if (value === 'NR' && noResponseLevel(point, via) === null) issues.push(`${ear}, ${freq} Hz, ${via.toUpperCase()}: informe o nível apresentado sem resposta.`);
        if (typeof value === 'number' && (!Number.isFinite(value) || value < -10 || value > 120 || value % 5 !== 0)) issues.push(`${ear}, ${freq} Hz: limiar inválido.`);
      }
    }
  }
  for (const ear of ['right', 'left'] as const) {
    const label = ear === 'right' ? 'OD' : 'OE';
    const logo = exam.logoAudiometry?.[ear];
    if (hasRecordedValue(logo)) {
      if (!logo?.language?.trim() || !logo?.materialReference?.trim() || !logo?.presentation || !logo?.responseMode?.trim()) issues.push(`${label}: documente idioma, material, apresentação e forma de resposta da logoaudiometria.`);
    }
    for (const point of Object.values(logo?.irf || {})) {
      const hasCounts = point.correctItems !== undefined || point.totalItems !== undefined;
      if (hasCounts) {
        const result = calculateRecognitionScore(point.correctItems, point.totalItems);
        if (result.issue) issues.push(`${label}: ${result.issue}`);
        else if (!hasRecordedValue(point.percentage) || Math.abs(Number(point.percentage) - result.percent!) > 0.005) issues.push(`${label}: percentual do IPRF não corresponde à contagem registrada.`);
      }
      if ((hasCounts || hasRecordedValue(point.percentage)) && !point.listId?.trim()) issues.push(`${label}: identifique a lista aplicada no IPRF.`);
      if (hasRecordedValue(point.percentage)) {
        const score = Number(String(point.percentage).replace(',', '.'));
        if (!Number.isFinite(score) || score < 0 || score > 100) issues.push(`${label}: IPRF deve estar entre 0 e 100%.`);
        if (!hasRecordedValue(point.db)) issues.push(`${label}: informe a intensidade de apresentação do IPRF.`);
      }
    }
    const tymp = exam.tympanometry?.[ear];
    if (hasRecordedValue(tymp)) {
      if (!tymp?.admittanceUnit || !tymp?.normativeReference?.trim()) issues.push(`${label}: informe unidade de admitância e referência normativa da timpanometria.`);
      if (tymp?.probeFrequency === '1000' && tymp.admittanceUnit === 'ml') issues.push(`${label}: para sonda de 1000 Hz, registre a admitância em mmho; ml equivalente está reservado ao registro em 226 Hz neste módulo.`);
      if (!tymp?.probeFrequency || !tymp.curveShape) issues.push(`${label}: informe sonda e presença/ausência de pico na timpanometria.`);
      for (const field of ['peak', 'compliance200', 'volume'] as const) {
        const raw = tymp?.[field];
        if (!hasRecordedValue(raw)) {
          if ((field === 'peak' && tymp?.curveShape !== 'flat') || (field === 'compliance200' && tymp?.curveShape !== 'flat') || (field === 'volume' && tymp?.probeFrequency === '226')) issues.push(`${label}: complete as medidas da timpanometria.`);
        } else {
          const number = Number(String(raw).replace(',', '.'));
          if (!Number.isFinite(number) || (field !== 'peak' && number < 0)) issues.push(`${label}: medida timpanométrica inválida.`);
        }
      }
    }
  }
  if (hasRecordedValue(exam.complementary?.eoa) && (!exam.complementary?.eoa?.type || !exam.complementary.eoa.protocol?.trim() || !exam.complementary.eoa.quality?.trim())) issues.push('EOA: documente tipo, protocolo/critério e qualidade do registro.');
  if (hasRecordedValue(exam.complementary?.bera) && (!exam.complementary?.bera?.protocol?.trim() || !exam.complementary.bera.stimulus?.trim() || !exam.complementary.bera.levelAndUnit?.trim())) issues.push('PEATE: documente protocolo, estímulo, nível e unidade do registro original.');
  if (exam.header?.audiometryProtocol === 'BSA_2018') {
    for (const ear of ['right', 'left'] as const) {
      const point = exam.tonalData?.[ear]?.['1000'];
      const retest = exam.header.retest1000?.[ear];
      if (hasRecordedValue(retest)) {
        if (assessRetest1000(exam.header.retest1000?.[ear === 'right' ? 'initialRight' : 'initialLeft'] ?? point?.unmaskedVa ?? point?.va, retest).difference === null) issues.push('Reteste de 1 kHz inválido ou sem limiar inicial numérico comparável.');
        if (assessRetest1000(exam.header.retest1000?.[ear === 'right' ? 'initialRight' : 'initialLeft'] ?? point?.unmaskedVa ?? point?.va, retest).requiresReview && !exam.header.retest1000?.notes?.trim()) issues.push('Documente a investigação da diferença maior que 5 dB no reteste de 1 kHz (BSA 2018).');
      }
    }
  }
  if (hasRecordedValue(exam.freeField) && !exam.header?.freeFieldCondition?.trim()) issues.push('Descreva a condição do campo livre (com/sem dispositivos e estímulo).');
  if (exam.opinion?.clinicalStatus && exam.opinion.clinicalStatus !== 'inconclusive' && (!exam.meatoscopy?.right || !exam.meatoscopy?.left)) issues.push('Registre a inspeção de ambas as orelhas antes de confirmar a conclusão.');
  if (exam.opinion?.clinicalStatus === 'altered' && !hasRecordedValue([exam.tonalData, exam.freeField, exam.logoAudiometry, exam.tympanometry, exam.reflexes, exam.complementary])) issues.push('Registre os resultados que sustentam a alteração audiológica.');
  for (const ear of ['right', 'left'] as const) {
    const label = ear === 'right' ? 'OD' : 'OE';
    const type = exam.tympanometry?.[ear]?.recordedType;
    const probe = exam.tympanometry?.[ear]?.probeFrequency;
    if (type && probe === '1000' && ['A', 'As', 'Ar', 'Ad', 'B', 'C'].includes(type)) issues.push(`${label}: a classificação de Jerger aplica-se à sonda de 226 Hz; para 1000 Hz registre curva normal ou alterada (SBFa, 2025).`);
    if (type && probe === '226' && (type === 'Normal' || type === 'Alterada')) issues.push(`${label}: para sonda de 226 Hz registre o tipo de curva (Jerger).`);
  }
  if (Object.values({ ...exam.reflexes?.right, ...exam.reflexes?.left }).some(point => hasRecordedValue(point?.contra)) && !exam.reflexes?.earConvention) issues.push('Reflexos: informe se as colunas OD/OE indicam a orelha estimulada ou a orelha da sonda.');
  if (exam.examCategory === 'ocupacional') {
    for (const ear of ['right', 'left'] as const) {
      const missing = NR7_FREQUENCIES.filter(freq => exam.tonalData?.[ear]?.[freq]?.va === undefined);
      if (missing.length) issues.push(`${ear === 'right' ? 'OD' : 'OE'}: NR-7, Anexo II, item 3.6 — registre a VA em ${missing.join(', ')} Hz.`);
    }
    if (!exam.header?.auditoryRest14h) issues.push('NR-7, Anexo II, item 3.4: confirme o repouso auditivo mínimo de 14 horas (ou registre a condição no parecer e desmarque a categoria ocupacional).');
  }
  if (exam.opinion?.clinicalStatus === 'normal_bilateral') {
    if (Object.values(exam.tonalData || {}).some(ear => Object.values(ear).some(point => point.va === 'NR' || (typeof point.va === 'number' && point.va > 25)))) issues.push('Revise a normalidade bilateral: há ausência de resposta ou limiar acima de 25 dB NA (limite adulto; referências pediátricas podem ser mais restritas).');
    const standard = exam.header?.degreeStandard;
    if (standard && (['right', 'left'] as const).some(ear => { const average = calculatePTA(exam.tonalData?.[ear])[DEGREE_STANDARD_AVERAGE[standard]]; return average !== null && !isAverageWithinNormal(average, standard); })) issues.push(`Revise a normalidade bilateral: a média de ao menos uma orelha está fora do padrão de normalidade da referência selecionada${standard === 'OMS_2021' ? ' (OMS 2021: < 20 dB NA)' : ''}.`);
    if (exam.header?.responseType !== 'threshold' || exam.header?.reliability !== 'good') issues.push('Normalidade bilateral requer limiares confiáveis; revise a situação clínica.');
    for (const ear of ['right', 'left'] as const) {
      if (['500', '1000', '2000', '4000'].some(freq => typeof exam.tonalData?.[ear]?.[freq as TonalFrequency]?.va !== 'number')) issues.push('Normalidade bilateral requer resultados por orelha; campo livre não determina lateralidade.');
    }
  }
  return [...new Set(issues)];
}
