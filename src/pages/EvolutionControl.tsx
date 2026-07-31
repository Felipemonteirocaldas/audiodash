import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, TonalFrequency } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity } from 'lucide-react';

const FREQUENCIES: TonalFrequency[] = ['500', '1000', '2000', '3000', '4000', '6000', '8000'];

export default function EvolutionControl() {
  const { patientId } = useParams();
  
  const patient = useLiveQuery(() => patientId ? db.patients.get(patientId) : undefined, [patientId]);
  const allExams = useLiveQuery(() => 
    patientId ? db.audiometries.where('patientId').equals(patientId).toArray() : []
  , [patientId]);

  if (!allExams) return <div className="p-8 text-center text-slate-500">Carregando dados...</div>;
  if (allExams.length === 0) return <div className="p-8 text-center text-slate-500">Nenhum exame encontrado para este paciente.</div>;

  // Sort oldest to newest, limit to last 10 exams
  const exams = allExams.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()).slice(-10);

  const getTonalValue = (exam: any, ear: 'right' | 'left', freq: TonalFrequency) => {
    return exam.tonalData?.[ear]?.[freq]?.va ?? '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/patients">
          <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle Evolutivo (PCA)</h1>
          <p className="text-muted-foreground mt-1">
            {patient?.name} ({patient?.cpf})
          </p>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" /> Comparativo de Limiares (VA)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-center border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="p-3 border-r border-b font-semibold bg-white w-40 text-left sticky left-0 z-10 shadow-[1px_0_0_rgba(0,0,0,0.1)]">Exame / Frequência</th>
                {exams.map((exam, i) => (
                  <th key={exam.id} className="p-3 border-r border-b font-semibold min-w-[120px]">
                    <div className="text-indigo-700">{exam.examDate.split('-').reverse().join('/')}</div>
                    <div className="text-xs font-normal text-slate-500 uppercase">{exam.examPurpose || 'Referencial'}</div>
                    <div className="text-xs font-normal text-slate-500">#{i + 1}</div>
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-50 text-slate-500 text-xs">
                <th className="p-2 border-r border-b font-medium text-left bg-white sticky left-0 z-10 shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                  Classificação / Diagnóstico
                </th>
                {exams.map(exam => (
                  <td key={exam.id} className="p-2 border-r border-b font-medium">
                     {exam.opinion?.clinical || '-'}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Orelha Direita */}
              <tr>
                <td colSpan={exams.length + 1} className="bg-red-50 text-red-700 font-bold p-2 text-left text-xs uppercase tracking-wider sticky left-0">Orelha Direita (OD)</td>
              </tr>
              {FREQUENCIES.map(freq => (
                <tr key={`OD-${freq}`} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-b font-medium bg-white text-left sticky left-0 z-10 shadow-[1px_0_0_rgba(0,0,0,0.1)]">{freq} Hz</td>
                  {exams.map((exam, i) => {
                    const val = getTonalValue(exam, 'right', freq);
                    const prevVal = i > 0 ? getTonalValue(exams[i-1], 'right', freq) : null;
                    let diffClass = "";
                    if (typeof val === 'number' && typeof prevVal === 'number') {
                      if (val > prevVal + 10) diffClass = "text-red-600 font-bold"; // Piora > 10dB
                      else if (val < prevVal - 10) diffClass = "text-emerald-600 font-bold"; // Melhora
                    }
                    return (
                      <td key={exam.id} className={`p-2 border-r border-b ${diffClass}`}>
                        {val !== 'NR' && val !== '-' ? `${val} dB` : val}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Orelha Esquerda */}
              <tr>
                <td colSpan={exams.length + 1} className="bg-blue-50 text-blue-700 font-bold p-2 text-left text-xs uppercase tracking-wider sticky left-0 mt-4">Orelha Esquerda (OE)</td>
              </tr>
              {FREQUENCIES.map(freq => (
                <tr key={`OE-${freq}`} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-b font-medium bg-white text-left sticky left-0 z-10 shadow-[1px_0_0_rgba(0,0,0,0.1)]">{freq} Hz</td>
                  {exams.map((exam, i) => {
                    const val = getTonalValue(exam, 'left', freq);
                    const prevVal = i > 0 ? getTonalValue(exams[i-1], 'left', freq) : null;
                    let diffClass = "";
                    if (typeof val === 'number' && typeof prevVal === 'number') {
                      if (val > prevVal + 10) diffClass = "text-red-600 font-bold"; // Piora > 10dB
                      else if (val < prevVal - 10) diffClass = "text-emerald-600 font-bold"; // Melhora
                    }
                    return (
                      <td key={exam.id} className={`p-2 border-r border-b ${diffClass}`}>
                         {val !== 'NR' && val !== '-' ? `${val} dB` : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 text-xs text-slate-500 bg-slate-50">
            * Pioras maiores que 10dB em relação ao exame anterior são destacadas em <span className="text-red-600 font-bold">vermelho</span>. Melhorias em <span className="text-emerald-600 font-bold">verde</span>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
