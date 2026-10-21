import type { Audiometry } from '@/db/db';
import { SPEECH_PLOT as P, speechRecognitionPlots, speechX as x, speechY as y } from '@/lib/speechPlot';

export default function SpeechRecognitionSVG({ data }: { data?: Audiometry['logoAudiometry'] }) {
  const plots = speechRecognitionPlots(data);
  return <section className="border-t border-slate-200 pt-5 space-y-4" aria-label="Gráfico da logoaudiometria">
    <h3 className="text-base font-semibold text-slate-900">Reconhecimento de palavras por nível de apresentação</h3>
    <p className="text-sm text-slate-600">Cada ponto corresponde a uma lista aplicada. Materiais diferentes são apresentados separadamente.</p>
    {!plots.length && <p className="text-sm text-slate-600 border-l-2 border-slate-300 pl-3">Para exibir um ponto, registre o nível de apresentação e os acertos/total ou o percentual transcrito do exame.</p>}
    {plots.map(plot => <figure key={plot.material} className="space-y-2">
      <figcaption className="text-sm font-semibold text-slate-800">{plot.label} · OD: círculo · OE: X</figcaption>
      <svg viewBox={`0 0 ${P.width} ${P.height}`} role="img" aria-label={`Reconhecimento de ${plot.label.toLowerCase()}: percentual por nível em dB NA`} className="w-full max-w-2xl bg-white">
        <title>{`${plot.label}: resultados registrados de OD e OE`}</title>
        <desc>Pontos medidos, sem curva estimada ou faixa normativa. Eixo horizontal: nível de apresentação em dB NA. Eixo vertical: acertos em porcentagem.</desc>
        {[0, 20, 40, 60, 80, 100].map(v => <g key={v}><line x1={P.left} x2={P.right} y1={y(v)} y2={y(v)} stroke="#e2e8f0"/><text x={P.left-10} y={y(v)+4} textAnchor="end" fontSize="12" fill="#475569">{v}</text></g>)}
        {[-10, 0, 20, 40, 60, 80, 100, 120].map(v => <g key={v}><line x1={x(v)} x2={x(v)} y1={P.top} y2={P.bottom} stroke="#e2e8f0"/><text x={x(v)} y={P.bottom+19} textAnchor="middle" fontSize="12" fill="#475569">{v}</text></g>)}
        <text x="300" y="286" textAnchor="middle" fontSize="13" fill="#334155">Nível de apresentação (dB NA)</text>
        <text x="15" y="135" textAnchor="middle" fontSize="13" fill="#334155" transform="rotate(-90 15 135)">Acertos (%)</text>
        {plot.points.map(point => <g key={point.ear}>
          {point.ear === 'right' ? <circle cx={x(point.level)} cy={y(point.percent)} r="6" fill="none" stroke={point.color} strokeWidth="2"/> : <g stroke={point.color} strokeWidth="2"><line x1={x(point.level)-6} x2={x(point.level)+6} y1={y(point.percent)-6} y2={y(point.percent)+6}/><line x1={x(point.level)-6} x2={x(point.level)+6} y1={y(point.percent)+6} y2={y(point.percent)-6}/></g>}
          <title>{`${point.label}: ${point.percent}% a ${point.level} dB NA; lista ${point.list}`}</title>
        </g>)}
      </svg>
      <ul className="text-xs text-slate-600 space-y-1">{plot.points.map(point => <li key={point.ear}>{point.label}: {point.percent}% a {point.level} dB NA · lista {point.list}</li>)}</ul>
    </figure>)}
    <p className="text-xs text-slate-600">Os registros atuais comportam um resultado por material e orelha. Esses pontos não estabelecem uma função desempenho–intensidade, PB máx ou rollover. LRF e LDV permanecem na tabela.</p>
  </section>;
}
