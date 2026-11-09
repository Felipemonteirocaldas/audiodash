import type { Audiometry } from '@/db/db';
import { ageAtExam } from '@/lib/examIntegrity';
import { METHOD_LABELS, RELIABILITY_LABELS, RESPONSE_LABELS, TRANSDUCER_LABELS } from '@/lib/exportFormat';

type ComparableExam = Pick<Audiometry, 'examDate' | 'createdAt' | 'examCategory' | 'header'>;

/** Base = exame mais antigo; na mesma data, o registrado primeiro (createdAt). */
export function orderForComparison<T extends ComparableExam>(a: T, b: T): { baseline: T; current: T; sameDate: boolean } {
  const aFirst = a.examDate < b.examDate || (a.examDate === b.examDate && (a.createdAt ?? 0) <= (b.createdAt ?? 0));
  return { baseline: aFirst ? a : b, current: aFirst ? b : a, sameDate: a.examDate === b.examDate };
}

const PROTOCOL_FIELDS = [
  ['transducer', 'Transdutor', TRANSDUCER_LABELS],
  ['responseType', 'Tipo de resposta', RESPONSE_LABELS],
  ['assessmentMethod', 'Método', METHOD_LABELS],
  ['reliability', 'Confiabilidade', RELIABILITY_LABELS]
] as const;

/**
 * OCU-NR7-03 (docs/MATRIZ-REGRAS-CLINICAS.md): os critérios 5.3/5.4 da NR-7, Anexo II, só são aplicados quando os dois
 * exames são ocupacionais e o paciente tem 18 anos ou mais em ambas as datas. Diferenças de protocolo geram aviso, não bloqueio.
 */
export function nr7ComparisonEligibility(baseline: ComparableExam, current: ComparableExam, birthDate: string | undefined): { eligible: boolean; blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  for (const [label, exam] of [['base', baseline], ['atual', current]] as const) {
    if (exam.examCategory !== 'ocupacional') blockers.push(`Exame ${label} não está registrado como ocupacional.`);
    const age = ageAtExam(birthDate, exam.examDate);
    if (!age) blockers.push(`Idade na data do exame ${label} indisponível (verifique a data de nascimento).`);
    else if (age.years < 18) blockers.push(`Paciente com menos de 18 anos na data do exame ${label}.`);
  }
  const warnings: string[] = [];
  for (const [field, label, labels] of PROTOCOL_FIELDS) {
    const b = baseline.header?.[field], c = current.header?.[field];
    if (!b || !c) warnings.push(`${label}: sem registro ${!b && !c ? 'nos dois exames' : !b ? 'no exame base' : 'no exame atual'}.`);
    else if (b !== c) warnings.push(`${label} diferente entre os exames (base: ${(labels as Record<string, string>)[b] || b}; atual: ${(labels as Record<string, string>)[c] || c}). Variações podem refletir o procedimento, não a audição.`);
  }
  return { eligible: blockers.length === 0, blockers, warnings };
}
