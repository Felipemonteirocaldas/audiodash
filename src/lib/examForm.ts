import type { AudiologicalOpinion, Audiometry, ComplementaryTests, EarTonalData, Meatoscopy, Patient, TonalFrequency } from '@/db/db';

/** Rótulos em português dos achados de meatoscopia; os códigos internos não aparecem nos documentos. */
export const MEATOSCOPY_LABELS: Record<Exclude<Meatoscopy['right'], ''>, string> = {
  normal: 'Conduto livre e membrana timpânica íntegra',
  cerumen: 'Presença de cerúmen',
  foreign_body: 'Presença de corpo estranho',
  perforation: 'Perfuração da membrana timpânica',
  other: 'Outro achado'
};

/** Achado registrado + descrição do profissional, para laudos e resumo. */
export function meatoscopyText(meatoscopy: Partial<Meatoscopy> | undefined, ear: 'right' | 'left'): string {
  const code = meatoscopy?.[ear];
  const description = (ear === 'right' ? meatoscopy?.rightDescription : meatoscopy?.leftDescription)?.trim();
  const finding = code ? MEATOSCOPY_LABELS[code] ?? code : '';
  if (finding && description) return `${finding}. ${description}`;
  return finding || description || 'Não registrado';
}

export const ENT_REFERRAL_TEXT = 'Encaminhamento ao médico otorrinolaringologista recomendado na inspeção.';

/** Ferramenta ativa do audiograma → onde a entrada por toque grava. */
export type AudiogramTool = 'OD_VA' | 'OD_VO' | 'OE_VA' | 'OE_VO' | 'FREE_FIELD' | null;
export function quickEntryTarget(tool: AudiogramTool): { kind: 'freeField' } | { kind: 'ear'; ear: 'right' | 'left'; via: 'va' | 'vo' } | null {
  if (!tool) return null;
  if (tool === 'FREE_FIELD') return { kind: 'freeField' };
  return { kind: 'ear', ear: tool.startsWith('OD') ? 'right' : 'left', via: tool.endsWith('VA') ? 'va' : 'vo' };
}

/** Grava um valor digitado/tocado no campo livre (sem lateralidade). '' apaga; 'NR' mantém o nível já informado. */
export function setFreeFieldValue(freeField: Partial<EarTonalData> | undefined, freq: TonalFrequency, raw: string): Partial<EarTonalData> {
  const text = raw.trim().toUpperCase();
  const current = freeField?.[freq] || {};
  const va: number | 'NR' | undefined = text === 'NR' ? 'NR' : /^-?\d+$/.test(text) ? Number(text) : undefined;
  return {
    ...(freeField || {}),
    [freq]: { ...current, va, nrLevelVa: va === 'NR' ? (typeof current.va === 'number' ? current.va : current.nrLevelVa) : undefined }
  };
}

const OPINION_SUGGESTION_FIELDS = ['lossTypeRight', 'lossDegreeRight', 'configurationRight', 'lossTypeLeft', 'lossDegreeLeft', 'configurationLeft'] as const;

/**
 * Junta as sugestões do resumo ao parecer sem apagar o que o profissional já escreveu:
 * só preenche tipo/grau/configuração vazios; situação clínica e síntese ficam como estão.
 */
export function mergeSuggestedOpinion(current: AudiologicalOpinion | undefined, suggested: AudiologicalOpinion): AudiologicalOpinion {
  const merged: AudiologicalOpinion = { ...(current || {}), workflowStatus: 'draft' };
  for (const field of OPINION_SUGGESTION_FIELDS) {
    if (!String(merged[field] ?? '').trim() && suggested[field]) merged[field] = suggested[field];
  }
  return merged;
}

/** Exames listados na aba Exames: pacientes arquivados ficam ocultos (Res. CFFa 777/2025, ver DOC-02). */
export function visibleExams<T extends Pick<Audiometry, 'patientId'>>(exams: T[], patients: Pick<Patient, 'id' | 'archivedAt'>[]): { visible: T[]; hiddenArchived: number } {
  const archived = new Set(patients.filter(p => p.archivedAt).map(p => p.id));
  const visible = exams.filter(exam => !archived.has(exam.patientId));
  return { visible, hiddenArchived: exams.length - visible.length };
}

/** Busca da lista de exames: nome, CPF (com ou sem pontuação), síntese e data em AAAA-MM-DD ou DD/MM/AAAA (parcial). */
export function matchesExamSearch(exam: { patientName: string; patientCpf: string; examDate?: string; synthesis?: string }, term: string): boolean {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  const digits = query.replace(/\D/g, '');
  const displayDate = exam.examDate ? exam.examDate.split('-').reverse().join('/') : '';
  return exam.patientName.toLowerCase().includes(query)
    || (digits.length >= 3 && exam.patientCpf.replace(/\D/g, '').includes(digits))
    || (!!exam.examDate && (exam.examDate.includes(query) || displayDate.includes(query)))
    || (!!exam.synthesis && exam.synthesis.toLowerCase().includes(query));
}

const WEBER_LABELS = { indiferente: 'Indiferente', od: 'Lateralizado para OD', oe: 'Lateralizado para OE' } as const;
export function weberSummary(freqs: ComplementaryTests['weberFreqs']): string {
  return Object.entries(freqs || {}).filter(([, value]) => value).map(([freq, value]) => `${freq}Hz: ${WEBER_LABELS[value as keyof typeof WEBER_LABELS]}`).join(' | ');
}

/** Atualiza as respostas do Weber; o texto só é regenerado se estiver vazio ou igual ao resumo automático anterior. */
export function updateWeber(current: ComplementaryTests, freq: '500' | '1000' | '2000' | '4000', value: '' | 'indiferente' | 'od' | 'oe'): ComplementaryTests {
  const weberFreqs = { ...(current.weberFreqs || {}), [freq]: value };
  const text = current.weber?.trim() || '';
  const keepText = text !== '' && text !== weberSummary(current.weberFreqs);
  return { ...current, weberFreqs, weber: keepText ? current.weber : weberSummary(weberFreqs) };
}

export function reflexConventionText(convention: '' | 'stimulated' | 'probe' | undefined): string {
  if (convention === 'stimulated') return 'Colunas OD/OE = orelha estimulada.';
  if (convention === 'probe') return 'Colunas OD/OE = orelha da sonda (estímulo contralateral na orelha oposta).';
  return 'Convenção das colunas não informada (orelha estimulada ou orelha da sonda).';
}
