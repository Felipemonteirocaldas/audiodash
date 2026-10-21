import type { EarTonalData, TonalPoint, TympanometryData } from '@/db/db';
import { getNumericThreshold } from './audiologyCalculations';
import { noResponseLevel } from './examIntegrity';

export const AUDIOGRAM_FREQUENCIES = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'] as const;
export const OCTAVE_FREQUENCIES = new Set(['125', '250', '500', '1000', '2000', '4000', '8000']);

// The displayed range is a chart scale, never an assumed audiometer output limit.
export function plottedLevel(point: TonalPoint | undefined, via: 'va' | 'vo'): number | null {
  if (point?.[via] === 'NR') return noResponseLevel(point, via);
  const value = point?.[via];
  return typeof value === 'number' && Number.isFinite(value) && value >= -10 && value <= 120 && value % 5 === 0 ? value : null;
}

// Join measured responses only. An explicit NR/invalid record interrupts the line;
// an untested interoctave does not interrupt two measured octave thresholds.
export function airConductionSegments(data?: Partial<EarTonalData>): { frequency: string; level: number }[][] {
  const segments: { frequency: string; level: number }[][] = [];
  let current: { frequency: string; level: number }[] = [];
  for (const frequency of AUDIOGRAM_FREQUENCIES) {
    const point = data?.[frequency];
    if (point?.va === undefined) continue;
    const level = plottedLevel(point, 'va');
    if (point.va === 'NR' || level === null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push({ frequency, level });
  }
  if (current.length) segments.push(current);
  return segments;
}

export function airConductionPath(data: Partial<EarTonalData> | undefined, x: (f: string) => number, y: (level: number) => number): string {
  return airConductionSegments(data).filter(segment => segment.length > 1)
    .map(segment => segment.map(({ frequency, level }, index) => `${index ? 'L' : 'M'} ${x(frequency)},${y(level)}`).join(' ')).join(' ');
}

/**
 * Curva timpanométrica ILUSTRATIVA (decisão do usuário em 21/10/2026, a pedido da fonoaudióloga consultada):
 * passa exatamente pelo pico registrado (pressão e admitância) com forma de sino padronizada (largura fixa de 60 daPa);
 * sem pico identificável, linha plana na admitância registrada (ou zero). Não é o traçado medido: a largura, a
 * simetria e as caudas não vêm do equipamento. Sempre exibida com aviso explícito.
 */
export const TYMP_ILLUSTRATIVE_WIDTH_DAPA = 60;
export function illustrativeTympanogram(data?: TympanometryData, samples = 61): { kind: 'peak' | 'flat'; probe: string; unit: string; minPressure: number; maxPressure: number; points: { pressure: number; admittance: number }[] } | null {
  const probe = data?.probeFrequency || '', unit = data?.admittanceUnit || '';
  if (!['226', '1000'].includes(probe) || !['ml', 'mmho'].includes(unit) || (probe === '1000' && unit === 'ml')) return null;
  if (data?.curveShape === 'flat') {
    const recorded = getNumericThreshold(data.compliance200);
    const level = recorded !== null && recorded >= 0 ? recorded : 0;
    return { kind: 'flat', probe, unit, minPressure: -400, maxPressure: 200, points: [{ pressure: -400, admittance: level }, { pressure: 200, admittance: level }] };
  }
  const peak = tympanometryPeak(data).point;
  if (!peak) return null;
  const minPressure = Math.min(-400, Math.floor((peak.pressure - 150) / 100) * 100);
  const maxPressure = Math.max(200, Math.ceil((peak.pressure + 150) / 100) * 100);
  const pressures = new Set<number>([peak.pressure]);
  for (let i = 0; i < samples; i++) pressures.add(Math.round(minPressure + i * (maxPressure - minPressure) / (samples - 1)));
  const points = [...pressures].sort((a, b) => a - b).map(pressure => ({ pressure, admittance: Math.round(peak.admittance * Math.exp(-0.5 * ((pressure - peak.pressure) / TYMP_ILLUSTRATIVE_WIDTH_DAPA) ** 2) * 1000) / 1000 }));
  return { kind: 'peak', probe, unit, minPressure, maxPressure, points };
}

export function tympanometryPeak(data?: TympanometryData) {
  if (data?.curveShape === 'flat') return { point: null, reason: 'Sem pico identificável: nenhum ponto de pico é desenhado.' };
  if (data?.curveShape !== 'peaked') return { point: null, reason: 'Informe se há pico identificável na curva medida.' };
  if (!['226', '1000'].includes(data.probeFrequency || '') || !['ml', 'mmho'].includes(data.admittanceUnit || '')) return { point: null, reason: 'Informe frequência da sonda e unidade para representar o pico.' };
  if (data.probeFrequency === '1000' && data.admittanceUnit === 'ml') return { point: null, reason: '1000 Hz: registre admitância em mmho (mS); ml equivalente não é a unidade suportada nesta frequência.' };
  const pressure = getNumericThreshold(data.peak), admittance = getNumericThreshold(data.compliance200);
  if (pressure === null || admittance === null || admittance < 0) return { point: null, reason: 'Pico não representado: pressão ou admitância ausente/inválida.' };
  return { point: { pressure, admittance, probe: data.probeFrequency!, unit: data.admittanceUnit! }, reason: '' };
}
