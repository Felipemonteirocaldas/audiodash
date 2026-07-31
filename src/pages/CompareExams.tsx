import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AudiogramSVG from '@/components/AudiogramSVG';

export default function CompareExams() {
  const { examId1, examId2 } = useParams();
  
  const exam1 = useLiveQuery(() => db.audiometries.get(examId1 || ''), [examId1]);
  const exam2 = useLiveQuery(() => db.audiometries.get(examId2 || ''), [examId2]);
  
  const patientId = exam1?.patientId || exam2?.patientId;
  const patient = useLiveQuery(() => patientId ? db.patients.get(patientId) : undefined, [patientId]);

  // Sort exams by date (oldest first as baseline)
  const baseline = exam1 && exam2 ? (new Date(exam1.examDate).getTime() < new Date(exam2.examDate).getTime() ? exam1 : exam2) : null;
  const current = exam1 && exam2 ? (new Date(exam1.examDate).getTime() < new Date(exam2.examDate).getTime() ? exam2 : exam1) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/patients">
          <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comparar Exames</h1>
          <p className="text-muted-foreground mt-1">
            {patient?.name} {patient?.cpf ? `(${patient.cpf})` : ''}
          </p>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-slate-200/80 shadow-sm">
              <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> 
                  Exame Referencial (Base)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="text-2xl font-bold text-slate-800">{baseline.examDate.split('-').reverse().join('/')}</div>
                <p className="text-sm text-slate-500 font-medium">Propósito: <span className="capitalize">{baseline.examPurpose || 'Referencial'}</span></p>
                <p className="text-sm text-slate-500 font-medium">Fonoaudiólogo: {baseline.header?.speechTherapist || '--'}</p>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-1 border-indigo-200/80 shadow-sm shadow-indigo-100/50">
              <CardHeader className="bg-indigo-50/30 pb-4 border-b border-indigo-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-900">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> 
                  Exame Atual
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="text-2xl font-bold text-indigo-700">{current.examDate.split('-').reverse().join('/')}</div>
                <p className="text-sm text-indigo-900/60 font-medium">Propósito: <span className="capitalize">{current.examPurpose || 'Sequencial'}</span></p>
                <p className="text-sm text-indigo-900/60 font-medium">Fonoaudiólogo: {current.header?.speechTherapist || '--'}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle>Audiograma Comparativo</CardTitle>
              <p className="text-sm text-slate-500 mt-1">As curvas do exame referencial são exibidas em tons mais claros.</p>
            </CardHeader>
            <CardContent className="p-8 flex justify-center bg-slate-50/30">
              <div className="w-full max-w-[700px] bg-white rounded-xl shadow-sm border border-slate-200/50 p-2 overflow-x-auto">
                {/* @ts-ignore */}
                <AudiogramSVG 
                  rightData={current.tonalData?.right || {}} 
                  leftData={current.tonalData?.left || {}} 
                  baselineRightData={baseline.tonalData?.right || {}}
                  baselineLeftData={baseline.tonalData?.left || {}}
                  freeFieldData={current.freeField || {}}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
