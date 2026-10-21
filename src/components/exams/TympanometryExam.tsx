import ClinicalEvidence from './ClinicalEvidence';
import type { TympanometryData } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import TympanogramSVG from '@/components/TympanogramSVG';
import { classifyTympanometry } from '@/lib/audiologyCalculations';

interface Props { tympanometry: { right: TympanometryData; left: TympanometryData }; adultProtocol?: boolean; ageMonths?: number; onChange: (data: Props['tympanometry']) => void; }
export default function TympanometryExam({ tympanometry, onChange, adultProtocol = false, ageMonths }: Props) {
  const update = (ear: 'right' | 'left', patch: Partial<TympanometryData>) => onChange({ ...tympanometry, [ear]: { ...tympanometry[ear], ...patch } });
  return <Card><CardHeader><CardTitle>Timpanometria · medidas do equipamento</CardTitle></CardHeader><CardContent className="space-y-5">
    <ClinicalEvidence sources={['SBFA_IMIT_2025', 'BSA_TYMP_2026', 'AAA_2020', 'BALDWIN_2006', 'CALANDRUCCIO_2006']} />
    <p className="text-sm text-slate-600">Registre as medidas obtidas e a classificação da curva examinada. Em lactentes, selecione a sonda e a referência apropriadas à idade.</p>
    <div className="grid md:grid-cols-2 gap-5">{(['right', 'left'] as const).map(ear => {
      const data = tympanometry[ear] || {};
      const label = ear === 'right' ? 'OD' : 'OE';
      const suggestion = classifyTympanometry(data, adultProtocol);
      return <div key={ear} className="border rounded-xl p-4 space-y-3"><h3 className="font-bold">{ear === 'right' ? 'Orelha direita' : 'Orelha esquerda'} ({label})</h3>
        <label className="block text-xs font-semibold">Frequência da sonda<select aria-label={`Sonda ${label}`} className="block mt-1 border rounded-lg p-2 w-full bg-white" value={data.probeFrequency || ''} onChange={e => update(ear, { probeFrequency: e.target.value as TympanometryData['probeFrequency'] })}><option value="">Não informada</option><option value="226">226 Hz</option><option value="1000">1000 Hz</option></select></label>
        <label className="block text-xs font-semibold">Pico na curva medida<select aria-label={`Pico na curva ${label}`} className="block mt-1 border rounded-lg p-2 w-full bg-white" value={data.curveShape || ''} onChange={e => update(ear, { curveShape: e.target.value as TympanometryData['curveShape'] })}><option value="">Não informado</option><option value="peaked">Pico identificável</option><option value="flat">Sem pico identificável</option></select></label>
        {(['peak', 'compliance200', 'volume'] as const).map((field, index) => <label key={field} className="block text-xs font-semibold">{['Pressão do pico (daPa)', 'Admitância (unidade registrada abaixo)', 'Volume equivalente (ml, quando aplicável)'][index]}<Input aria-label={`${['Pressão', 'Admitância', 'Volume'][index]} ${label}`} inputMode="decimal" value={data[field] ?? ''} disabled={field === 'peak' && data.curveShape === 'flat'} onChange={e => update(ear, { [field]: e.target.value })} /></label>)}
        <label className="block text-xs font-semibold">Unidade de admitância<select aria-label={`Unidade de admitância ${label}`} className="block mt-1 border rounded-lg p-2 w-full bg-white" value={data.admittanceUnit || ''} onChange={e => update(ear, { admittanceUnit: e.target.value as TympanometryData['admittanceUnit'] })}><option value="">Informe a unidade do registro original</option><option value="ml">ml equivalente (226 Hz)</option><option value="mmho">mmho (mS)</option></select></label>
        <label className="block text-xs font-semibold">Referência normativa utilizada<Input aria-label={`Referência timpanometria ${label}`} placeholder="Autor/ano, idade, sonda e método ou protocolo do equipamento" value={data.normativeReference || ''} onChange={e => update(ear, { normativeReference: e.target.value })} /></label>
        {ageMonths !== undefined && ageMonths < 9 && data.probeFrequency === '226' && <p className="text-xs rounded-lg bg-amber-50 p-3 text-amber-900">Lactente com menos de 9 meses: a SBFa (2025) recomenda sonda de 1000 Hz para recém-nascidos e lactentes (até 6 meses pela BSA; alguns autores, até 9 meses). Justifique o uso de 226 Hz e documente as limitações.</p>}
        <label className="block text-xs font-semibold">Condições, qualidade e limitações<Input aria-label={`Condições timpanometria ${label}`} placeholder="Vedação, artefatos, repetição e justificativa do protocolo" value={data.protocolNotes || ''} onChange={e => update(ear, { protocolNotes: e.target.value })} /></label>
        <label className="block text-xs font-semibold">Tipo registrado pelo profissional<select aria-label={`Tipo timpanométrico ${label}`} className="block mt-1 border rounded-lg p-2 w-full bg-white" value={data.recordedType || ''} onChange={e => update(ear, { recordedType: e.target.value as TympanometryData['recordedType'] })}><option value="">A revisar</option>{(data.probeFrequency === '1000' ? ['Normal', 'Alterada', 'Inconclusivo'] : data.probeFrequency === '226' ? ['A', 'Ar', 'Ad', 'B', 'C', 'Inconclusivo'] : ['Inconclusivo']).map(t => <option key={t} value={t}>{t === 'Ar' ? 'Ar (As)' : t}</option>)}{data.recordedType === 'As' && <option value="As">As (registro anterior)</option>}</select></label>
        <p className="text-xs text-slate-500">{data.probeFrequency === '1000' ? 'Sonda de 1000 Hz: curvas classificadas apenas como normais ou alteradas (SBFa, 2025, conforme BSA).' : data.probeFrequency === '226' ? 'Sonda de 226 Hz: classificação de Jerger para orelhas não operadas (SBFa, 2025). Valores de referência variam por equipamento.' : 'Selecione a sonda para habilitar a classificação.'}</p>
        <p className="text-xs text-slate-600">{suggestion.description}: {suggestion.interpretation}</p>
      </div>;
    })}</div>
    <h3 className="text-sm font-bold">Timpanograma ilustrativo</h3><p className="text-xs text-slate-500">A curva é desenhada a partir do pico registrado (pressão e admitância) e do tipo informado; sem pico, linha plana. Formato e largura são ilustrativos — o traçado medido deve ser consultado no equipamento ou no registro original.</p>
    <TympanogramSVG rightData={tympanometry.right} leftData={tympanometry.left} />
  </CardContent></Card>;
}
