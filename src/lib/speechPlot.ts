import type { Audiometry, IRFPoint } from '@/db/db';
import { getNumericThreshold } from './audiologyCalculations';
import { recognitionPercentage } from './clinicalProtocol';

export const SPEECH_MATERIALS = { mono: 'Monossílabos', dis: 'Dissílabos', tris: 'Trissílabos' } as const;
export type SpeechMaterial = keyof typeof SPEECH_MATERIALS;
export const SPEECH_PLOT = { width: 600, height: 300, left: 55, right: 565, top: 25, bottom: 245 };
export const speechX = (level: number) => SPEECH_PLOT.left + (level + 10) / 130 * (SPEECH_PLOT.right - SPEECH_PLOT.left);
export const speechY = (percent: number) => SPEECH_PLOT.bottom - percent / 100 * (SPEECH_PLOT.bottom - SPEECH_PLOT.top);

export function speechRecognitionPoint(point?: IRFPoint) {
  const level = getNumericThreshold(point?.db), percent = recognitionPercentage(point);
  if (level === null || level < -10 || level > 120 || percent === null) return null;
  return { level, percent, list: point?.listId?.trim() || 'não informada' };
}

export function speechRecognitionPlots(data?: Audiometry['logoAudiometry']) {
  return (Object.keys(SPEECH_MATERIALS) as SpeechMaterial[]).map(material => ({
    material,
    label: SPEECH_MATERIALS[material],
    points: (['right', 'left'] as const).flatMap(ear => {
      const value = speechRecognitionPoint(data?.[ear]?.irf?.[material]);
      return value ? [{ ...value, ear, label: ear === 'right' ? 'OD' : 'OE', color: ear === 'right' ? '#b91c1c' : '#1d4ed8' }] : [];
    })
  })).filter(plot => plot.points.length > 0);
}
