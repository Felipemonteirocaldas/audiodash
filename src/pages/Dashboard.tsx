import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Activity, CalendarDays, ChevronRight, ClipboardCheck, FileText, Users } from 'lucide-react';
import { db } from '@/db/db';
import { useAuth } from '@/contexts/AuthContext';
import { isReviewCurrent, localDate } from '@/lib/examIntegrity';
import {
  REVIEW_STATE_LABELS,
  PERIOD_OPTIONS,
  buildDashboardOverview,
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

function Scope({ label }: { label: string }) {
  return <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">{label}</span>;
}

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
      const [patients, exams, recentExams, appointments, settings, ...pending] = await Promise.all([
        db.patients.toArray(),
        range && lower ? db.audiometries.where('examDate').between(lower, range.to, true, true).toArray() : db.audiometries.toArray(),
        db.audiometries.where('examDate').aboveOrEqual(shiftDays(today, -29)).toArray(),
        db.appointments.where('date').equals(today).toArray(),
        db.settings.toCollection().first(),
        ...SYNC_TABLES.map(table => db[table].where('syncStatus').equals('pending').count())
      ]);
      return { key: queryKey, patients, exams, recentExams, appointments, settings, pendingSync: pending.reduce((a, b) => a + b, 0), error: '' };
    } catch {
      return { key: queryKey, patients: [], exams: [], recentExams: [], appointments: [], settings: undefined, pendingSync: 0, error: 'Não foi possível carregar o painel. Recarregue para tentar novamente.' };
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

  const { counts, review, filtered, agenda, alerts, drafts, recent } = overview;
  const firstName = data.settings?.professionalName?.split(' ')[0] || '';
  const previousLabel = PERIOD_OPTIONS.find(o => o.value === period)?.previousLabel || '';
  const noRegistry = data.patients.length === 0;

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
  ].filter(Boolean).join(' · ') || 'Nenhum pendente nos filtros';

  const summaryCards = [
    { label: 'A atender hoje', scope: 'Hoje', value: agenda.scheduled, icon: CalendarDays, note: `${agenda.completed} concluídos de ${agenda.total} no dia` },
    { label: 'Exames para revisar', scope: 'Filtros', value: counts.draft, icon: ClipboardCheck, note: reviewNote },
    { label: 'Pacientes ativos', scope: 'Cadastro', value: overview.activePatients, icon: Users, note: overview.archivedPatients ? `${plural(overview.archivedPatients, 'arquivado não contado', 'arquivados não contados')}` : 'Todo o cadastro, sem arquivados' },
    { label: 'Exames no período', scope: 'Filtros', value: filtered.length, icon: FileText, note: overview.previousCount === null ? 'Sem período anterior para comparar' : `${overview.previousCount} em ${previousLabel}` }
  ];

  return (
    <div className="space-y-6 pb-10">
      <div>
        <p className="text-xs text-slate-600">{formatLongDatePt(time)}</p>
        <h1 className="text-3xl font-bold text-slate-900 mt-1">Atendimentos{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-sm text-slate-600 mt-1">Agenda, continuidade dos exames e revisão clínica.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-slate-50 border p-4">
        <div>
          <label htmlFor="dash-period" className="text-xs font-semibold text-slate-800">Período</label>
          <select id="dash-period" className="block mt-1 rounded-lg border bg-white p-2 min-w-48" value={period} onChange={e => setPeriod(e.target.value as DashboardPeriod)}>
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
          <select id="dash-population" className="block mt-1 rounded-lg border bg-white p-2 min-w-48" value={population} onChange={e => setPopulation(e.target.value as DashboardPopulation)}>
            <option value="all">Todos</option>
            <option value="adults">Adultos · 18 anos ou mais</option>
            <option value="children">Crianças e adolescentes</option>
          </select>
        </div>
        <div className="text-xs text-slate-600 pb-2 max-w-md">
          <p><strong>{plural(filtered.length, 'exame', 'exames')}</strong> nos filtros. Os filtros valem para os blocos marcados com <Scope label="Filtros" />.</p>
          {population !== 'all' && overview.excludedNoBirthDate > 0 && <p className="mt-1">{plural(overview.excludedNoBirthDate, 'exame sem data de nascimento válida fica', 'exames sem data de nascimento válida ficam')} só em “Todos”.</p>}
        </div>
      </div>

      {noRegistry && (
        <section className={card} aria-labelledby="dash-start">
          <h2 id="dash-start" className="font-bold">Primeiros passos</h2>
          <p className="text-sm text-slate-600 mt-1">Ainda não há pacientes cadastrados. Cadastre um paciente para registrar exames e agendar atendimentos.</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link to="/pacientes" className="font-semibold text-blue-700 underline">Cadastrar paciente</Link>
            <Link to="/agenda" className="font-semibold text-blue-700 underline">Abrir agenda</Link>
          </div>
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

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(({ label, scope, value, icon: Icon, note }) => (
          <div key={label} className={card} role="group" aria-label={label}>
            <div className="flex justify-between items-start gap-2 text-slate-700 text-xs font-semibold">
              <span>{label}</span>
              <Icon className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold mt-3">{value}</p>
            <p className="text-xs text-slate-600 mt-2">{note}</p>
            <p className="mt-3"><Scope label={scope} /></p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className={card} aria-labelledby="dash-agenda">
          <div className="flex justify-between items-center">
            <h2 id="dash-agenda" className="font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-blue-600" aria-hidden="true" />Agenda de hoje <Scope label="Hoje" /></h2>
            <Link to="/agenda" className="text-sm text-blue-700">Abrir agenda</Link>
          </div>
          {overview.next && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Próximo: <strong>{overview.next.time} · {overview.next.patientName}</strong></p>}
          <div className="mt-3">
            {overview.todays.length ? overview.todays.slice(0, 4).map(a => (
              <Link to="/agenda" key={a.id} className="flex justify-between gap-3 py-3 border-b last:border-0 text-sm">
                <span>
                  <strong>{a.patientName}</strong>
                  <span className="block text-xs text-slate-600 mt-1">{a.type} · {a.status === 'completed' ? 'Concluído' : a.time < overview.nowTime ? 'Passou do horário' : 'Agendado'}</span>
                </span>
                <span className="font-semibold text-blue-700">{a.time}</span>
              </Link>
            )) : <p className="py-8 text-sm text-slate-600">Nenhum agendamento hoje. <Link className="text-blue-700 underline" to="/agenda">Agendar atendimento</Link></p>}
            {overview.todays.length > 4 && <Link to="/agenda" className="block pt-3 text-sm text-blue-700">Ver os outros {overview.todays.length - 4} da agenda</Link>}
          </div>
        </section>

        <section className={card} aria-labelledby="dash-review">
          <h2 id="dash-review" className="font-bold flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-amber-600" aria-hidden="true" />Continuar e revisar <Scope label="Filtros" /></h2>
          <p className="text-xs text-slate-600 mt-1">Exames dos filtros sem revisão em dia, inclusive registros antigos.</p>
          <div className="mt-3">
            {drafts.length ? drafts.slice(0, 4).map(({ exam, state }) => examRow(exam, REVIEW_STATE_LABELS[state])) : <p className="py-8 text-sm text-slate-600">Nenhum exame aguardando revisão nestes filtros.</p>}
            {drafts.length > 4 && <Link to="/exames" className="block pt-3 text-sm text-blue-700">Ver os outros {drafts.length - 4} em Exames</Link>}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className={card} aria-labelledby="dash-status">
          <h2 id="dash-status" className="font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" aria-hidden="true" />Situação clínica revisada <Scope label="Filtros" /></h2>
          <p className="text-xs text-slate-600 mt-1">Situação definida pelo profissional. Percentuais sobre os {filtered.length} exames dos filtros.</p>
          <table className="w-full text-sm mt-4">
            <caption className="sr-only">Exames por situação clínica nos filtros selecionados</caption>
            <thead><tr className="text-left text-xs text-slate-600 border-b"><th scope="col" className="py-2">Situação</th><th scope="col" className="text-right">Exames</th><th scope="col" className="text-right">%</th></tr></thead>
            <tbody>
              {([['Normalidade bilateral', counts.normal], ['Alteração audiológica', counts.altered], ['Inconclusivo', counts.inconclusive], ['Aguardando revisão', counts.draft]] as const).map(([label, value]) => (
                <tr key={label} className="border-b last:border-0">
                  <th scope="row" className="py-3 text-left font-normal">{label}</th>
                  <td className="text-right font-semibold">{value}</td>
                  <td className="text-right text-slate-600">{filtered.length ? (value / filtered.length * 100).toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={card} aria-labelledby="dash-recent">
          <div className="flex justify-between">
            <h2 id="dash-recent" className="font-bold flex gap-2 items-center"><FileText className="w-5 h-5 text-blue-600" aria-hidden="true" />Últimos exames atualizados <Scope label="Filtros" /></h2>
            <Link className="text-sm text-blue-700" to="/exames">Ver todos</Link>
          </div>
          <div className="mt-2">
            {recent.length ? recent.map(exam => examRow(exam, isReviewCurrent(exam) ? 'Revisado' : 'Aguardando revisão')) : <p className="py-8 text-sm text-slate-600">Nenhum exame nestes filtros.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
