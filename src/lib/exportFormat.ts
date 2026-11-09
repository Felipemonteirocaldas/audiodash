import type { Audiometry, ExamHeader, LogoAudiometryData, ReflexPoint, TonalFrequency, TonalPoint, TympanometryData } from '@/db/db';
import { formatTonalValue, hasRecordedValue, isReviewCurrent } from '@/lib/examIntegrity';
import { recognitionPercentage } from '@/lib/clinicalProtocol';

/** Textos compartilhados por PDF, Word e comparação, para que os documentos não divirjam. */
export const METHOD_LABELS: Record<string, string> = { conventional: 'audiometria convencional', play: 'audiometria lúdica condicionada', vra: 'reforço visual (VRA)', observation: 'observação comportamental' };
export const RESPONSE_LABELS: Record<string, string> = { threshold: 'limiar auditivo', minimum_response: 'nível mínimo de resposta' };
export const RELIABILITY_LABELS: Record<string, string> = { good: 'boa', limited: 'limitada', inconclusive: 'inconclusiva' };
export const TRANSDUCER_LABELS: Record<string, string> = { insert: 'Inserção', supra: 'Supra-aural' };

export const transducerLabel = (value?: string) => TRANSDUCER_LABELS[value || ''] || 'Não registrado';

export function protocolLine(header: Partial<ExamHeader> | undefined): string {
  return `Método: ${METHOD_LABELS[header?.assessmentMethod || ''] || 'não informado'}; tipo de resposta: ${RESPONSE_LABELS[header?.responseType || ''] || 'não informado'}; confiabilidade: ${RELIABILITY_LABELS[header?.reliability || ''] || 'não informada'}; transdutor: ${transducerLabel(header?.transducer).toLowerCase()}.`;
}

export const reviewStatusLabel = (exam: Partial<Audiometry>) => isReviewCurrent(exam) ? 'REVISADO' : 'RASCUNHO — AGUARDANDO REVISÃO';
export const draftFilePrefix = (exam: Partial<Audiometry>) => isReviewCurrent(exam) ? '' : 'Rascunho_';

/** `type` vem de classifyTympanometry. "Inconclusivo" escolhido pelo profissional é registro, não pendência. */
export function tympanometryLabel(data: TympanometryData | undefined, type: string): string {
  if (data?.recordedType === 'Inconclusivo') return 'Inconclusivo (informado pelo profissional)';
  if (type === 'Inconclusivo') return data?.recordedType ? 'Classificação incompleta ou incompatível com a sonda' : 'Classificação não registrada';
  return type === 'Normal' || type === 'Alterada' ? `Curva ${type.toLowerCase()}` : `Tipo ${type === 'As' ? 'As (Ar)' : type}`;
}

/** Valor tonal com a marcação de mascaramento usada nos documentos em texto. */
export function tonalWithMasking(point: TonalPoint | undefined, via: 'va' | 'vo'): string {
  const masked = via === 'va' ? point?.maskedVa : point?.maskedVo;
  return `${formatTonalValue(point, via)}${masked && point?.[via] !== undefined ? ' (M)' : ''}`;
}

export function freeFieldLevels(freeField: Audiometry['freeField'] | undefined, frequencies: TonalFrequency[]): string[] {
  return frequencies.filter(f => freeField?.[f]?.va !== undefined).map(f => `${f} Hz: ${formatTonalValue(freeField?.[f], 'va')}`);
}

/** "ipsi / contra". `limiar` é o nome antigo do reflexo ipsilateral. */
export const reflexCell = (point: ReflexPoint | undefined) => `${point?.ipsi ?? point?.limiar ?? '-'} / ${point?.contra ?? '-'}`;

export function logoProtocolLine(logo: Partial<LogoAudiometryData> | undefined): string {
  return `Idioma ${logo?.language || 'não informado'}; material ${logo?.materialReference || 'não informado'}; apresentação ${logo?.presentation === 'recorded' ? 'gravada' : logo?.presentation === 'live' ? 'voz viva monitorada' : 'não informada'}; resposta ${logo?.responseMode || 'não informada'}.`;
}

export function iprfLines(logo: Partial<LogoAudiometryData> | undefined): string[] {
  return Object.entries(logo?.irf || {}).filter(([, p]) => hasRecordedValue(p)).map(([key, point]) => `IPRF (${key}): lista ${point.listId || 'não informada'}; acertos ${point.correctItems ?? '?'}/${point.totalItems ?? '?'}; ${recognitionPercentage(point) ?? 'não calculável'}%; apresentação ${point.db ?? '?'} dB NA; mascaramento ${point.masking || 'não informado'}.`);
}

export function complementaryEntries(c: Audiometry['complementary'] | undefined): [string, string][] {
  const entries: [string, string][] = [];
  if (c?.weber) entries.push(['Weber', c.weber]);
  if (c?.eoa?.right || c?.eoa?.left) entries.push(['EOA', `OD: ${c.eoa.right || 'Não realizado'} | OE: ${c.eoa.left || 'Não realizado'}${c.eoa.notes ? ` (${c.eoa.notes})` : ''}`]);
  if (c?.toneDecayDetails?.right || c?.toneDecayDetails?.left) entries.push(['Tone decay', `OD: ${c.toneDecayDetails.right || '-'} | OE: ${c.toneDecayDetails.left || '-'}`]);
  if (c?.sisi?.right || c?.sisi?.left) entries.push(['SISI', `OD: ${c.sisi.right || '-'} | OE: ${c.sisi.left || '-'}`]);
  if (c?.bera?.right || c?.bera?.left) entries.push(['PEATE', `OD: ${c.bera.right || '-'} | OE: ${c.bera.left || '-'}${c.bera.notes ? ` (${c.bera.notes})` : ''}`]);
  return entries;
}

export function complementaryNotes(c: Audiometry['complementary'] | undefined): string[] {
  const notes: string[] = [];
  if (hasRecordedValue(c?.eoa)) notes.push(`EOA: ${c?.eoa?.type || 'tipo não informado'}; protocolo ${c?.eoa?.protocol || 'não informado'}; qualidade ${c?.eoa?.quality || 'não informada'}.`);
  if (hasRecordedValue(c?.bera)) notes.push(`PEATE: protocolo ${c?.bera?.protocol || 'não informado'}; estímulo ${c?.bera?.stimulus || 'não informado'}; nível/unidade ${c?.bera?.levelAndUnit || 'não informado'}. Sem conversão automática nHL/eHL.`);
  return notes;
}
