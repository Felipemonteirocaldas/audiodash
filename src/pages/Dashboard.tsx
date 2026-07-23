import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Users, Activity, Plus, WifiOff, Clock, ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import bgImage from '@/assets/pexels-olly-3891209.jpg';

export default function Dashboard() {
  const patientCount = useLiveQuery(() => db.patients.count(), []) ?? 0;
  const examCount = useLiveQuery(() => db.audiometries.count(), []) ?? 0;
  
  const recentExams = useLiveQuery(async () => {
    const exams = await db.audiometries.orderBy('examDate').reverse().limit(5).toArray();
    const examsWithPatients = await Promise.all(exams.map(async (exam) => {
      const patient = await db.patients.get(exam.patientId);
      return { ...exam, patientName: patient?.name || 'Desconhecido' };
    }));
    return examsWithPatients;
  }, []);

  return (
    <>
      {/* BACKGROUND IMAGE PARA A TELA TODA */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat blur-[6px] scale-105 opacity-70 pointer-events-none" 
        style={{ backgroundImage: `url('${bgImage}')` }}
      ></div>
      {/* OVERLAY PARA GARANTIR LEGIBILIDADE */}
      <div className="fixed inset-0 z-0 bg-white/40 pointer-events-none"></div>

      <div className="pb-12 relative z-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Visão geral do seu sistema clínico.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        
        {/* Hero Card - spans 2 cols, 2 rows */}
        <div className="md:col-span-2 lg:col-span-2 md:row-span-2 rounded-[2rem] border border-white/40 bg-white/40 backdrop-blur-xl p-10 shadow-sm flex flex-col justify-between group overflow-hidden relative min-h-[300px]">
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/60 to-transparent pointer-events-none"></div>
            
            <div className="z-10 relative">
                <h2 className="text-4xl font-semibold tracking-tight text-slate-900 mb-3">Bem-vindo ao AudioDash</h2>
                <p className="text-slate-700 max-w-sm text-lg leading-relaxed font-medium">Gerencie pacientes e crie laudos audiométricos premium, sem depender de internet.</p>
            </div>
            <div className="z-10 relative mt-12 flex flex-wrap gap-4">
                <Link to="/exam/new" className="bg-slate-900 text-white hover:bg-slate-800 font-semibold px-7 py-3.5 rounded-2xl transition-all shadow-md flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Novo Exame
                </Link>
                <Link to="/patients" className="bg-white/80 backdrop-blur-md border border-slate-200/50 text-slate-800 hover:bg-white font-semibold px-7 py-3.5 rounded-2xl transition-all flex items-center gap-2">
                  <Users className="w-5 h-5" /> Pacientes
                </Link>
            </div>
            
            {/* Decorative element - ultra soft */}
            <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full blur-3xl group-hover:scale-105 transition-transform duration-1000"></div>
        </div>

        {/* Stat 1 */}
        <Link to="/patients" className="md:col-span-1 lg:col-span-1 rounded-[2rem] bg-white border border-slate-200/60 p-8 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-slate-300/80 transition-all flex flex-col justify-between min-h-[160px] group cursor-pointer block">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs uppercase tracking-widest text-slate-400">Pacientes</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <div className="text-5xl font-semibold tracking-tight text-slate-900">{patientCount}</div>
            <div className="text-sm text-slate-500 font-medium mt-2">Registrados no sistema</div>
          </div>
        </Link>

        {/* Stat 2 */}
        <Link to="/patients" className="md:col-span-1 lg:col-span-1 rounded-[2rem] bg-white border border-slate-200/60 p-8 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-slate-300/80 transition-all flex flex-col justify-between min-h-[160px] group cursor-pointer block">
          <div className="flex items-center justify-between text-slate-500 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs uppercase tracking-widest text-slate-400">Exames</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <div className="text-5xl font-semibold tracking-tight text-slate-900">{examCount}</div>
            <div className="text-sm text-slate-500 font-medium mt-2">Laudos gerados</div>
          </div>
        </Link>

        {/* System Status / Offline Ready */}
        <div className="md:col-span-2 lg:col-span-2 rounded-[2rem] bg-slate-50/50 border border-slate-200/60 p-8 flex flex-col md:flex-row items-start md:items-center gap-6 min-h-[160px]">
            <div className="relative shrink-0">
               <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-200/50">
                  <WifiOff className="w-7 h-7 text-slate-700" />
               </div>
               <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
               <h3 className="font-semibold text-xl text-slate-900 mb-1.5">100% Offline Ready</h3>
               <p className="text-slate-500 font-medium text-sm leading-relaxed">Seus dados e laudos estão seguros e salvos localmente neste dispositivo. Nenhuma internet é necessária.</p>
            </div>
        </div>

        {/* Recent Exams List */}
        <div className="md:col-span-3 lg:col-span-4 rounded-[2rem] bg-white border border-slate-200/60 shadow-sm overflow-hidden mt-2">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
             <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
               <Clock className="w-5 h-5 text-slate-400" /> Últimos Exames
             </h3>
             <Link to="/patients" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
               Ver Banco Completo &rarr;
             </Link>
          </div>
          <div className="divide-y divide-slate-100/80">
             {recentExams?.map(exam => (
                <Link key={exam.id} to={`/exam/new/${exam.patientId}`} className="flex items-center justify-between p-7 hover:bg-slate-50/80 transition-colors group">
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-semibold text-lg group-hover:bg-slate-200 transition-colors">
                       {exam.patientName.charAt(0).toUpperCase()}
                     </div>
                     <div>
                       <h4 className="font-semibold text-lg text-slate-900 group-hover:text-black transition-colors mb-0.5">{exam.patientName}</h4>
                       <p className="text-sm text-slate-500 font-medium">{new Date(exam.examDate).toLocaleDateString('pt-BR')} • Ver laudo</p>
                     </div>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600 group-hover:bg-white transition-all shadow-sm">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </Link>
             ))}
             {recentExams?.length === 0 && (
               <div className="p-16 text-center">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                     <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <h4 className="text-slate-900 font-semibold text-lg mb-1">Nenhum exame realizado</h4>
                  <p className="text-slate-500 font-medium">Clique no botão "Novo Exame" no painel acima para começar.</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
