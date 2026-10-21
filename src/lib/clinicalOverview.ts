import type { Appointment, Audiometry } from '@/db/db';
import { isReviewCurrent } from './examIntegrity';

export function summarizeExams(exams: Audiometry[]) {
  const counts = { normal: 0, altered: 0, inconclusive: 0, draft: 0 };
  for (const exam of exams) {
    if (!isReviewCurrent(exam)) counts.draft++;
    else if (exam.opinion?.clinicalStatus === 'normal_bilateral') counts.normal++;
    else if (exam.opinion?.clinicalStatus === 'altered') counts.altered++;
    else counts.inconclusive++;
  }
  return counts;
}

export type ExamStatus = 'draft' | 'normal' | 'altered' | 'inconclusive';
/** Situação de um exame a partir da decisão estruturada revisada (nunca do texto livre). */
export function examStatus(exam: Audiometry): ExamStatus {
  if (!isReviewCurrent(exam)) return 'draft';
  if (exam.opinion?.clinicalStatus === 'normal_bilateral') return 'normal';
  if (exam.opinion?.clinicalStatus === 'altered') return 'altered';
  return 'inconclusive';
}

export function nextScheduledAppointment(appointments: Appointment[], nowTime: string): Appointment | null {
  return [...appointments].filter(a => a.status === 'scheduled' && a.time >= nowTime).sort((a, b) => a.time.localeCompare(b.time))[0] || null;
}
