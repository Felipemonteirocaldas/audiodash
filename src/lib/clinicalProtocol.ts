import type { IRFPoint } from '@/db/db';
import { getAudiometricThreshold, getNumericThreshold } from './audiologyCalculations';

export const frequencyOctaveOffset = (frequency: string | number) => Math.log2(Number(frequency) / 125);

export function calculateRecognitionScore(correct: unknown, total: unknown): { percent: number | null; issue: string | null } {
  if (correct === '' || correct === undefined || correct === null || total === '' || total === undefined || total === null) return { percent: null, issue: 'Informe acertos e total de palavras.' };
  if ([correct, total].some(v => typeof v !== 'number' && (typeof v !== 'string' || !/^\d+$/.test(v.trim())))) return { percent: null, issue: 'Use contagens inteiras de palavras.' };
  const c = Number(correct), n = Number(total);
  if (!Number.isSafeInteger(c) || !Number.isSafeInteger(n) || n <= 0 || c < 0 || c > n) return { percent: null, issue: 'Use contagens inteiras: total maior que zero e acertos entre zero e o total.' };
  return { percent: Math.round(c / n * 10000) / 100, issue: null };
}

export function recognitionPercentage(point?: IRFPoint): number | null {
  if (point?.correctItems !== undefined || point?.totalItems !== undefined) return calculateRecognitionScore(point.correctItems, point.totalItems).percent;
  const score = getNumericThreshold(point?.percentage);
  return score !== null && score >= 0 && score <= 100 ? score : null;
}

export function assessRetest1000(initial: number | 'NR' | undefined, retest: number | string | undefined) {
  const first = getAudiometricThreshold(initial), second = getAudiometricThreshold(retest);
  if (first === null || second === null) return { difference: null, requiresReview: false, message: 'Reteste não comparável: registre os dois limiares numéricos.' };
  const difference = Math.abs(first - second);
  return { difference, requiresReview: difference > 5, message: difference > 5 ? `Diferença de ${difference} dB no reteste de 1 kHz. Investigar a variação antes de concluir (BSA 2018, §6.4).` : `Diferença de ${difference} dB no reteste de 1 kHz. Registrar a decisão sobre o limiar final.` };
}
