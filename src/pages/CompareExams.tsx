import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import AudiogramSVG from '@/components/AudiogramSVG';
import { exportComparisonToPdf } from '@/lib/exportPdf';
import { TonalFrequency } from '@/db/db';
import { compareNR7 } from '@/lib/audiologyCalculations';
import { formatTonalValue, isReviewCurrent } from '@/lib/examIntegrity';
import { nr7ComparisonEligibility, orderForComparison } from '@/lib/examComparison';
import { reviewStatusLabel } from '@/lib/exportFormat';

export default function CompareExams() {
  const { examId1, examId2 } = useParams();
  
  const exam1 = useLiveQuery(() => db.audiometries.get(examId1 || ''), [examId1]);
  const exam2 = useLiveQuery(() => db.audiometries.get(examId2 || ''), [examId2]);
  
  const patientId = exam1?.patientId || exam2?.patientId;
  const patient = useLiveQuery(() => patientId ? db.patients.get(patientId) : undefined, [patientId]);

  const ordered = exam1 && exam2 ? orderForComparison(exam1, exam2) : null;
  const baseline = ordered?.baseline ?? null;
  const current = ordered?.current ?? null;
  const nr7 = baseline && current && patient ? nr7ComparisonEligibility(baseline, current, patient.birthDate) : null;
  const statusBadge = (exam: NonNullable<typeof exam1>) => <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${isReviewCurrent(exam) ? 'text-emerald-800 border-emerald-300 bg-emerald-50' : 'text-amber-900 border-amber-300 bg-amber-50'}`}>{reviewStatusLabel(exam)}</span>;

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
                const bPoint = baseline?.tonalData?.[ear]?.[freq];
                const cPoint = current?.tonalData?.[ear]?.[freq];
                const bVal = bPoint?.va;
                const cVal = cPoint?.va;
                
                const hasB = typeof bVal === 'number';
                const hasC = typeof cVal === 'number';
                const shift = (hasB && hasC) ? (cVal as number) - (bVal as number) : null;
                
                // Destaque descritivo: piora ≥ 15 dB em frequência isolada (NR-7, Anexo II, itens 5.3 b / 5.4 b).
                const isSignificantWorsening = shift !== null && shift >= 15;
                
                return (
                  <tr key={freq} className="hover:bg-slate-50 border-b last:border-0">
                    <td className="p-3 font-medium text-slate-900">{freq}</td>
                    <td className="p-3 text-slate-600">{bVal !== undefined ? formatTonalValue(bPoint, 'va') : '--'}</td>
                    <td className="p-3 text-slate-600">{cVal !== undefined ? formatTonalValue(cPoint, 'va') : '--'}</td>
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
          {nr7?.eligible && (() => {
            const result = compareNR7(baseline?.tonalData?.[ear], current?.tonalData?.[ear]);
            return <p className="mt-3 text-sm text-slate-700 bg-slate-50 border rounded-lg p-3"><strong>NR-7, Anexo II:</strong> {result.reason}{result.meanShift346 !== null && ` (Δ média 3–6 kHz: ${result.meanShift346} dB; Δ média 0,5–2 kHz: ${result.meanShift05to2} dB.)`}</p>;
          })()}
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
            <FileText className="w-4 h-4" /> Exportar comparativo (PDF)
          </Button>
        </div>
      </div>

      {exam1 && exam2 && exam1.patientId !== exam2.patientId ? (
        <div role="alert" className="p-8 text-center bg-red-50 text-red-800 rounded-3xl border border-red-200">Os exames selecionados pertencem a pacientes diferentes. A comparação só é feita entre exames do mesmo paciente.</div>
      ) : (!exam1 || !exam2 || !baseline || !current) ? (
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
                {statusBadge(baseline)}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Propósito</p>
                    <p className="text-sm text-slate-700 font-medium capitalize">{baseline.examPurpose || 'não informada'}</p>
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
                {statusBadge(current)}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-indigo-100/60">
                  <div>
                    <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider mb-1">Propósito</p>
                    <p className="text-sm text-indigo-900 font-medium capitalize">{current.examPurpose || 'não informada'}</p>
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
                
                <p className="mt-4 text-sm text-slate-600">Em vermelho: piora de 15 dB ou mais na frequência (destaque descritivo). NR não entra no cálculo da variação.</p>
                {(ordered?.sameDate || (nr7 && (!nr7.eligible || nr7.warnings.length > 0))) && (
                  <div role="status" className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 space-y-1">
                    {nr7 && !nr7.eligible && <p>Critérios da NR-7, Anexo II, não aplicados: {nr7.blockers.join(' ')}</p>}
                    {ordered?.sameDate && <p>Os dois exames têm a mesma data; a base é o registrado primeiro.</p>}
                    {nr7?.warnings.map(warning => <p key={warning}>{warning}</p>)}
                  </div>
                )}
                {nr7?.eligible && (
                  <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <h4 className="font-semibold text-blue-900 mb-2">Critérios da NR-7, Anexo II (itens 5.3 e 5.4)</h4>
                    <p className="text-sm text-blue-800">
                      Desencadeamento: com referência ≤ 25 dB NA em 500–8000 Hz, piora ≥ 10 dB na média de 3, 4 e 6 kHz ou ≥ 15 dB em uma dessas frequências. Agravamento (PAINPSE confirmada): piora ≥ 10 dB na média de 0,5–2 kHz ou de 3–6 kHz, ou ≥ 15 dB em frequência isolada. O diagnóstico conclusivo e a aptidão cabem ao médico do trabalho (item 6).
                    </p>
                    {!['referencial', 'admissional'].includes(baseline.examPurpose || '') && <p className="text-sm text-amber-800 mt-2">O exame mais antigo foi usado como base, mas não está marcado como referencial ou admissional. Confirme se é o exame de referência vigente (itens 4.3.1 e 5.5).</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
