import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Activity, CalendarDays, CheckCircle2, ChevronRight, Circle, ClipboardCheck, FileText, PlayCircle } from 'lucide-react';
import { db } from '@/db/db';
import { useAuth } from '@/contexts/AuthContext';
import { isReviewCurrent, localDate } from '@/lib/examIntegrity';
import {
  REVIEW_STATE_LABELS,
  PERIOD_OPTIONS,
  buildDashboardOverview,
  onboardingSteps,
  periodRange,
  previousRange,
  shiftDays,
  type DashboardAlert,
  type DashboardPeriod,
  type DashboardPopulation
} from '@/lib/clinicalOverview';
import { formatLongDatePt } from '@/lib/dateLabels';

const card = 'bg-white border border-slate-200 rounded-2xl p-5 shadow-sm';
const SYNC_TABLES = ['patients', 'audiometries', 'appointments', 'anamneses', 'settings'] as const;
const ALERT_STYLES: Record<DashboardAlert['level'], { box: string; tag: string; label: string }> = {
  danger: { box: 'border-red-300 bg-red-50 text-red-900', tag: 'bg-red-100 text-red-800', label: 'Urgente' },
  warning: { box: 'border-amber-300 bg-amber-50 text-amber-900', tag: 'bg-amber-100 text-amber-900', label: 'Atenção' },
  info: { box: 'border-slate-200 bg-slate-50 text-slate-800', tag: 'bg-slate-200 text-slate-800', label: 'Aviso' }
};
const POPULATION_LABELS: Record<DashboardPopulation, string> = { all: 'Todos', adults: 'Adultos · 18 anos ou mais', children: 'Crianças e adolescentes' };

const formatDateBr = (iso: string) => iso.split('-').reverse().join('/');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [population, setPopulation] = useState<DashboardPopulation>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // O relógio só provoca novo render quando o minuto (ou o dia) muda.
  useEffect(() => {
    const timer = setInterval(() => setTime(prev => {
      const now = new Date();
      return now.getMinutes() === prev.getMinutes() && localDate(now) === localDate(prev) ? prev : now;
    }), 30000);
    return () => clearInterval(timer);
  }, []);

  const today = localDate(time);
  const queryKey = `${period}|${customFrom}|${customTo}|${today}`;

  const data = useLiveQuery(async () => {
    try {
      const custom = { from: customFrom, to: customTo };
      const range = periodRange(period, today, custom);
      const previous = previousRange(period, range, today);
      const lower = range && previous && previous.from < range.from ? previous.from : range?.from;
      const [patients, exams, recentExams, appointments, settings, examTotal, reviewedExam, ...pending] = await Promise.all([
        db.patients.toArray(),
        range && lower ? db.audiometries.where('examDate').between(lower, range.to, true, true).toArray() : db.audiometries.toArray(),
        db.audiometries.where('examDate').aboveOrEqual(shiftDays(today, -29)).toArray(),
        db.appointments.where('date').equals(today).toArray(),
        db.settings.toCollection().first(),
        db.audiometries.count(),
        db.audiometries.filter(e => e.opinion?.workflowStatus === 'reviewed').first(),
        ...SYNC_TABLES.map(table => db[table].where('syncStatus').equals('pending').count())
      ]);
      return { key: queryKey, patients, exams, recentExams, appointments, settings, examTotal, hasReviewedExam: !!reviewedExam, pendingSync: pending.reduce((a, b) => a + b, 0), error: '' };
    } catch {
      return { key: queryKey, patients: [], exams: [], recentExams: [], appointments: [], settings: undefined, examTotal: 0, hasReviewedExam: false, pendingSync: 0, error: 'Não foi possível carregar o painel. Recarregue para tentar novamente.' };
    }
  }, [queryKey]);

  const ready = !!data && data.key === queryKey && !data.error;
  const overview = useMemo(() => ready && data ? buildDashboardOverview({
    patients: data.patients,
    exams: data.exams,
    recentExams: data.recentExams,
    appointments: data.appointments,
    now: time,
    period,
    population,
    custom: { from: customFrom, to: customTo },
    pendingSync: data.pendingSync,
    subscription: { status: user?.subscriptionStatus, endDate: user?.subscriptionEndDate }
  }) : null, [ready, data, time, period, population, customFrom, customTo, user?.subscriptionStatus, user?.subscriptionEndDate]);
  const patientNames = useMemo(() => new Map((data?.patients || []).map(p => [p.id, p.name])), [data?.patients]);

  if (data?.error) return <p role="alert" className="p-5 border rounded-xl bg-red-50 text-red-800">{data.error}</p>;
  if (!data || !overview) return <p role="status" className="p-8 text-slate-600">Carregando atendimentos e exames…</p>;

  const { counts, review, filtered, agenda, alerts, drafts, recent, next } = overview;
  const firstName = data.settings?.professionalName?.split(' ')[0] || '';
  const periodOption = PERIOD_OPTIONS.find(o => o.value === period);
  const steps = onboardingSteps({ settings: data.settings, patientCount: data.patients.length, examCount: data.examTotal, hasReviewedExam: data.hasReviewedExam });
  const stepsDone = steps.filter(s => s.done).length;

  const examRow = (exam: (typeof filtered)[number], status: string) => (
    <Link key={exam.id} to={`/exame/${exam.id}`} className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0 hover:text-blue-700">
      <div className="min-w-0">
        <p className="font-semibold truncate">{patientNames.get(exam.patientId) || 'Paciente não encontrado'}</p>
        <p className="text-xs text-slate-600 mt-1">{formatDateBr(exam.examDate)} · {status}</p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
    </Link>
  );

  const reviewNote = [
    review.never && `${review.never} sem revisão`,
    review.edited && `${review.edited} editados após a revisão`,
    review.rules && `${review.rules} com regras atualizadas`
  ].filter(Boolean).join(' · ');

  const patientsLine = `${plural(overview.activePatients, 'paciente ativo', 'pacientes ativos')} no cadastro${overview.archivedPatients ? ` · ${plural(overview.archivedPatients, 'arquivado não contado', 'arquivados não contados')}` : ''}`;
  const agendaLine = agenda.total ? `${agenda.scheduled} a atender · ${agenda.completed} ${agenda.completed === 1 ? 'concluído' : 'concluídos'} de ${agenda.total}` : '';
  const periodLine = [
    <><strong className="text-slate-900">{plural(filtered.length, 'exame', 'exames')}</strong> no período</>,
    overview.previousCount !== null && <>{overview.previousCount} em {periodOption?.previousLabel}</>,
    counts.draft > 0 && <><strong className="text-amber-800">{counts.draft} aguardando revisão</strong> ({reviewNote})</>
  ].filter(Boolean);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <p className="text-xs text-slate-600 md:hidden">{formatLongDatePt(time)}</p>
        <h1 className="text-3xl font-bold text-slate-900 mt-1 md:mt-0">Atendimentos{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-sm text-slate-600 mt-1">{patientsLine}</p>
      </div>

      {stepsDone < steps.length && (
        <section className={card} aria-labelledby="dash-start">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="dash-start" className="font-bold">Primeiros passos</h2>
            <p className="text-xs text-slate-600">{stepsDone} de {steps.length} concluídos</p>
          </div>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.done ? CheckCircle2 : Circle;
              const body = (
                <>
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${step.done ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${step.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{index + 1}. {step.label}</span>
                    <span className="block text-xs text-slate-600 mt-0.5">{step.done ? 'Concluído' : step.detail}</span>
                  </span>
                </>
              );
              return (
                <li key={step.id}>
                  {step.done
                    ? <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">{body}</div>
                    : <Link to={step.to} className="flex gap-3 rounded-xl border border-blue-200 bg-white p-3 hover:bg-blue-50">{body}</Link>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {alerts.length > 0 && (
        <section aria-label="Alertas do painel" className="space-y-2">
          {alerts.map(alert => {
            const style = ALERT_STYLES[alert.level];
            return (
              <div key={alert.id} role={alert.level === 'danger' ? 'alert' : undefined} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm ${style.box}`}>
                <div className="min-w-0">
                  <p><span className={`mr-2 rounded px-1.5 py-0.5 text-[11px] font-bold ${style.tag}`}>{style.label}</span><strong>{alert.title}</strong></p>
                  <p className="mt-1 text-xs">{alert.detail}</p>
                </div>
                {alert.to && <Link to={alert.to} className="shrink-0 text-xs font-semibold underline">Abrir</Link>}
              </div>
            );
          })}
        </section>
      )}

      <section className={card} aria-labelledby="dash-agenda">
        <div className="flex flex-wrap justify-between items-baseline gap-2">
          <div>
            <h2 id="dash-agenda" className="text-lg font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-blue-600" aria-hidden="true" />Agenda de hoje</h2>
            {agendaLine && <p className="text-xs text-slate-600 mt-1">{agendaLine}</p>}
          </div>
          <Link to="/agenda" className="text-sm font-semibold text-blue-700">Abrir agenda</Link>
        </div>
        {next && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-800">Próximo atendimento</p>
              <p className="mt-1 text-lg font-bold truncate">{next.time} · {next.patientName}</p>
              {next.type && <p className="text-xs text-blue-900">{next.type}</p>}
            </div>
            {next.patientId
              ? <Link to={`/exame/novo/${next.patientId}`} className="flex items-center gap-2 rounded-lg bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"><PlayCircle className="w-4 h-4" aria-hidden="true" />Iniciar exame</Link>
              : <p className="text-xs text-blue-900 max-w-56">Agendamento sem paciente cadastrado. Vincule na agenda para iniciar o exame.</p>}
          </div>
        )}
        {overview.todays.length ? (
          <ul className="mt-3 grid gap-x-8 lg:grid-cols-2">
            {overview.todays.slice(0, 6).map(a => (
              <li key={a.id} className="border-b border-slate-100 last:border-0">
                <Link to="/agenda" className="flex justify-between gap-3 py-3 text-sm hover:text-blue-700">
                  <span className="min-w-0">
                    <strong className="block truncate">{a.patientName}</strong>
                    <span className="block text-xs text-slate-600 mt-1">{a.type} · {a.status === 'completed' ? 'Concluído' : a.time < overview.nowTime ? 'Passou do horário' : 'Agendado'}</span>
                  </span>
                  <span className="font-semibold text-blue-700">{a.time}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="pt-4 text-sm text-slate-600">Nenhum agendamento hoje. <Link className="text-blue-700 underline" to="/agenda">Agendar atendimento</Link></p>}
        {overview.todays.length > 6 && <Link to="/agenda" className="block pt-3 text-sm text-blue-700">Ver os outros {overview.todays.length - 6} da agenda</Link>}
      </section>

      <section aria-labelledby="dash-exams" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="dash-exams" className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" aria-hidden="true" />Exames</h2>
            <p className="text-sm text-slate-600 mt-1">
              {periodLine.map((part, i) => <span key={i}>{i > 0 && ' · '}{part}</span>)}
            </p>
            {population !== 'all' && overview.excludedNoBirthDate > 0 && <p className="text-xs text-slate-600 mt-1">{plural(overview.excludedNoBirthDate, 'exame sem data de nascimento válida fica', 'exames sem data de nascimento válida ficam')} só em “Todos”.</p>}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="dash-period" className="text-xs font-semibold text-slate-800">Período</label>
              <select id="dash-period" className="block mt-1 rounded-lg border bg-white p-2 min-w-44" value={period} onChange={e => setPeriod(e.target.value as DashboardPeriod)}>
                {PERIOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {period === 'custom' && <>
              <div>
                <label htmlFor="dash-from" className="text-xs font-semibold text-slate-800">De</label>
                <input id="dash-from" type="date" max={customTo || undefined} className="block mt-1 rounded-lg border bg-white p-2" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label htmlFor="dash-to" className="text-xs font-semibold text-slate-800">Até</label>
                <input id="dash-to" type="date" min={customFrom || undefined} className="block mt-1 rounded-lg border bg-white p-2" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </>}
            <div>
              <label htmlFor="dash-population" className="text-xs font-semibold text-slate-800">Público (idade no exame)</label>
              <select id="dash-population" className="block mt-1 rounded-lg border bg-white p-2 min-w-44" value={population} onChange={e => setPopulation(e.target.value as DashboardPopulation)}>
                {(Object.keys(POPULATION_LABELS) as DashboardPopulation[]).map(value => <option key={value} value={value}>{POPULATION_LABELS[value]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={`${card} text-sm text-slate-600`}>
            {data.examTotal === 0
              ? <p>Nenhum exame registrado ainda. <Link to="/exame/novo" className="font-semibold text-blue-700 underline">Registrar exame</Link></p>
              : <p>Nenhum exame em “{periodOption?.label}”{population !== 'all' ? ` para ${POPULATION_LABELS[population].toLowerCase()}` : ''}. Escolha outro período ou público.</p>}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
            <section className={card} aria-labelledby="dash-review">
              <h3 id="dash-review" className="font-bold flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-amber-600" aria-hidden="true" />Continuar e revisar</h3>
              <p className="text-xs text-slate-600 mt-1">Exames do período sem revisão em dia.</p>
              <div className="mt-2">
                {drafts.length ? drafts.slice(0, 5).map(({ exam, state }) => examRow(exam, REVIEW_STATE_LABELS[state])) : <p className="py-6 text-sm text-slate-600">Nenhum exame aguardando revisão.</p>}
                {drafts.length > 5 && <Link to="/exames" className="block pt-3 text-sm text-blue-700">Ver os outros {drafts.length - 5} em Exames</Link>}
              </div>
            </section>

            <section className={card} aria-labelledby="dash-status">
              <h3 id="dash-status" className="font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" aria-hidden="true" />Situação clínica revisada</h3>
              <p className="text-xs text-slate-600 mt-1">Definida pelo profissional. Percentuais sobre {plural(filtered.length, 'exame', 'exames')} do período.</p>
              <table className="w-full text-sm mt-3">
                <caption className="sr-only">Exames por situação clínica no período e público selecionados</caption>
                <thead><tr className="text-left text-xs text-slate-600 border-b"><th scope="col" className="py-2">Situação</th><th scope="col" className="text-right">Exames</th><th scope="col" className="text-right">%</th></tr></thead>
                <tbody>
                  {([['Normalidade bilateral', counts.normal], ['Alteração audiológica', counts.altered], ['Inconclusivo', counts.inconclusive], ['Aguardando revisão', counts.draft]] as const).map(([label, value]) => (
                    <tr key={label} className="border-b last:border-0">
                      <th scope="row" className="py-3 text-left font-normal">{label}</th>
                      <td className="text-right font-semibold">{value}</td>
                      <td className="text-right text-slate-600">{(value / filtered.length * 100).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={card} aria-labelledby="dash-recent">
              <div className="flex justify-between">
                <h3 id="dash-recent" className="font-bold flex gap-2 items-center"><FileText className="w-5 h-5 text-blue-600" aria-hidden="true" />Últimos atualizados</h3>
                <Link className="text-sm text-blue-700" to="/exames">Ver todos</Link>
              </div>
              <div className="mt-2">
                {recent.map(exam => examRow(exam, isReviewCurrent(exam) ? 'Revisado' : 'Aguardando revisão'))}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
