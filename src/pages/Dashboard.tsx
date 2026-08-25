import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  Activity,
  FileText,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Cloud,
  Sun,
  CloudRain,
  PlusCircle,
  UserPlus,
  Stethoscope,
  CalendarPlus,
  ClipboardList,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const patientCount = useLiveQuery(() => db.patients.count(), []) ?? 0;
  const allExams = useLiveQuery(() => db.audiometries.toArray(), []);
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const professionalName = settings?.professionalName?.split(' ')[0] || 'Doutor(a)';

  const recentExams = useLiveQuery(async () => {
    const exams = await db.audiometries.orderBy('examDate').reverse().limit(4).toArray();
    const examsWithPatients = await Promise.all(
      exams.map(async (exam) => {
        const patient = await db.patients.get(exam.patientId);
        return { ...exam, patientName: patient?.name || 'Desconhecido' };
      })
    );
    return examsWithPatients;
  }, []);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAppointments = useLiveQuery(async () => {
    return await db.appointments
      .where('date')
      .equals(today)
      .and(app => app.status !== 'canceled')
      .sortBy('time');
  }, [today]);

  const nextAppointment = useMemo(() => {
    if (!todayAppointments || todayAppointments.length === 0) return null;
    const nowStr = format(new Date(), 'HH:mm');
    // find upcoming or the current one
    const upcoming = todayAppointments.find(a => a.time >= nowStr && a.status !== 'completed');
    return upcoming || todayAppointments[0];
  }, [todayAppointments]);

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [weather, setWeather] = useState<{ temp: number | null; label: string }>({
    temp: null,
    label: 'Buscando local...'
  });
  const [weatherIcon, setWeatherIcon] = useState(<Sun className="w-10 h-10 text-yellow-400" />);

  useEffect(() => {
    const fetchWeatherByIP = async () => {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        if (!ipRes.ok) throw new Error('Falha ao buscar IP');
        const ipData = await ipRes.json();

        if (ipData.latitude && ipData.longitude) {
          const lat = ipData.latitude;
          const lon = ipData.longitude;
          const city = ipData.city || 'Sua Região';

          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
          );
          if (!weatherRes.ok) throw new Error('Falha ao buscar clima');
          const weatherData = await weatherRes.json();

          if (weatherData && weatherData.current_weather) {
            setWeather({
              temp: Math.round(weatherData.current_weather.temperature),
              label: city
            });

            const code = weatherData.current_weather.weathercode;
            if (code >= 50) {
              setWeatherIcon(<CloudRain className="w-10 h-10 text-blue-400" />);
            } else if (code >= 1 && code <= 3) {
              setWeatherIcon(<Cloud className="w-10 h-10 text-slate-400" />);
            } else {
              setWeatherIcon(<Sun className="w-10 h-10 text-yellow-400" />);
            }
            return;
          }
        }
        throw new Error('Dados incompletos');
      } catch (error) {
        console.error('Erro ao buscar clima/localização silenciosa:', error);
        setWeather({ temp: 24, label: 'Clima' });
      }
    };

    fetchWeatherByIP();
  }, []);

  const greeting =
    time.getHours() < 12
      ? 'Bom dia'
      : time.getHours() < 18
      ? 'Boa tarde'
      : 'Boa noite';

  // Auditory Situation Logic
  const totalExams = allExams?.length || 0;
  let normalCount = 0;
  let alteradoOcupacional = 0;
  let alteradoNaoOcupacional = 0;
  let semClassificacao = 0;

  // Current month exams count
  const currentMonthPrefix = format(new Date(), 'yyyy-MM');
  const monthExamsCount = useMemo(() => {
    if (!allExams) return 0;
    return allExams.filter(e => e.examDate && e.examDate.startsWith(currentMonthPrefix)).length;
  }, [allExams, currentMonthPrefix]);

  if (allExams) {
    allExams.forEach((exam) => {
      const clinico = exam.opinion?.clinical?.toLowerCase() || '';
      const isOcupacional = exam.examCategory === 'ocupacional';

      if (clinico.includes('normal')) {
        normalCount++;
      } else if (clinico.includes('alterado') || clinico !== '') {
        if (isOcupacional) alteradoOcupacional++;
        else alteradoNaoOcupacional++;
      } else {
        semClassificacao++;
      }
    });
  }

  const totalAlterados = alteradoOcupacional + alteradoNaoOcupacional;
  const getPercent = (val: number) =>
    totalExams > 0 ? ((val / totalExams) * 100).toFixed(1) : '0.0';

  return (
    <div className="pb-12 space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {greeting}, {professionalName}
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Aqui está o panorama de atendimentos e a situação audiológica da sua clínica hoje.
          </p>
        </div>

        {/* Global Action Link */}
        <Link
          to="/exame/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] hover:bg-blue-600 text-white text-sm font-semibold shadow-sm hover:shadow transition"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          <span>Iniciar Novo Exame</span>
        </Link>
      </div>

      {/* Onboarding Empty State */}
      {patientCount === 0 && totalExams === 0 && (
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 shadow-md text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              Bem-vindo(a) ao AudioDash!
            </h2>
            <p className="text-blue-100 max-w-xl text-sm leading-relaxed">
              O seu painel está pronto para uso. Cadastre o seu primeiro paciente e realize o primeiro exame audiológico para desbloquear a inteligência estatística e os gráficos automáticos.
            </p>
          </div>
          <div className="flex gap-3 shrink-0 relative z-10 w-full md:w-auto">
            <Link
              to="/pacientes"
              className="flex-1 md:flex-none px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar 1º Paciente
            </Link>
          </div>
        </div>
      )}

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6 auto-rows-[minmax(120px,auto)]">

        {/* 1. RELÓGIO & CLIMA (Col: 3) */}
        <div className="lg:col-span-3 md:col-span-2 row-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="text-5xl font-extrabold tracking-tighter mb-1 text-slate-800">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-slate-500 font-medium capitalize text-sm">
              {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-4 mt-6 border border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{weather.label}</div>
              <div className="text-2xl font-bold text-slate-800">
                {weather.temp !== null ? `${weather.temp}°C` : '--°C'}
              </div>
            </div>
            {weatherIcon}
          </div>
        </div>

        {/* 2. SITUAÇÃO AUDITIVA GERAL (Col: 6) */}
        <div className="lg:col-span-6 md:col-span-4 row-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Situação Auditiva (Geral)</h3>
              <p className="text-xs text-slate-400">Distribuição clínica dos laudos cadastrados</p>
            </div>
            <div className="p-2 bg-blue-50 text-[#0071e3] rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 flex-1 items-center justify-center">
            {/* Tabela de Resultados */}
            <div className="flex-1 w-full text-xs sm:text-sm">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 text-xs">
                    <th className="text-left pb-2 font-semibold">Situação</th>
                    <th className="text-right pb-2 font-semibold">N</th>
                    <th className="text-right pb-2 font-semibold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  <tr>
                    <td className="py-2 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                      <span>Normal</span>
                    </td>
                    <td className="py-2 text-right font-semibold">{normalCount}</td>
                    <td className="py-2 text-right text-slate-500">{getPercent(normalCount)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></div>
                      <span>Alterado Ocupacional (PAIR)</span>
                    </td>
                    <td className="py-2 text-right font-semibold">{alteradoOcupacional}</td>
                    <td className="py-2 text-right text-slate-500">{getPercent(alteradoOcupacional)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0"></div>
                      <span>Alterado Clínico (Não Ocup.)</span>
                    </td>
                    <td className="py-2 text-right font-semibold">{alteradoNaoOcupacional}</td>
                    <td className="py-2 text-right text-slate-500">{getPercent(alteradoNaoOcupacional)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></div>
                      <span>Sem classificação</span>
                    </td>
                    <td className="py-2 text-right font-semibold">{semClassificacao}</td>
                    <td className="py-2 text-right text-slate-500">{getPercent(semClassificacao)}%</td>
                  </tr>
                  <tr className="font-bold text-slate-900 border-t border-slate-200">
                    <td className="pt-2.5">Total de Alterados</td>
                    <td className="pt-2.5 text-right text-rose-600">{totalAlterados}</td>
                    <td className="pt-2.5 text-right text-rose-600">{getPercent(totalAlterados)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Gráfico Donut */}
            <div
              className="relative w-36 h-36 shrink-0 flex items-center justify-center rounded-full transition-transform duration-300 hover:scale-105 shadow-inner"
              title={`Total de Exames: ${totalExams} | Alterados: ${totalAlterados}`}
              style={{
                background:
                  totalExams > 0
                    ? `conic-gradient(#10b981 0% ${getPercent(normalCount)}%, #f59e0b ${getPercent(
                        normalCount
                      )}% ${
                        Number(getPercent(normalCount)) + Number(getPercent(alteradoOcupacional))
                      }%, #f97316 ${
                        Number(getPercent(normalCount)) + Number(getPercent(alteradoOcupacional))
                      }% ${
                        Number(getPercent(normalCount)) +
                        Number(getPercent(alteradoOcupacional)) +
                        Number(getPercent(alteradoNaoOcupacional))
                      }%, #cbd5e1 ${
                        Number(getPercent(normalCount)) +
                        Number(getPercent(alteradoOcupacional)) +
                        Number(getPercent(alteradoNaoOcupacional))
                      }% 100%)`
                    : '#f1f5f9'
              }}
            >
              <div className="absolute inset-0 m-3.5 bg-white rounded-full flex flex-col items-center justify-center shadow-xs">
                <span className="text-2xl font-extrabold text-slate-800">{totalExams}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  Exames
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. CENTRAL DE AÇÕES RÁPIDAS (Col: 3 - 4 Botões Inteligentes) */}
        <div className="lg:col-span-3 md:col-span-4 row-span-2 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <h4 className="font-bold text-slate-900 text-sm">Ações Clínicas Rápidas</h4>
            <p className="text-xs text-slate-400">Atalhos para as tarefas mais comuns</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 flex-1">
            <Link
              to="/exame/novo"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/80 hover:bg-blue-100/80 border border-blue-100 text-[#0071e3] transition group text-center"
            >
              <Stethoscope className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xs">Novo Exame</span>
            </Link>

            <Link
              to="/pacientes"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-100 text-emerald-700 transition group text-center"
            >
              <UserPlus className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xs">Novo Paciente</span>
            </Link>

            <Link
              to="/agenda"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/80 hover:bg-purple-100/80 border border-purple-100 text-purple-700 transition group text-center"
            >
              <CalendarPlus className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xs">Nova Consulta</span>
            </Link>

            <Link
              to="/pacientes"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-100 text-amber-700 transition group text-center"
            >
              <ClipboardList className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xs">Prontuários</span>
            </Link>
          </div>

          {/* Mini Totalizador */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Exames no Mês: <strong className="text-slate-800 font-bold">{monthExamsCount}</strong></span>
            <span>Pacientes: <strong className="text-slate-800 font-bold">{patientCount}</strong></span>
          </div>
        </div>

        {/* 4. AGENDA DE HOJE / PRÓXIMO ATENDIMENTO (Col: 6) */}
        <div className="lg:col-span-6 md:col-span-4 row-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
            <Link
              to="/agenda"
              className="font-bold text-slate-900 hover:text-[#0071e3] transition text-lg flex items-center gap-2"
            >
              <CalendarIcon className="w-5 h-5 text-[#0071e3]" />
              <span>Agenda de Hoje</span>
              {todayAppointments && todayAppointments.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                  {todayAppointments.length}
                </span>
              )}
            </Link>
            <Link
              to="/agenda"
              className="text-xs bg-[#0071e3] text-white hover:bg-blue-600 px-3 py-1.5 rounded-xl font-semibold transition shadow-xs whitespace-nowrap"
            >
              + Agendar
            </Link>
          </div>

          {nextAppointment && (
            <div className="mb-3 p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl flex items-center justify-between text-xs relative z-10">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 animate-pulse"></span>
                <span className="font-medium text-slate-600 truncate">
                  Próximo: <strong className="text-slate-900">{nextAppointment.patientName}</strong> ({nextAppointment.type})
                </span>
              </div>
              <span className="font-bold text-[#0071e3] bg-white px-2 py-0.5 rounded-lg border border-blue-200 shrink-0">
                {nextAppointment.time}
              </span>
            </div>
          )}

          <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-start">
            {todayAppointments && todayAppointments.length > 0 ? (
              todayAppointments.slice(0, 3).map((app) => (
                <Link
                  to="/agenda"
                  key={app.id}
                  className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 flex justify-between items-center hover:bg-blue-50/50 hover:border-blue-100 transition group cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-semibold text-slate-900 text-sm group-hover:text-[#0071e3] transition truncate">
                      {app.patientName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{app.type}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="bg-blue-100/70 text-[#0071e3] px-2.5 py-1 rounded-lg text-xs font-bold">
                      {app.time}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <CalendarIcon className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-800 font-semibold text-sm">Nenhum agendamento para hoje</p>
                  <p className="text-xs text-slate-400 mt-0.5">Sua agenda de hoje está livre</p>
                </div>
                <Link
                  to="/agenda"
                  className="px-4 py-2 bg-blue-50 text-[#0071e3] hover:bg-blue-100 font-semibold rounded-xl text-xs transition"
                >
                  Agendar Horário
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 5. ÚLTIMOS EXAMES (Col: 6) */}
        <div className="lg:col-span-6 md:col-span-4 row-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Últimos Exames</h3>
            </div>
            <Link
              to="/exames"
              className="text-xs font-semibold text-[#0071e3] hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-start space-y-2">
            {recentExams && recentExams.length > 0 ? (
              recentExams.map((exam) => (
                <Link
                  key={exam.id}
                  to={`/exame/${exam.id}`}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0071e3] font-bold text-xs flex items-center justify-center shrink-0">
                      {exam.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm text-slate-800 group-hover:text-[#0071e3] transition truncate">
                        {exam.patientName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {exam.examDate ? exam.examDate.split('-').reverse().join('/') : '--'} •{' '}
                        {exam.examCategory === 'ocupacional' ? 'Ocupacional' : 'Clínico'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition shrink-0" />
                </Link>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-slate-300" />
                </div>
                <div>
                  <p className="text-slate-800 font-semibold text-sm">Nenhum exame realizado ainda</p>
                  <p className="text-xs text-slate-400 mt-0.5">Os laudos mais recentes aparecerão aqui</p>
                </div>
                <Link
                  to="/exame/novo"
                  className="px-4 py-2 bg-blue-50 text-[#0071e3] hover:bg-blue-100 font-semibold rounded-xl text-xs transition"
                >
                  Fazer 1º Exame
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
