import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import AudiogramSVG from '@/components/AudiogramSVG';
import { exportComparisonToPdf } from '@/lib/exportPdf';
import { TonalFrequency } from '@/db/db';

export default function CompareExams() {
  const { examId1, examId2 } = useParams();
  
  const exam1 = useLiveQuery(() => db.audiometries.get(examId1 || ''), [examId1]);
  const exam2 = useLiveQuery(() => db.audiometries.get(examId2 || ''), [examId2]);
  
  const patientId = exam1?.patientId || exam2?.patientId;
  const patient = useLiveQuery(() => patientId ? db.patients.get(patientId) : undefined, [patientId]);

  // Sort exams by date (oldest first as baseline)
  const baseline = exam1 && exam2 ? (new Date(exam1.examDate).getTime() < new Date(exam2.examDate).getTime() ? exam1 : exam2) : null;
  const current = exam1 && exam2 ? (new Date(exam1.examDate).getTime() < new Date(exam2.examDate).getTime() ? exam2 : exam1) : null;

  const handleExportPdf = async () => {
    if (baseline && current && patient) {
      await exportComparisonToPdf(baseline, current, patient);
    }
  };

  const FREQUENCIES: TonalFrequency[] = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];

  const renderComparisonTable = (ear: 'right' | 'left', title: string) => {
    return (
      <div className="w-full mt-8">
        <h3 className="font-bold text-lg mb-3">{title}</h3>
        <div>
          <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="p-3 border-b font-semibold">Frequência (Hz)</th>
                <th className="p-3 border-b font-semibold">Base (dB)</th>
                <th className="p-3 border-b font-semibold">Atual (dB)</th>
                <th className="p-3 border-b font-semibold">Variação (Δ)</th>
              </tr>
            </thead>
            <tbody>
              {FREQUENCIES.map(freq => {
                const bVal = baseline?.tonalData?.[ear]?.[freq]?.va;
                const cVal = current?.tonalData?.[ear]?.[freq]?.va;
                
                const hasB = typeof bVal === 'number';
                const hasC = typeof cVal === 'number';
                const shift = (hasB && hasC) ? (cVal as number) - (bVal as number) : null;
                
                // Highlight worsening (shift >= 10 dB)
                const isSignificantWorsening = shift !== null && shift >= 10;
                
                return (
                  <tr key={freq} className="hover:bg-slate-50 border-b last:border-0">
                    <td className="p-3 font-medium text-slate-900">{freq}</td>
                    <td className="p-3 text-slate-600">{bVal !== undefined ? bVal : '--'}</td>
                    <td className="p-3 text-slate-600">{cVal !== undefined ? cVal : '--'}</td>
                    <td className="p-3 font-semibold">
                      {shift !== null ? (
                        <span className={
                          isSignificantWorsening 
                            ? "text-red-600 bg-red-50 px-2 py-1 rounded-md" 
                            : (shift < 0 ? "text-emerald-600" : "text-slate-600")
                        }>
                          {shift > 0 ? `+${shift}` : shift} dB
                        </span>
                      ) : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <Link to="/exames">
          <Button variant="outline" size="icon" className="w-10 h-10 rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comparar Exames</h1>
          <p className="text-muted-foreground mt-1">
            {patient?.name} {patient?.cpf ? `(${patient.cpf})` : ''}
          </p>
        </div>
        <div className="ml-auto">
          <Button onClick={handleExportPdf} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
            <FileText className="w-4 h-4" /> Exportar Laudo (PDF)
          </Button>
        </div>
      </div>

      {(!exam1 || !exam2 || !baseline || !current) ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-12 h-12 text-slate-300 mx-auto mb-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
          <h3 className="text-lg font-medium text-slate-700">Buscando exames...</h3>
          <p className="text-slate-500 mt-1">Se a demora persistir, os exames podem ter sido excluídos.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 font-bold text-sm">
              VS
            </div>

            <Card className="relative overflow-hidden border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-x-0 top-0 h-1 bg-slate-300"></div>
              <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> 
                  Exame Referencial (Base)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-extrabold tracking-tight text-slate-800">{baseline.examDate.split('-').reverse().join('/')}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Propósito</p>
                    <p className="text-sm text-slate-700 font-medium capitalize">{baseline.examPurpose || 'Referencial'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Fonoaudiólogo</p>
                    <p className="text-sm text-slate-700 font-medium truncate">{baseline.header?.speechTherapist || '--'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white">
              <div className="absolute inset-x-0 top-0 h-1 bg-indigo-500"></div>
              <CardHeader className="bg-indigo-50/30 pb-4 border-b border-indigo-100/60">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span> 
                  Exame Atual
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-extrabold tracking-tight text-indigo-700">{current.examDate.split('-').reverse().join('/')}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-indigo-100/60">
                  <div>
                    <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider mb-1">Propósito</p>
                    <p className="text-sm text-indigo-900 font-medium capitalize">{current.examPurpose || 'Sequencial'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider mb-1">Fonoaudiólogo</p>
                    <p className="text-sm text-indigo-900 font-medium truncate">{current.header?.speechTherapist || '--'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-[2rem] border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-6">
              <CardTitle className="text-xl">Audiograma Comparativo</CardTitle>
              <p className="text-sm text-slate-500 mt-1">As curvas do exame referencial são exibidas em tons mais claros.</p>
            </CardHeader>
            <CardContent className="p-4 sm:p-8 flex flex-col items-center bg-slate-50/50">
              <div className="w-full max-w-[800px] bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4">
                {/* @ts-ignore */}
                <AudiogramSVG 
                  rightData={current.tonalData?.right || {}} 
                  leftData={current.tonalData?.left || {}} 
                  baselineRightData={baseline.tonalData?.right || {}}
                  baselineLeftData={baseline.tonalData?.left || {}}
                  freeFieldData={current.freeField || {}}
                />
              </div>

              <div className="w-full max-w-[900px] mt-12 mb-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Análise Técnica (Shift)</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {renderComparisonTable('right', 'Ouvido Direito (OD)')}
                  {renderComparisonTable('left', 'Ouvido Esquerdo (OE)')}
                </div>
                
                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <h4 className="font-semibold text-blue-900 mb-2">Critérios de Piora Significativa (NR-7)</h4>
                  <p className="text-sm text-blue-800">
                    O sistema destaca em vermelho qualquer variação positiva (piora) igual ou superior a 10 dB na Via Aérea, facilitando a identificação visual de possível Desencadeamento ou Agravamento (ex: alteração nos limiares de 3, 4 e 6 kHz). Variações negativas indicam melhora nos limiares.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
