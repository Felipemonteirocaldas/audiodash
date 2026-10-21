import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Activity, CalendarDays, ChevronRight, ClipboardCheck, FileText, Plus, Users, CloudUpload } from 'lucide-react';
import { db } from '@/db/db';
import { ageAtExam, isReviewCurrent, localDate } from '@/lib/examIntegrity';
import { nextScheduledAppointment, summarizeExams } from '@/lib/clinicalOverview';

export default function Dashboard() {
  const [time, setTime] = useState(new Date());
  const [period, setPeriod] = useState('month');
  const [population, setPopulation] = useState('all');
  useEffect(() => { const timer = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(timer); }, []);
  const data = useLiveQuery(async () => {
    try {
      const [patients, exams, appointments, settings] = await Promise.all([db.patients.toArray(), db.audiometries.toArray(), db.appointments.toArray(), db.settings.toCollection().first()]);
      return { patients, exams, appointments, settings, error: '' };
    } catch { return { patients: [], exams: [], appointments: [], settings: undefined, error: 'Não foi possível carregar o painel. Recarregue para tentar novamente.' }; }
  }, []);
  if (!data) return <p role="status" className="p-8 text-slate-600">Carregando atendimentos e exames…</p>;
  if (data.error) return <p role="alert" className="p-5 border rounded-xl bg-red-50 text-red-800">{data.error}</p>;
  const today = localDate(time);
  const patientMap = new Map(data.patients.map(p => [p.id, p]));
  const filtered = data.exams.filter(exam => {
    if (period === 'month' && !exam.examDate.startsWith(today.slice(0, 7))) return false;
    if (period === 'today' && exam.examDate !== today) return false;
    if (population !== 'all') {
      const age = ageAtExam(patientMap.get(exam.patientId)?.birthDate, exam.examDate);
      if (!age || (population === 'children' ? age.years >= 18 : age.years < 18)) return false;
    }
    return true;
  });
  const counts = summarizeExams(filtered);
  const appointments = data.appointments.filter(a => a.date === today && a.status !== 'canceled').sort((a, b) => a.time.localeCompare(b.time));
  const next = nextScheduledAppointment(appointments, time.toTimeString().slice(0, 5));
  const drafts = [...filtered].filter(e => !isReviewCurrent(e)).sort((a, b) => b.updatedAt - a.updatedAt);
  const recent = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  const pending = [...data.exams, ...data.patients, ...data.appointments].filter(r => r.syncStatus === 'pending').length;
  const name = data.settings?.professionalName?.split(' ')[0] || '';
  const card = 'bg-white border border-slate-200 rounded-2xl p-5 shadow-sm';
  const examRow = (exam: typeof filtered[number]) => <Link key={exam.id} to={`/exame/${exam.id}`} className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0 hover:text-blue-700"><div className="min-w-0"><p className="font-semibold truncate">{patientMap.get(exam.patientId)?.name || 'Paciente não encontrado'}</p><p className="text-xs text-slate-500 mt-1">{exam.examDate.split('-').reverse().join('/')} · {isReviewCurrent(exam) ? 'Revisado' : 'Aguardando revisão'}</p></div><ChevronRight className="w-4 h-4 shrink-0"/></Link>;
  return <div className="space-y-6 pb-10">
    <div className="flex flex-wrap justify-between items-center gap-4"><div><p className="text-xs text-slate-500 capitalize">{time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1 className="text-3xl font-bold text-slate-900 mt-1">Atendimentos{name ? `, ${name}` : ''}</h1><p className="text-sm text-slate-500 mt-1">Agenda, continuidade dos exames e revisão clínica.</p></div><Link to="/exame/novo" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-blue-600 text-white font-semibold"><Plus className="w-4 h-4"/>Novo exame</Link></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[
      { label: 'Agendamentos hoje', value: appointments.length, icon: CalendarDays, note: `${appointments.filter(a => a.status === 'scheduled').length} aguardando atendimento` },
      { label: 'Exames para revisar', value: counts.draft, icon: ClipboardCheck, note: 'No período e público selecionados' },
      { label: 'Pacientes cadastrados', value: data.patients.length, icon: Users, note: 'Total do cadastro' },
      { label: 'Registros com envio pendente', value: pending, icon: CloudUpload, note: 'Pacientes, exames e agenda' }
    ].map(({ label, value, icon: Icon, note }) => <div key={label} className={card}><div className="flex justify-between text-slate-500 text-xs font-semibold"><span>{label}</span><Icon className="w-4 h-4 text-blue-600"/></div><p className="text-3xl font-bold mt-3">{value}</p><p className="text-xs text-slate-500 mt-2">{note}</p></div>)}</div>
    <div className="grid lg:grid-cols-2 gap-5">
      <section className={card}><div className="flex justify-between items-center"><h2 className="font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-blue-600"/>Agenda de hoje</h2><Link to="/agenda" className="text-sm text-blue-700">Abrir agenda</Link></div>{next && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Próximo: <strong>{next.time} · {next.patientName}</strong></p>}<div className="mt-3">{appointments.length ? appointments.slice(0, 4).map(a => <Link to="/agenda" key={a.id} className="flex justify-between gap-3 py-3 border-b last:border-0 text-sm"><span><strong>{a.patientName}</strong><span className="block text-xs text-slate-500 mt-1">{a.type} · {a.status === 'completed' ? 'Concluído' : 'Agendado'}</span></span><span className="font-semibold text-blue-700">{a.time}</span></Link>) : <p className="py-8 text-sm text-slate-500">Nenhum agendamento hoje. <Link className="text-blue-700" to="/agenda">Agendar atendimento</Link></p>}</div></section>
      <section className={card}><h2 className="font-bold flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-amber-600"/>Continuar e revisar</h2><p className="text-xs text-slate-500 mt-1">Exames no filtro selecionado, incluindo registros antigos ainda sem revisão.</p><div className="mt-3">{drafts.length ? drafts.slice(0, 4).map(examRow) : <p className="py-8 text-sm text-slate-500">Nenhum exame aguardando revisão neste filtro.</p>}</div></section>
    </div>
    <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-slate-50 border p-4"><label className="text-xs font-semibold">Período<select aria-label="Período do painel" className="block mt-1 rounded-lg border bg-white p-2 min-w-40" value={period} onChange={e => setPeriod(e.target.value)}><option value="month">Este mês</option><option value="today">Hoje</option><option value="all">Todo o histórico</option></select></label><label className="text-xs font-semibold">Público (idade no exame)<select aria-label="Público do painel" className="block mt-1 rounded-lg border bg-white p-2 min-w-40" value={population} onChange={e => setPopulation(e.target.value)}><option value="all">Todos</option><option value="adults">Adultos · 18 anos ou mais</option><option value="children">Crianças e adolescentes</option></select></label><p className="text-xs text-slate-500 pb-2">{filtered.length} exames no filtro · registros sem data de nascimento aparecem apenas em Todos.</p></div>
    <div className="grid lg:grid-cols-2 gap-5"><section className={card}><h2 className="font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600"/>Situação clínica revisada</h2><p className="text-xs text-slate-500 mt-1">Situação definida pelo profissional. Percentuais sobre os {filtered.length} exames do filtro.</p><table className="w-full text-sm mt-4"><thead><tr className="text-left text-xs text-slate-500 border-b"><th className="py-2">Situação</th><th className="text-right">Exames</th><th className="text-right">%</th></tr></thead><tbody>{[['Normalidade bilateral', counts.normal], ['Alteração audiológica', counts.altered], ['Inconclusivo', counts.inconclusive], ['Aguardando revisão', counts.draft]].map(([label, value]) => <tr key={label} className="border-b last:border-0"><td className="py-3">{label}</td><td className="text-right font-semibold">{value}</td><td className="text-right text-slate-500">{filtered.length ? (Number(value)/filtered.length*100).toFixed(1) : '—'}</td></tr>)}</tbody></table></section><section className={card}><div className="flex justify-between"><h2 className="font-bold flex gap-2 items-center"><FileText className="w-5 h-5 text-blue-600"/>Últimos exames atualizados</h2><Link className="text-sm text-blue-700" to="/exames">Ver todos</Link></div><div className="mt-2">{recent.length ? recent.map(examRow) : <p className="py-8 text-sm text-slate-500">Nenhum exame neste filtro.</p>}</div></section></div>
  </div>;
}
