import { useState } from 'react';
import type { Audiometry, AudiologicalOpinion } from '@/db/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateLocalClinicalReport } from '@/services/aiAudiologyService';
import { getReviewIssues, isReviewCurrent, reviewSignature, CLINICAL_RULES_VERSION } from '@/lib/examIntegrity';
import { customConfirm } from '@/lib/dialogs';

interface Props { exam: Partial<Audiometry>; patientAge?: number; onChange: (patch: Partial<Audiometry>) => void; }

export default function AudiologicalOpinionSummary({ exam, patientAge, onChange }: Props) {
  const [message, setMessage] = useState('');
  const opinion = exam.opinion || {};
  const reviewed = isReviewCurrent(exam);
  const updateOpinion = (patch: Partial<AudiologicalOpinion>) => onChange({ opinion: { ...opinion, ...patch, workflowStatus: 'draft' } });
  const generate = async () => {
    if (exam.resultAndConduct?.trim() && !await customConfirm('Substituir o texto atual por um novo resumo dos dados registrados?')) return;
    const result = generateLocalClinicalReport(exam, patientAge);
    onChange({ resultAndConduct: result.fullLaudo, opinion: { ...opinion, ...result.opinion, clinicalStatus: undefined, clinical: '' } });
    setMessage('Resumo gerado. Revise as informações e redija o parecer e a conduta.');
  };
  const review = () => {
    const issues = getReviewIssues(exam);
    if (patientAge === undefined) issues.push('Verifique a data de nascimento do paciente e a data do exame.');
    if (issues.length) { setMessage(issues.join('\n')); return; }
    const reviewedExam = { ...exam, header: { ...exam.header, clinicalRulesVersion: CLINICAL_RULES_VERSION } };
    onChange({ header: reviewedExam.header, opinion: { ...opinion, workflowStatus: 'reviewed', reviewedAt: Date.now(), reviewedSignature: reviewSignature(reviewedExam) } });
    setMessage('Revisão registrada. Salve o exame para guardar esta versão.');
  };
  return <div className="space-y-5"><Card><CardHeader><CardTitle>Parecer e revisão profissional</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-slate-600">Revise os achados conforme idade, procedimento e referência adotada, e redija a conduta individualizada.</p>
    <div className="flex flex-wrap gap-3 items-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${reviewed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{reviewed ? 'Revisado' : 'Rascunho · aguardando revisão'}</span><Button variant="outline" onClick={generate}>Gerar resumo dos dados</Button></div>
    {patientAge !== undefined && patientAge < 18 && <p className="text-sm text-blue-800 bg-blue-50 rounded-xl p-3">Avaliação pediátrica: defina a interpretação segundo idade e desenvolvimento. O resumo preserva as medições sem atribuir classificação adulta automaticamente.</p>}
    <label className="block text-sm font-semibold">Situação clínica revisada<select aria-label="Situação clínica revisada" className="block mt-1 w-full rounded-lg border p-2 bg-white font-normal" value={opinion.clinicalStatus || ''} onChange={e => updateOpinion({ clinicalStatus: e.target.value as AudiologicalOpinion['clinicalStatus'] })}><option value="">Selecione após avaliar os resultados</option><option value="normal_bilateral">Dentro dos critérios de normalidade bilateral</option><option value="altered">Alteração audiológica</option><option value="inconclusive">Inconclusivo / avaliação incompleta</option></select></label>
    <div className="grid md:grid-cols-2 gap-4">{(['Right', 'Left'] as const).map(ear => <div key={ear} className="border rounded-xl p-4 space-y-3"><h3 className="font-bold">{ear === 'Right' ? 'Orelha direita (OD)' : 'Orelha esquerda (OE)'}</h3>{(['lossType', 'lossDegree', 'configuration'] as const).map((field, index) => {
      const key = `${field}${ear}` as keyof AudiologicalOpinion;
      const label = ['Tipo', 'Grau', 'Configuração'][index];
      return <label key={field} className="block text-xs font-semibold">{label}<Input aria-label={`${label} ${ear === 'Right' ? 'OD' : 'OE'}`} value={String(opinion[key] || '')} onChange={e => updateOpinion({ [key]: e.target.value })} placeholder="Definir conforme os achados" /></label>;
    })}</div>)}</div>
    <label className="block text-sm font-semibold">Síntese clínica<Input aria-label="Síntese clínica" value={opinion.clinical || ''} onChange={e => updateOpinion({ clinical: e.target.value })} /></label>
    <label className="block text-sm font-semibold">Parecer, limitações e conduta<textarea aria-label="Parecer, limitações e conduta" className="mt-1 w-full min-h-80 rounded-xl border border-slate-300 p-4 text-sm font-normal" value={exam.resultAndConduct || ''} onChange={e => onChange({ resultAndConduct: e.target.value })} /></label>
    <Button onClick={review} disabled={reviewed}>Confirmar revisão profissional</Button><p className="text-xs text-slate-500">Alterações nos dados, parâmetros ou texto exigem nova revisão. A exportação identifica os rascunhos.</p>
    {message && <p role="status" className="whitespace-pre-line rounded-xl bg-slate-50 border p-3 text-sm">{message}</p>}
  </CardContent></Card></div>;
}
