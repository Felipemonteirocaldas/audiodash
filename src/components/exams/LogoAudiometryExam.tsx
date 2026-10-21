import SpeechRecognitionSVG from '@/components/SpeechRecognitionSVG';
import type { LogoAudiometryData, EarTonalData, IRFPoint } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { calculatePTA, validateSpeechConcordance } from '@/lib/audiologyCalculations';
import { calculateRecognitionScore, recognitionPercentage } from '@/lib/clinicalProtocol';
import ClinicalEvidence from './ClinicalEvidence';

interface Props { allowConcordance?: boolean; logoData: { right: LogoAudiometryData; left: LogoAudiometryData }; tonalData?: { right: Partial<EarTonalData>; left: Partial<EarTonalData> }; onChange: (data: Props['logoData']) => void; }
export default function LogoAudiometryExam({ logoData, tonalData, onChange, allowConcordance = false }: Props) {
  const updateEar = (ear: 'right' | 'left', patch: Partial<LogoAudiometryData>) => onChange({ ...logoData, [ear]: { ...logoData[ear], ...patch } });
  const updatePoint = (ear: 'right' | 'left', material: 'mono' | 'dis' | 'tris', patch: Partial<IRFPoint>) => {
    const point = { ...logoData[ear]?.irf?.[material], ...patch };
    if (point.totalItems === '') point.totalItems = undefined;
    if (point.correctItems === '') point.correctItems = undefined;
    if ('totalItems' in patch || 'correctItems' in patch) point.percentage = calculateRecognitionScore(point.correctItems, point.totalItems).percent ?? '';
    updateEar(ear, { irf: { ...logoData[ear]?.irf, [material]: point } });
  };
  return <div className="space-y-5">
    <ClinicalEvidence sources={['CFFA_GUIA_2023', 'ASHA_SRT_1988', 'VAUCHER_2022', 'CARNEY_2007', 'GUTHRIE_2009', 'AAA_2020']} />
    <SpeechRecognitionSVG data={logoData} />
    {(['right', 'left'] as const).map(ear => {
      const data = logoData[ear];
      const label = ear === 'right' ? 'OD' : 'OE';
      const concordance = validateSpeechConcordance(data?.srt?.db, allowConcordance ? calculatePTA(tonalData?.[ear]).tritonal : null);
      return <Card key={ear}><CardHeader><CardTitle>Logoaudiometria · {label}</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold">Idioma<Input aria-label={`Idioma ${label}`} value={data?.language || ''} onChange={e => updateEar(ear, { language: e.target.value })} /></label>
          <label className="text-xs font-semibold">Material e referência<Input aria-label={`Material de fala ${label}`} placeholder="Nome do teste, autor/edição ou protocolo" value={data?.materialReference || ''} onChange={e => updateEar(ear, { materialReference: e.target.value })} /></label>
          <label className="text-xs font-semibold">Apresentação<select aria-label={`Apresentação ${label}`} className="block w-full border rounded-lg bg-white p-2 mt-1" value={data?.presentation || ''} onChange={e => updateEar(ear, { presentation: e.target.value as LogoAudiometryData['presentation'] })}><option value="">Selecione</option><option value="recorded">Material gravado</option><option value="live">Voz viva monitorada</option></select></label>
          <label className="text-xs font-semibold">Forma de resposta<Input aria-label={`Resposta de fala ${label}`} placeholder="Repetição, apontar figuras, conjunto aberto/fechado" value={data?.responseMode || ''} onChange={e => updateEar(ear, { responseMode: e.target.value })} /></label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">{(['srt', 'voiceDetection'] as const).map((field, index) => <div key={field} className="p-3 rounded-xl border space-y-2"><h4 className="text-xs font-bold">{index === 0 ? 'LRF · reconhecimento de fala' : 'LDV · detecção de voz'}</h4><label className="block text-xs">Nível (dB NA)<Input aria-label={`${index === 0 ? 'LRF' : 'LDV'} ${label}`} inputMode="decimal" value={data?.[field]?.db ?? ''} onChange={e => updateEar(ear, { [field]: { ...data?.[field], db: e.target.value } })} /></label><label className="block text-xs">Mascaramento aplicado e unidade<Input aria-label={`Mascaramento ${field} ${label}`} value={data?.[field]?.masking || ''} onChange={e => updateEar(ear, { [field]: { ...data?.[field], masking: e.target.value } })} /></label></div>)}</div>
        <p className={`text-xs rounded-lg border p-3 ${concordance.badgeColor}`}>{concordance.message}</p>
        <h4 className="font-semibold text-sm">Reconhecimento de palavras (IPRF)</h4><p className="text-xs text-slate-600">Registre a lista efetivamente utilizada, nível de apresentação e contagem. A porcentagem será calculada pelos acertos. Para transcrever um resultado antigo sem contagem, informe o percentual e mantenha as contagens vazias.</p>
        {(['mono', 'dis', 'tris'] as const).map((material, index) => {
          const point = data?.irf?.[material] || {};
          const counted = point.correctItems !== undefined || point.totalItems !== undefined;
          const score = recognitionPercentage(point);
          const issue = counted ? calculateRecognitionScore(point.correctItems, point.totalItems).issue : null;
          return <div key={material} className="p-3 border rounded-xl space-y-3"><h5 className="text-xs font-bold">{['Monossílabos', 'Dissílabos', 'Trissílabos'][index]} · {label}</h5><div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-xs">Identificação da lista<Input aria-label={`Lista ${material} ${label}`} value={point.listId || ''} onChange={e => updatePoint(ear, material, { listId: e.target.value })} /></label>
            <label className="text-xs">Nível de apresentação (dB NA)<Input aria-label={`Nível IPRF ${material} ${label}`} inputMode="decimal" value={point.db ?? ''} onChange={e => updatePoint(ear, material, { db: e.target.value })} /></label>
            <label className="text-xs">Mascaramento e unidade<Input aria-label={`Mascaramento IPRF ${material} ${label}`} value={point.masking || ''} onChange={e => updatePoint(ear, material, { masking: e.target.value })} /></label>
            <label className="text-xs">Palavras apresentadas<Input aria-label={`Total ${material} ${label}`} type="number" min={1} step={1} value={point.totalItems ?? ''} onChange={e => updatePoint(ear, material, { totalItems: e.target.value })} /></label>
            <label className="text-xs">Acertos<Input aria-label={`Acertos ${material} ${label}`} type="number" min={0} step={1} value={point.correctItems ?? ''} onChange={e => updatePoint(ear, material, { correctItems: e.target.value })} /></label>
            <label className="text-xs">{counted ? 'Percentual calculado (%)' : 'Percentual informado (%)'}<Input aria-label={`IPRF ${material} ${label}`} type="number" min={0} max={100} step="any" readOnly={counted} value={counted ? score ?? '' : point.percentage ?? ''} onChange={e => updatePoint(ear, material, { percentage: e.target.value })} /></label>
          </div>{issue && <p role="status" className="text-xs text-amber-800">{issue}</p>}{!issue && score !== null && <p className="text-xs text-slate-600">{counted ? `${point.correctItems}/${point.totalItems} acertos · ${score}%` : `${score}% transcrito do registro original`}</p>}</div>;
        })}
      </CardContent></Card>;
    })}
  </div>;
}
