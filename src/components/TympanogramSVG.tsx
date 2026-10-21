import type { TympanometryData } from '@/db/db';
import { illustrativeTympanogram, tympanometryPeak } from '@/lib/examPlot';

interface Props { rightData?: TympanometryData; leftData?: TympanometryData; }

export const TYMP_ILLUSTRATIVE_NOTICE = 'Curva ilustrativa construída a partir do pico registrado e do tipo informado. Não é o traçado medido pelo equipamento; consulte o registro original.';

export default function TympanogramSVG({ rightData, leftData }: Props) {
  const records = [rightData, leftData].map((data, i) => ({ curve: illustrativeTympanogram(data), peak: tympanometryPeak(data).point, reason: tympanometryPeak(data).reason, type: data?.recordedType || '', ear: i === 0 ? 'OD' : 'OE', color: i === 0 ? '#dc2626' : '#2563eb' }));
  const groups = [...new Set(records.flatMap(r => r.curve ? [`${r.curve.probe}/${r.curve.unit}`] : []))];
  return <div className="space-y-3">
    {records.filter(r => !r.curve).map(r => <p key={r.ear} className="text-xs text-slate-600">{r.ear}: {r.reason}</p>)}
    {groups.map(group => {
      const items = records.filter(r => r.curve && `${r.curve.probe}/${r.curve.unit}` === group);
      const first = items[0].curve!;
      const minPressure = Math.min(...items.map(r => r.curve!.minPressure));
      const maxPressure = Math.max(...items.map(r => r.curve!.maxPressure));
      const maxAdmittance = Math.max(2, ...items.flatMap(r => r.curve!.points.map(p => Math.ceil(p.admittance * 1.2 * 10) / 10)));
      const tickStep = Math.max(100, Math.ceil((maxPressure - minPressure) / 8 / 100) * 100);
      const pressureTicks = [...new Set([minPressure, 0, maxPressure, ...Array.from({ length: Math.floor((maxPressure - minPressure) / tickStep) + 1 }, (_, i) => minPressure + i * tickStep)])].sort((a, b) => a - b);
      const x = (pressure: number) => 65 + (pressure - minPressure) / (maxPressure - minPressure) * 390;
      const y = (admittance: number) => 270 - admittance / maxAdmittance * 215;
      return <figure key={group} className="space-y-2"><svg viewBox="0 0 520 345" role="img" aria-label={`Timpanograma ilustrativo: sonda ${first.probe} Hz; admitância em ${first.unit}`} className="w-full max-w-xl bg-white border rounded-lg">
        <title>{`Timpanograma ilustrativo · ${first.probe} Hz · ${first.unit}`}</title>
        <desc>{TYMP_ILLUSTRATIVE_NOTICE} Sem faixa de normalidade automática.</desc>
        <text x="260" y="22" textAnchor="middle" fontSize="14">Timpanograma ilustrativo · sonda {first.probe} Hz</text>
        {pressureTicks.map(value => <g key={value}><line x1={x(value)} y1="55" x2={x(value)} y2="270" stroke={value === 0 ? '#94a3b8' : '#e2e8f0'}/><text x={x(value)} y="290" textAnchor="middle" fontSize="11">{Number(value.toFixed(1))}</text></g>)}
        {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="65" y1={y(maxAdmittance*i/4)} x2="455" y2={y(maxAdmittance*i/4)} stroke="#e2e8f0"/><text x="57" y={y(maxAdmittance*i/4)+4} textAnchor="end" fontSize="11">{(maxAdmittance*i/4).toFixed(2)}</text></g>)}
        <text x="260" y="315" textAnchor="middle" fontSize="12">Pressão (daPa)</text>
        <text x="16" y="162" textAnchor="middle" fontSize="12" transform="rotate(-90 16 162)">Admitância ({first.unit})</text>
        {items.map(({ curve, peak, ear, color, type }) => <g key={ear}>
          <path d={curve!.points.map((p, i) => `${i ? 'L' : 'M'} ${x(p.pressure).toFixed(1)},${y(p.admittance).toFixed(1)}`).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeDasharray={ear === 'OE' ? '6,3' : undefined} data-illustrative="true"/>
          {peak && <circle cx={x(peak.pressure)} cy={y(peak.admittance)} r="4.5" fill={color}/>}
          <text x={peak ? x(peak.pressure) + 8 : 460} y={peak ? y(peak.admittance) - 9 : y(curve!.points[0].admittance) - 6} fontSize="12" fill={color} textAnchor={peak ? 'start' : 'end'}>{ear}{type ? ` · ${type === 'As' ? 'Ar' : type}` : ''}</text>
          <title>{peak ? `${ear}: pico registrado em ${peak.pressure} daPa; ${peak.admittance} ${peak.unit}` : `${ear}: sem pico identificável`}</title>
        </g>)}
        <text x="260" y="334" textAnchor="middle" fontSize="10">Curva ilustrativa · ponto = pico registrado · não é o traçado medido</text>
      </svg><figcaption className="text-xs text-slate-700 space-y-1"><p className="font-semibold text-amber-800">{TYMP_ILLUSTRATIVE_NOTICE}</p>{items.map(({ peak, ear, curve }) => <p key={ear}>{ear}: {peak ? `pressão do pico ${peak.pressure} daPa · admitância ${peak.admittance} ${peak.unit}` : 'sem pico identificável (linha plana ilustrativa)'} · sonda {curve!.probe} Hz</p>)}</figcaption></figure>;
    })}
  </div>;
}
