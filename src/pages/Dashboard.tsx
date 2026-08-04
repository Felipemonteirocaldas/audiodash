import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Users, Activity, FileText, ChevronRight, Clock, Calendar as CalendarIcon, Cloud, Sun, CloudRain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const patientCount = useLiveQuery(() => db.patients.count(), []) ?? 0;
  const allExams = useLiveQuery(() => db.audiometries.toArray(), []);
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const professionalName = settings?.professionalName?.split(' ')[0] || 'Doutor(a)';
  
  const recentExams = useLiveQuery(async () => {
    const exams = await db.audiometries.orderBy('examDate').reverse().limit(4).toArray();
    const examsWithPatients = await Promise.all(exams.map(async (exam) => {
      const patient = await db.patients.get(exam.patientId);
      return { ...exam, patientName: patient?.name || 'Desconhecido' };
    }));
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

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [weather, setWeather] = useState<{ temp: number | null, label: string }>({ temp: null, label: 'Buscando local...' });
  const [weatherIcon, setWeatherIcon] = useState(<Sun className="w-10 h-10 text-yellow-300" />);

  useEffect(() => {
    const fetchWeatherByIP = async () => {
      try {
        // 1. Obter localização aproximada pelo IP (sem pedir permissão)
        const ipRes = await fetch('https://ipapi.co/json/');
        if (!ipRes.ok) throw new Error('Falha ao buscar IP');
        const ipData = await ipRes.json();
        
        if (ipData.latitude && ipData.longitude) {
          const lat = ipData.latitude;
          const lon = ipData.longitude;
          const city = ipData.city || 'Sua Região';

          // 2. Buscar o clima para essa localização
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
          if (!weatherRes.ok) throw new Error('Falha ao buscar clima');
          const weatherData = await weatherRes.json();

          if (weatherData && weatherData.current_weather) {
            setWeather({ temp: Math.round(weatherData.current_weather.temperature), label: city });
            
            const code = weatherData.current_weather.weathercode;
            if (code >= 50) {
              setWeatherIcon(<CloudRain className="w-10 h-10 text-blue-200" />);
            } else if (code >= 1 && code <= 3) {
              setWeatherIcon(<Cloud className="w-10 h-10 text-slate-200" />);
            } else {
              setWeatherIcon(<Sun className="w-10 h-10 text-yellow-300" />);
            }
            return;
          }
        }
        throw new Error('Dados incompletos');
      } catch (error) {
        console.error('Erro ao buscar clima/localização silenciosa:', error);
        setWeather({ temp: 24, label: 'Clima' }); // Fallback
      }
    };

    fetchWeatherByIP();
  }, []);

  const greeting = time.getHours() < 12 ? 'Bom dia' : time.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  
  // Auditory Situation Logic
  const totalExams = allExams?.length || 0;
  let normalCount = 0;
  let alteradoOcupacional = 0;
  let alteradoNaoOcupacional = 0;
  let semClassificacao = 0;

  if (allExams) {
    allExams.forEach(exam => {
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
  
  const getPercent = (val: number) => totalExams > 0 ? ((val / totalExams) * 100).toFixed(1) : '0.0';

  return (
    <div className="pb-12 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{greeting}, {professionalName}</h1>
          <p className="text-slate-500 mt-1">Aqui está o resumo da sua clínica hoje.</p>
        </div>
      </div>

      {patientCount === 0 && totalExams === 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-slate-800">
              Bem-vindo(a) ao AudioDash! 🎉
            </h2>
            <p className="text-slate-500 max-w-xl text-sm leading-relaxed">
              O seu painel está vazio por enquanto, mas não por muito tempo. Para que os gráficos e a inteligência do sistema comecem a funcionar, cadastre o seu primeiro paciente e faça o primeiro laudo.
            </p>
          </div>
          <div className="flex gap-3 shrink-0 relative z-10 w-full md:w-auto">
            <Link to="/pacientes" className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              Cadastrar 1º Paciente
            </Link>
          </div>
        </div>
      )}

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6 auto-rows-[minmax(120px,auto)]">

        {/* 1. RELÓGIO & CLIMA (Col: 3) */}
        <div className="lg:col-span-3 md:col-span-2 row-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-5xl font-bold tracking-tighter mb-2 text-slate-800">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-slate-500 font-medium">
              {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-4 mt-6 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500 mb-1">{weather.label}</div>
                <div className="text-2xl font-bold text-slate-800">
                  {weather.temp !== null ? `${weather.temp}°C` : '--°C'}
                </div>
              </div>
              {weatherIcon}
            </div>
          </div>
        </div>

        {/* 2. SITUAÇÃO AUDITIVA (Col: 6) */}
        <div className="lg:col-span-6 md:col-span-4 row-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-lg">Situação Auditiva (Geral)</h3>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 flex-1 items-center justify-center">
            {/* Tabela */}
            <div className="flex-1 w-full text-sm overflow-x-auto">
              <table className="w-full min-w-[300px]">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="text-left pb-2 font-medium">Situação</th>
                    <th className="text-right pb-2 font-medium">N</th>
                    <th className="text-right pb-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr>
                    <td className="py-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>Normal</td>
                    <td className="py-2 text-right font-medium">{normalCount}</td>
                    <td className="py-2 text-right text-slate-500">{getPercent(normalCount)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>Alterado Ocupacional</td>
                    <td className="py-2 text-right font-medium">{alteradoOcupacional}</td>
                    <td className="py-2 text-right text-slate-500">{getPercent(alteradoOcupacional)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></div>Alterado Não Ocup.</td>
                    <td className="py-2 text-right font-medium">{alteradoNaoOcupacional}</td>
                    <td className="py-2 text-right text-slate-500">{getPercent(alteradoNaoOcupacional)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300 shrink-0"></div>Sem classificação</td>
                    <td className="py-2 text-right font-medium">{semClassificacao}</td>
                    <td className="py-2 text-right text-slate-500">{getPercent(semClassificacao)}%</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2">Total de Alterados</td>
                    <td className="py-2 text-right text-red-600">{totalAlterados}</td>
                    <td className="py-2 text-right text-red-600">{getPercent(totalAlterados)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Gráfico Donut Simulado (CSS) */}
            <div 
              className="relative w-40 h-40 shrink-0 flex items-center justify-center rounded-full transition-transform duration-300 hover:scale-105" 
              title={`Total de Exames: ${totalExams} | Alterados: ${totalAlterados}`}
              style={{ background: `conic-gradient(#10b981 0% ${getPercent(normalCount)}%, #f59e0b ${getPercent(normalCount)}% ${Number(getPercent(normalCount)) + Number(getPercent(alteradoOcupacional))}%, #f97316 ${Number(getPercent(normalCount)) + Number(getPercent(alteradoOcupacional))}% ${Number(getPercent(normalCount)) + Number(getPercent(alteradoOcupacional)) + Number(getPercent(alteradoNaoOcupacional))}%, #cbd5e1 ${Number(getPercent(normalCount)) + Number(getPercent(alteradoOcupacional)) + Number(getPercent(alteradoNaoOcupacional))}% 100%)` }}>
              <div className="absolute inset-0 m-4 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                 <span className="text-2xl font-bold text-slate-800">{totalExams}</span>
                 <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Exames</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. ATALHOS RÁPIDOS (Col: 3) */}
        <div className="lg:col-span-3 md:col-span-4 row-span-1 flex flex-col gap-3 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
          <Link
            to="/pacientes"
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl p-4 font-semibold transition-colors group"
          >
            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Novo Paciente
          </Link>
          <Link to="/pacientes" className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center gap-2 p-4 font-semibold transition-colors">
            <Users className="w-5 h-5" /> Ver Pacientes
          </Link>
        </div>

        {/* 4. TOTAL PACIENTES (Col: 3) */}
        <div className="lg:col-span-3 md:col-span-2 row-span-1 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex items-center justify-between">
           <div>
             <div className="text-sm text-slate-500 font-medium mb-1">Total de Pacientes</div>
             <div className="text-4xl font-bold text-slate-800">{patientCount}</div>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
             <Users className="w-6 h-6 text-blue-500" />
           </div>
        </div>

        {/* 5. AGENDA / HOJE (Col: 6) */}
        <div className="lg:col-span-6 md:col-span-4 row-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col relative overflow-hidden">
          <CalendarIcon className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-50" />
          <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2 relative z-10">
             <CalendarIcon className="w-5 h-5 text-indigo-500" /> Agenda de Hoje
          </h3>
          <div className="space-y-4 relative z-10 flex-1 flex flex-col">
             {todayAppointments && todayAppointments.length > 0 ? (
               todayAppointments.map(app => (
                 <Link to="/agenda" key={app.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center hover:bg-slate-100 transition-colors group cursor-pointer block">
                    <div>
                       <div className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">{app.patientName}</div>
                       <div className="text-sm text-slate-500">{app.type}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-semibold">{app.time}</div>
                      <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                    </div>
                 </Link>
               ))
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
              <CalendarIcon className="w-8 h-8 text-blue-300" />
            </div>
            <div>
              <p className="text-slate-500 font-medium">Nenhum agendamento para hoje.</p>
              <p className="text-sm text-slate-400 mt-1">Sua agenda está livre.</p>
            </div>
            <Link to="/agenda" className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl text-sm shadow-sm hover:bg-blue-700 transition-colors">
              Agendar Paciente
            </Link>
          </div>
             )}
          </div>
        </div>

        {/* 6. ÚLTIMOS EXAMES (Col: 6) */}
        <div className="lg:col-span-6 md:col-span-4 row-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" /> Últimos Exames
            </h3>
            <Link to="/exames" className="text-sm text-indigo-600 font-medium hover:underline">Ver todos</Link>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            {recentExams?.length ? recentExams.map(exam => (
              <Link key={exam.id} to={`/exame/${exam.id}`} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold">
                    {exam.patientName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">{exam.patientName}</div>
                    <div className="text-xs text-slate-500">{exam.examDate.split('-').reverse().join('/')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
            )) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <p className="text-slate-500 font-medium">Nenhum exame recente.</p>
                <p className="text-sm text-slate-400 mt-1">Você ainda não realizou exames.</p>
              </div>
              <Link to="/exame/novo" className="px-5 py-2.5 bg-indigo-50 text-indigo-700 font-semibold rounded-xl text-sm hover:bg-indigo-100 transition-colors border border-indigo-100">
                Fazer o 1º Exame
              </Link>
            </div>
          )}
          </div>
        </div>

      </div>
    </div>
  );
}
