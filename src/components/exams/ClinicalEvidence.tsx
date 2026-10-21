import { CLINICAL_SOURCES, EVIDENCE_REVIEW_DATE, type ClinicalSourceId } from '@/lib/clinicalEvidence';

export default function ClinicalEvidence({ sources }: { sources: ClinicalSourceId[] }) {
  return <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
    <summary className="cursor-pointer font-semibold text-slate-700">Referências e limites de interpretação</summary>
    <ul className="mt-3 space-y-3">{sources.map(id => <li key={id}><a className="text-blue-700 underline" href={CLINICAL_SOURCES[id].url} target="_blank" rel="noreferrer">{CLINICAL_SOURCES[id].title}</a><p className="mt-1">{CLINICAL_SOURCES[id].scope}</p></li>)}</ul>
    <p className="mt-3 text-slate-500">Consulta documental: {EVIDENCE_REVIEW_DATE.split('-').reverse().join('/')}. As fontes orientam o registro e não certificam a implementação.</p>
  </details>;
}
