import type { Appointment, Audiometry, Patient } from '@/db/db';
import { ageAtExam, CLINICAL_RULES_VERSION, isReviewCurrent, localDate, reviewSignature } from './examIntegrity';

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

/**
 * Por que um exame não está com a revisão em dia:
 * - never: nunca foi revisado pelo profissional;
 * - edited: foi revisado, mas o conteúdo mudou depois (a assinatura interna não confere mais);
 * - rules: o conteúdo é o mesmo da revisão, mas a versão das regras clínicas foi atualizada desde então.
 */
export type ReviewState = 'current' | 'never' | 'edited' | 'rules';
export function reviewState(exam: Audiometry): ReviewState {
  if (isReviewCurrent(exam)) return 'current';
  const opinion = exam.opinion;
  if (opinion?.workflowStatus !== 'reviewed') return 'never';
  const rulesOutdated = exam.header?.clinicalRulesVersion !== CLINICAL_RULES_VERSION;
  if (rulesOutdated && opinion.reviewedSignature === reviewSignature(exam)) return 'rules';
  return 'edited';
}

export const REVIEW_STATE_LABELS: Record<Exclude<ReviewState, 'current'>, string> = {
  never: 'Aguardando revisão',
  edited: 'Editado após a revisão',
  rules: 'Regras clínicas atualizadas desde a revisão'
};

/* ----------------------------- Períodos do painel ----------------------------- */

export type DashboardPeriod = 'today' | 'month' | '30d' | 'year' | 'all' | 'custom';
export type DashboardPopulation = 'all' | 'adults' | 'children';
export interface DateRange { from: string; to: string }
export interface CustomRange { from?: string; to?: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OPEN_START = '0000-01-01';
const OPEN_END = '9999-12-31';

export function shiftDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}
const pad = (n: number) => String(n).padStart(2, '0');
function clampedDate(year: number, month: number, day: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate(); // month é 1–12; dia 0 do mês seguinte = último dia
  return `${year}-${pad(month)}-${pad(Math.min(day, last))}`;
}

export function periodRange(period: DashboardPeriod, today: string, custom?: CustomRange): DateRange | null {
  switch (period) {
    case 'today': return { from: today, to: today };
    case 'month': return { from: `${today.slice(0, 7)}-01`, to: today };
    case '30d': return { from: shiftDays(today, -29), to: today };
    case 'year': return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'custom': {
      let from = custom?.from && DATE.test(custom.from) ? custom.from : OPEN_START;
      let to = custom?.to && DATE.test(custom.to) ? custom.to : OPEN_END;
      if (from > to) [from, to] = [to, from];
      return { from, to };
    }
    default: return null;
  }
}

/** Intervalo comparável imediatamente anterior; null quando não há comparação honesta (histórico todo, intervalo aberto). */
export function previousRange(period: DashboardPeriod, range: DateRange | null, today: string): DateRange | null {
  if (!range) return null;
  const [y, m, d] = today.split('-').map(Number);
  if (period === 'today') { const day = shiftDays(today, -1); return { from: day, to: day }; }
  if (period === 'month') {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    return { from: `${py}-${pad(pm)}-01`, to: clampedDate(py, pm, d) };
  }
  if (period === 'year') return { from: `${y - 1}-01-01`, to: clampedDate(y - 1, m, d) };
  if (range.from === OPEN_START || range.to === OPEN_END) return null;
  const length = daysBetween(range.from, range.to) + 1;
  const to = shiftDays(range.from, -1);
  return { from: shiftDays(to, -(length - 1)), to };
}

export const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string; previousLabel: string }> = [
  { value: 'today', label: 'Hoje', previousLabel: 'ontem' },
  { value: 'month', label: 'Este mês', previousLabel: 'mesmo intervalo do mês anterior' },
  { value: '30d', label: 'Últimos 30 dias', previousLabel: '30 dias anteriores' },
  { value: 'year', label: 'Este ano', previousLabel: 'mesmo intervalo do ano anterior' },
  { value: 'all', label: 'Todo o histórico', previousLabel: '' },
  { value: 'custom', label: 'Período personalizado', previousLabel: 'período anterior de mesma duração' }
];

const inRange = (date: string, range: DateRange | null) => !range || (date >= range.from && date <= range.to);

/* ------------------------------- Resumo do painel ------------------------------ */

export interface DashboardAlert {
  id: string;
  level: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  to?: string;
}

export interface DashboardInput {
  patients: Patient[];
  /** Exames que cobrem o período e o período anterior (o filtro fino é feito aqui). */
  exams: Audiometry[];
  /** Exames dos últimos 30 dias, para o aviso de calibração. Se ausente, usa `exams`. */
  recentExams?: Audiometry[];
  /** Agendamentos de hoje (ou mais; o filtro por data é refeito aqui). */
  appointments: Appointment[];
  now: Date;
  period: DashboardPeriod;
  population: DashboardPopulation;
  custom?: CustomRange;
  /** Registros ainda não enviados: pacientes, exames, agenda, anamneses e configurações. */
  pendingSync?: number;
  subscription?: { status?: string | null; endDate?: number | null };
}

export function buildDashboardOverview(input: DashboardInput) {
  const { patients, exams, appointments, now, period, population } = input;
  const today = localDate(now);
  const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const range = periodRange(period, today, input.custom);
  const previous = previousRange(period, range, today);

  const patientById = new Map(patients.map(p => [p.id, p]));
  const archivedIds = new Set(patients.filter(p => p.archivedAt).map(p => p.id));
  const activePatients = patients.length - archivedIds.size;
  // Prontuário arquivado é preservado, mas não entra em filas nem totais do painel.
  const visibleExams = exams.filter(exam => !archivedIds.has(exam.patientId));

  /** true/false = pertence ou não ao público; null = sem idade válida no exame (data de nascimento ausente ou inconsistente). */
  const populationMatch = (exam: Audiometry): boolean | null => {
    if (population === 'all') return true;
    const age = ageAtExam(patientById.get(exam.patientId)?.birthDate, exam.examDate);
    if (!age) return null;
    return population === 'children' ? age.years < 18 : age.years >= 18;
  };

  const inPeriod = visibleExams.filter(exam => inRange(exam.examDate, range));
  const excludedNoBirthDate = inPeriod.filter(exam => populationMatch(exam) === null).length;
  const filtered = inPeriod.filter(exam => populationMatch(exam) === true);
  const counts = summarizeExams(filtered);
  const review = { never: 0, edited: 0, rules: 0 };
  const drafts: Array<{ exam: Audiometry; state: Exclude<ReviewState, 'current'> }> = [];
  for (const exam of filtered) {
    const state = reviewState(exam);
    if (state === 'current') continue;
    review[state]++;
    drafts.push({ exam, state });
  }
  drafts.sort((a, b) => b.exam.updatedAt - a.exam.updatedAt);
  const recent = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  const previousCount = previous ? visibleExams.filter(exam => inRange(exam.examDate, previous) && populationMatch(exam) === true).length : null;

  const todays = appointments.filter(a => a.date === today && a.status !== 'canceled').sort((a, b) => a.time.localeCompare(b.time));
  const scheduled = todays.filter(a => a.status === 'scheduled');
  const agenda = {
    total: todays.length,
    scheduled: scheduled.length,
    completed: todays.filter(a => a.status === 'completed').length,
    late: scheduled.filter(a => a.time < nowTime).length
  };
  const next = nextScheduledAppointment(todays, nowTime);

  const alerts: DashboardAlert[] = [];
  const subscription = input.subscription;
  if (subscription?.status === 'past_due' || subscription?.status === 'canceled') {
    alerts.push({ id: 'subscription', level: 'danger', title: subscription.status === 'past_due' ? 'Assinatura com pagamento pendente' : 'Assinatura cancelada', detail: 'Regularize para manter o acesso ao sistema.', to: '/configuracoes' });
  } else if (subscription?.endDate) {
    const daysLeft = Math.ceil((subscription.endDate - now.getTime()) / 86400000);
    if (daysLeft <= 5) alerts.push({ id: 'subscription', level: daysLeft <= 0 ? 'danger' : 'warning', title: daysLeft <= 0 ? 'Assinatura vencida' : `Assinatura termina em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`, detail: 'Renove para não perder o acesso.', to: '/configuracoes' });
  }
  if (agenda.late > 0) alerts.push({ id: 'late', level: 'warning', title: `${agenda.late} ${agenda.late === 1 ? 'atendimento passou' : 'atendimentos passaram'} do horário`, detail: 'Ainda constam como agendados. Marque como concluído ou cancele na agenda.', to: '/agenda' });
  if (review.rules > 0) alerts.push({ id: 'rules', level: 'warning', title: `${review.rules} ${review.rules === 1 ? 'exame revisado' : 'exames revisados'} antes da versão atual das regras clínicas`, detail: 'O conteúdo não mudou desde a revisão. Abra o exame e revise novamente para atualizar.', to: '/exames' });
  const recentWindowStart = shiftDays(today, -29);
  const missingCalibration = (input.recentExams ?? exams).filter(e => !archivedIds.has(e.patientId) && e.examDate >= recentWindowStart && e.examDate <= today && !e.header?.calibrationDate).length;
  if (missingCalibration > 0) alerts.push({ id: 'calibration', level: 'info', title: `${missingCalibration} ${missingCalibration === 1 ? 'exame dos' : 'exames dos'} últimos 30 dias sem data de calibração registrada`, detail: 'O sistema não verifica a calibração do equipamento; apenas lembra de registrar a data documentada.', to: '/exames' });
  if (input.pendingSync && input.pendingSync > 0) alerts.push({ id: 'sync', level: 'info', title: `${input.pendingSync} ${input.pendingSync === 1 ? 'registro aguarda envio' : 'registros aguardam envio'}`, detail: 'Pacientes, exames, agenda, anamneses ou configurações ainda não sincronizados.' });

  return {
    today, nowTime, range, previous, previousCount,
    filtered, counts, review, drafts, recent, excludedNoBirthDate,
    activePatients, archivedPatients: archivedIds.size,
    todays, agenda, next, alerts
  };
}

export type DashboardOverview = ReturnType<typeof buildDashboardOverview>;
