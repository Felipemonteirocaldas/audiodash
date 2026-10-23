import { SPEECH_PLOT as SP, speechRecognitionPlots, speechX, speechY } from '@/lib/speechPlot';
import { airConductionPath, plottedLevel, OCTAVE_FREQUENCIES, illustrativeTympanogram, tympanometryPeak } from '@/lib/examPlot';
import { frequencyOctaveOffset } from '@/lib/clinicalProtocol';
import { recognitionPercentage } from '@/lib/clinicalProtocol';
import { formatTonalValue, hasRecordedValue, isReviewCurrent, ageAtExam, professionalClassificationLines, examProfessional, CLINICAL_STATUS_LABELS } from '@/lib/examIntegrity';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Svg, Line, Path, Circle, Polygon, Polyline, Rect, G, Image } from '@react-pdf/renderer';
import { Audiometry, Patient, Settings, db, EarTonalData, TonalFrequency } from '@/db/db';
import { customAlert } from '@/lib/dialogs';
import { calculatePTA, classifyTympanometry, compareNR7, degreeStandardLabel } from '@/lib/audiologyCalculations';
import { letterheadLines } from '@/lib/letterhead';
import { ENT_REFERRAL_TEXT, meatoscopyText, reflexConventionText } from '@/lib/examForm';

const METHOD_LABELS: Record<string, string> = { conventional: 'audiometria convencional', play: 'audiometria lúdica condicionada', vra: 'reforço visual (VRA)', observation: 'observação comportamental' };
const RESPONSE_LABELS: Record<string, string> = { threshold: 'limiar auditivo', minimum_response: 'nível mínimo de resposta' };
const RELIABILITY_LABELS: Record<string, string> = { good: 'boa', limited: 'limitada', inconclusive: 'inconclusiva' };
const tympLabel = (type: string) => type === 'Inconclusivo' ? '-' : type === 'Normal' || type === 'Alterada' ? `Curva ${type.toLowerCase()}` : `Tipo ${type === 'As' ? 'As (Ar)' : type}`;

const FREQUENCIES: TonalFrequency[] = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
const FREQ_OFFSETS: Record<string, number> = Object.fromEntries(FREQUENCIES.map(frequency => [frequency, frequencyOctaveOffset(frequency)]));

const SVG_WIDTH = 600;
const SVG_HEIGHT = 600;
const MARGIN = { top: 40, right: 70, bottom: 40, left: 50 };
const INNER_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

const getX = (freq: string) => MARGIN.left + (FREQ_OFFSETS[freq] / 6) * INNER_WIDTH;
const getY = (dbVal: number) => MARGIN.top + ((dbVal + 10) / 130) * INNER_HEIGHT;

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    lineHeight: 1.25
  },
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomStyle: 'solid',
    borderBottomColor: '#1e3a8a',
    paddingBottom: 6,
    marginBottom: 6
  },
  headerLogo: {
    width: 60,
    height: 40,
    objectFit: 'contain'
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8
  },
  clinicName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  headerSub: {
    fontSize: 7.5,
    color: '#475569',
    marginTop: 1.5,
    textAlign: 'center'
  },
  patientBox: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    borderRadius: 3,
    padding: 5,
    marginBottom: 6,
    backgroundColor: '#f8fafc'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1.5
  },
  label: {
    fontWeight: 'bold',
    color: '#0f172a',
    fontSize: 7.5
  },
  val: {
    color: '#334155',
    fontSize: 7.5
  },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    backgroundColor: '#f1f5f9',
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: '#2563eb',
    paddingVertical: 2.5,
    paddingHorizontal: 5,
    marginBottom: 3,
    color: '#1e3a8a',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  mainLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4
  },
  leftCol: {
    width: '49%'
  },
  rightCol: {
    width: '49%'
  },
  chartContainer: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    borderRadius: 3,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    padding: 2
  },
  table: {
    width: '100%',
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#cbd5e1',
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: '#cbd5e1',
    marginBottom: 4
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    fontWeight: 'bold'
  },
  tableCell: {
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: '#cbd5e1',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#cbd5e1',
    paddingVertical: 2,
    paddingHorizontal: 2,
    flex: 1,
    textAlign: 'center',
    fontSize: 7
  },
  tableCellFreq: {
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: '#cbd5e1',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#cbd5e1',
    paddingVertical: 2,
    paddingHorizontal: 2,
    flex: 1.1,
    fontWeight: 'bold',
    backgroundColor: '#f1f5f9',
    textAlign: 'center',
    fontSize: 7
  },
  ptaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 3,
    padding: 3.5,
    marginBottom: 4
  },
  reportBox: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    borderRadius: 3,
    padding: 5,
    minHeight: 40,
    marginBottom: 6,
    backgroundColor: '#ffffff'
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    paddingTop: 6
  },
  signatureLine: {
    width: 240,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#0f172a',
    marginBottom: 2
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 6.5,
    bottom: 12,
    right: 24,
    color: '#94a3b8'
  },
  emissionStamp: {
    fontSize: 6.5,
    color: '#94a3b8',
    marginTop: 2
  }
});

// Timpanograma ILUSTRATIVO no PDF (mesma construção da tela; ver illustrativeTympanogram em examPlot).
const TympanogramPdf = ({ right, left }: { right?: Audiometry['tympanometry']['right']; left?: Audiometry['tympanometry']['left'] }) => {
  const items = [{ data: right, ear: 'OD', color: '#dc2626' }, { data: left, ear: 'OE', color: '#2563eb' }].map(item => ({ ...item, curve: illustrativeTympanogram(item.data), peak: tympanometryPeak(item.data).point })).filter(item => item.curve);
  const groups = [...new Set(items.map(item => `${item.curve!.probe}/${item.curve!.unit}`))];
  if (!groups.length) return null;
  const W = 260, H = 150, L = 34, R = 10, T = 16, B = 26;
  return <View style={{ marginTop: 4 }}>{groups.map(group => {
    const groupItems = items.filter(item => `${item.curve!.probe}/${item.curve!.unit}` === group);
    const first = groupItems[0].curve!;
    const minP = Math.min(...groupItems.map(i => i.curve!.minPressure)), maxP = Math.max(...groupItems.map(i => i.curve!.maxPressure));
    const maxY = Math.max(2, ...groupItems.flatMap(i => i.curve!.points.map(p => Math.ceil(p.admittance * 1.2 * 10) / 10)));
    const x = (p: number) => L + (p - minP) / (maxP - minP) * (W - L - R);
    const y = (a: number) => H - B - a / maxY * (H - B - T);
    const ticks = Array.from({ length: Math.floor((maxP - minP) / 100) + 1 }, (_, i) => minP + i * 100).filter(v => v % 200 === 0 || v === 0);
    return <View key={group} style={{ width: W }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Text x={W / 2} y={10} style={{ fontSize: 7 }} fill="#0f172a" textAnchor="middle">{`Timpanograma ilustrativo · sonda ${first.probe} Hz`}</Text>
        {ticks.map(v => <Line key={`tp_${v}`} x1={x(v)} y1={T} x2={x(v)} y2={H - B} stroke={v === 0 ? '#94a3b8' : '#e2e8f0'} strokeWidth={0.6} />)}
        {ticks.map(v => <Text key={`tpt_${v}`} x={x(v)} y={H - B + 9} style={{ fontSize: 6 }} fill="#475569" textAnchor="middle">{String(v)}</Text>)}
        {[0, 0.5, 1].map(f => <Line key={`ta_${f}`} x1={L} y1={y(maxY * f)} x2={W - R} y2={y(maxY * f)} stroke="#e2e8f0" strokeWidth={0.6} />)}
        {[0, 0.5, 1].map(f => <Text key={`tat_${f}`} x={L - 3} y={y(maxY * f) + 2} style={{ fontSize: 6 }} fill="#475569" textAnchor="end">{(maxY * f).toFixed(1)}</Text>)}
        <Text x={W / 2} y={H - 6} style={{ fontSize: 6 }} fill="#475569" textAnchor="middle">{`Pressão (daPa) · admitância (${first.unit})`}</Text>
        {groupItems.map(item => <Path key={`tc_${item.ear}`} d={item.curve!.points.map((p, i) => `${i ? 'L' : 'M'} ${x(p.pressure).toFixed(1)},${y(p.admittance).toFixed(1)}`).join(' ')} fill="none" stroke={item.color} strokeWidth={1.4} {...(item.ear === 'OE' ? { strokeDasharray: '4,2' } : {})} />)}
        {groupItems.filter(item => item.peak).map(item => <Circle key={`tk_${item.ear}`} cx={x(item.peak!.pressure)} cy={y(item.peak!.admittance)} r={2.5} fill={item.color} />)}
      </Svg>
      <Text style={{ fontSize: 6, color: '#92400e' }}>Curva ilustrativa a partir do pico registrado (OD contínua, OE tracejada). Não é o traçado medido pelo equipamento.</Text>
    </View>;
  })}</View>;
};

const AudiogramPdfSVG = ({ rightData, leftData, freeFieldData }: { rightData: Partial<EarTonalData>, leftData: Partial<EarTonalData>, freeFieldData?: Partial<EarTonalData> }) => {
  const renderGrid = () => {
    const lines = [];
    for (let db = -10; db <= 120; db += 10) {
      const y = getY(db);
      lines.push(<Line key={`hy_${db}`} x1={MARGIN.left} y1={y} x2={SVG_WIDTH - MARGIN.right} y2={y} stroke={db === 0 ? "#64748b" : "#cbd5e1"} strokeWidth={db === 0 ? 1.5 : 0.75} />);
      lines.push(
        <Text key={`hy_t_${db}`} x={MARGIN.left - 5} y={y + 3} style={{ fontSize: 9 }} fill="#475569" textAnchor="end">
          {db}
        </Text>
      );
    }
    FREQUENCIES.forEach(freq => {
      const x = getX(freq);
      lines.push(<Line key={`vx_${freq}`} x1={x} y1={MARGIN.top} x2={x} y2={SVG_HEIGHT - MARGIN.bottom} stroke="#cbd5e1" strokeWidth={0.75} {...(OCTAVE_FREQUENCIES.has(freq) ? {} : { strokeDasharray: "3,3" })} />);
      lines.push(
        <Text key={`vx_t_${freq}`} x={x - 8} y={MARGIN.top - 8} style={{ fontSize: 9 }} fill="#475569">
          {freq}
        </Text>
      );
    });
    return lines;
  };

  const renderPath = (data: Partial<EarTonalData> | undefined, color: string, dasharray: string) => {
    if (!data) return null;
    const path = airConductionPath(data, getX, getY);
    if (!path) return null;
    return (
      <Path 
        d={path}
        fill="none" 
        stroke={color} 
        strokeWidth={2} 
        {...(dasharray && dasharray !== '0' ? { strokeDasharray: dasharray } : {})} 
      />
    );
  };

  const renderSymbol = (x: number, y: number, type: string, color: string, isNR: boolean, offsetDirection: 1 | 0 | -1) => {
    let symbol = null;
    switch (type) {
      case 'OD_VA': 
        symbol = <Circle cx={x} cy={y} r={5} fill="none" stroke={color} strokeWidth={1.8} />;
        break;
      case 'OD_VA_MASK': 
        symbol = <Polygon points={`${x},${y-6} ${x-6},${y+4} ${x+6},${y+4}`} fill="none" stroke={color} strokeWidth={1.8} />;
        break;
      case 'OE_VA': 
        symbol = (
          <G stroke={color} strokeWidth={1.8}>
            <Line x1={x-5} y1={y-5} x2={x+5} y2={y+5} />
            <Line x1={x+5} y1={y-5} x2={x-5} y2={y+5} />
          </G>
        );
        break;
      case 'OE_VA_MASK': 
        symbol = <Rect x={x-5} y={y-5} width={10} height={10} fill="none" stroke={color} strokeWidth={1.8} />;
        break;
      case 'OD_VO': 
        symbol = <Polyline points={`${x+5},${y-6} ${x-3},${y} ${x+5},${y+6}`} fill="none" stroke={color} strokeWidth={1.8} />;
        break;
      case 'OD_VO_MASK': 
        symbol = <Polyline points={`${x+3},${y-6} ${x-3},${y-6} ${x-3},${y+6} ${x+3},${y+6}`} fill="none" stroke={color} strokeWidth={1.8} />;
        break;
      case 'OE_VO': 
        symbol = <Polyline points={`${x-5},${y-6} ${x+3},${y} ${x-5},${y+6}`} fill="none" stroke={color} strokeWidth={1.8} />;
        break;
      case 'OE_VO_MASK': 
        symbol = <Polyline points={`${x-3},${y-6} ${x+3},${y-6} ${x-3},${y+6} ${x+3},${y+6}`} fill="none" stroke={color} strokeWidth={1.8} />;
        break;
      case 'FREE_FIELD':
        symbol = <Text x={x-4} y={y+4} style={{ fontSize: 10, fontWeight: 'bold' }} fill={color}>S</Text>;
        break;
    }

    if (type === 'FREE_FIELD' || type === 'OD_VO' || type === 'OE_VO') offsetDirection = 0;
    return (
      <G key={`${x}-${y}-${type}`}>
        {symbol}
        {isNR && (
          <G stroke={color} strokeWidth={1.8} fill="none">
            <Line x1={x + (offsetDirection * 5)} y1={y + 5} x2={x + (offsetDirection * 12)} y2={y + 12} />
            <Polyline points={offsetDirection === 0 ? `${x-4},${y+8} ${x},${y+12} ${x+4},${y+8}` : `${x + offsetDirection*12},${y+8} ${x + offsetDirection*12},${y+12} ${x + offsetDirection*8},${y+12}`} />
          </G>
        )}
      </G>
    );
  };

  const renderDataPoints = () => {
    const points: React.ReactNode[] = [];
    FREQUENCIES.forEach(freq => {
      const x = getX(freq);
      
      const r = rightData[freq];
      if (r) {
        if (plottedLevel(r, 'va') !== null) {
          const isNR = r.va === 'NR';
          const y = getY(plottedLevel(r, 'va')!);
          points.push(renderSymbol(x, y, r.maskedVa ? 'OD_VA_MASK' : 'OD_VA', '#dc2626', isNR, -1));
        }
        if (plottedLevel(r, 'vo') !== null) {
          const isNR = r.vo === 'NR';
          const y = getY(plottedLevel(r, 'vo')!);
          points.push(renderSymbol(x - 8, y, r.maskedVo ? 'OD_VO_MASK' : 'OD_VO', '#dc2626', isNR, -1));
        }
      }

      const l = leftData[freq];
      if (l) {
        if (plottedLevel(l, 'va') !== null) {
          const isNR = l.va === 'NR';
          const y = getY(plottedLevel(l, 'va')!);
          points.push(renderSymbol(x, y, l.maskedVa ? 'OE_VA_MASK' : 'OE_VA', '#2563eb', isNR, 1));
        }
        if (plottedLevel(l, 'vo') !== null) {
          const isNR = l.vo === 'NR';
          const y = getY(plottedLevel(l, 'vo')!);
          points.push(renderSymbol(x + 8, y, l.maskedVo ? 'OE_VO_MASK' : 'OE_VO', '#2563eb', isNR, 1));
        }
      }

      if (freeFieldData && plottedLevel(freeFieldData[freq], 'va') !== null) {
        const ff = freeFieldData[freq];
        const isNR = ff?.va === 'NR';
        const y = getY(plottedLevel(ff, 'va')!);
        points.push(renderSymbol(x, y, 'FREE_FIELD', '#10b981', isNR, 1));
      }
    });
    return points;
  };

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <Svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} style={{ width: 240, height: 240 }}>
        <Text x={SVG_WIDTH / 2 - 35} y={MARGIN.top - 20} style={{ fontSize: 10, fontWeight: 'bold' }} fill="#0f172a">Frequência (Hz)</Text>
        <Text x={10} y={SVG_HEIGHT / 2 + 40} style={{ fontSize: 10, fontWeight: 'bold' }} fill="#0f172a" transform="rotate(-90 10 300)">Nível de audição (dB NA)</Text>
        
        {renderGrid()}
        {renderPath(rightData, '#dc2626', '0')}
        {renderPath(leftData, '#2563eb', '0')}
        {renderPath(freeFieldData, '#10b981', '0')}
        {renderDataPoints()}
      </Svg>
      <Text style={{ fontSize: 6.5, marginTop: 5, width: '100%', color: '#475569', lineHeight: 1.3 }}>OD: O / triângulo mascarado. OE: X / quadrado mascarado. VO: chevron / colchete mascarado. S: campo livre, sem lateralidade. Seta: ausência de resposta no nível registrado. VO sem mascaramento não identifica isoladamente a cóclea respondente.</Text>
    </View>
  );
};

function SpeechRecognitionPdf({ data }: { data?: Audiometry['logoAudiometry'] }) {
  const plots = speechRecognitionPlots(data);
  if (!plots.length) return null;
  return <View style={{ marginTop: 10 }}>
    <Text style={S.subTitle}>Reconhecimento de palavras por nível de apresentação</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {plots.map(plot => <View key={plot.material} wrap={false} style={{ width: '50%', paddingRight: 8, marginBottom: 8 }}>
        <Text style={{ fontSize: 7.5, color: '#475569', marginBottom: 2 }}>{plot.label} · OD: círculo · OE: X</Text>
        <Svg viewBox={`0 0 ${SP.width} ${SP.height}`} style={{ width: 240, height: 120 }}>
          {[0, 20, 40, 60, 80, 100].map(value => <G key={value}><Line x1={SP.left} x2={SP.right} y1={speechY(value)} y2={speechY(value)} stroke="#cbd5e1" strokeWidth={0.75}/><Text x={SP.left-22} y={speechY(value)+4} style={{ fontSize: 12 }}>{value}</Text></G>)}
          {[-10, 0, 20, 40, 60, 80, 100, 120].map(value => <G key={value}><Line x1={speechX(value)} x2={speechX(value)} y1={SP.top} y2={SP.bottom} stroke="#cbd5e1" strokeWidth={0.75}/><Text x={speechX(value)-8} y={SP.bottom+20} style={{ fontSize: 12 }}>{value}</Text></G>)}
          <Text x={185} y={288} style={{ fontSize: 13 }}>Nível de apresentação (dB NA)</Text>
          <Text x={14} y={160} transform="rotate(-90 14 160)" style={{ fontSize: 13 }}>Acertos (%)</Text>
          {plot.points.map(point => point.ear === 'right' ? <Circle key={point.ear} cx={speechX(point.level)} cy={speechY(point.percent)} r={6} fill="none" stroke={point.color} strokeWidth={2}/> : <G key={point.ear} stroke={point.color} strokeWidth={2}><Line x1={speechX(point.level)-6} x2={speechX(point.level)+6} y1={speechY(point.percent)-6} y2={speechY(point.percent)+6}/><Line x1={speechX(point.level)-6} x2={speechX(point.level)+6} y1={speechY(point.percent)+6} y2={speechY(point.percent)-6}/></G>)}
        </Svg>
        {plot.points.map(point => <Text key={point.ear} style={{ fontSize: 7, color: '#334155' }}>{point.label}: {point.percent}% a {point.level} dB NA · lista {point.list}.</Text>)}
      </View>)}
    </View>
    <Text style={S.note}>Pontos registrados, separados por material. Não estabelecem função desempenho–intensidade, PB máx ou rollover.</Text>
  </View>;
}

export interface PdfExportOptions {
  includeMeatoscopy?: boolean;
  includeTonalChart?: boolean;
  includeTonalTable?: boolean;
  includePTA?: boolean;
  includeLogo?: boolean;
  includeImmitance?: boolean;
  includeComplementary?: boolean;
  includeOpinion?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Laudo (A4 retrato). Grade de 8 pt: margens de 36 pt, seções separadas por 14 pt, rótulos em
// caixa-alta pequena e valores em 8,5-9 pt. Só entram seções com dados registrados.
// ---------------------------------------------------------------------------------------------
const INK = '#0f172a', MUTED = '#475569', FAINT = '#94a3b8', LINE = '#e2e8f0', BORDER = '#cbd5e1', BRAND = '#1e3a8a', OD = '#dc2626', OE = '#2563eb';

const S = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 58, paddingHorizontal: 36, fontFamily: 'Helvetica', fontSize: 8.5, lineHeight: 1.35, color: INK, backgroundColor: '#ffffff' },
  runningHeader: { position: 'absolute', top: 20, left: 36, right: 36, fontSize: 7, color: FAINT },
  pageFooter: { position: 'absolute', bottom: 24, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopStyle: 'solid', borderTopColor: BORDER, paddingTop: 5, fontSize: 6.5, color: FAINT },
  letterhead: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomStyle: 'solid', borderBottomColor: BRAND, paddingBottom: 10, marginBottom: 14 },
  logo: { width: 64, height: 44, objectFit: 'contain' },
  logoSpacer: { width: 64 },
  letterheadCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  clinicName: { fontSize: 14, fontWeight: 'bold', color: BRAND, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  letterheadLine: { fontSize: 8, color: MUTED, marginTop: 2, textAlign: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  docTitle: { fontSize: 15, fontWeight: 'bold', color: INK },
  docSubtitle: { fontSize: 8, color: MUTED, marginTop: 2 },
  pill: { borderWidth: 0.75, borderStyle: 'solid', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, fontSize: 7, fontWeight: 'bold' },
  card: { backgroundColor: '#f8fafc', borderWidth: 0.75, borderStyle: 'solid', borderColor: BORDER, borderRadius: 4, paddingTop: 9, paddingBottom: 3, paddingHorizontal: 10, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  fieldLabel: { fontSize: 6.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1.5 },
  fieldValue: { fontSize: 9, color: INK },
  cardDivider: { borderTopWidth: 0.5, borderTopStyle: 'solid', borderTopColor: BORDER, marginTop: 2, paddingTop: 7 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 9.5, fontWeight: 'bold', color: BRAND, textTransform: 'uppercase', letterSpacing: 0.4, borderBottomWidth: 0.75, borderBottomStyle: 'solid', borderBottomColor: BORDER, paddingBottom: 3, marginBottom: 8 },
  subTitle: { fontSize: 8, fontWeight: 'bold', color: INK, marginBottom: 3 },
  note: { fontSize: 7, color: MUTED, marginTop: 4, lineHeight: 1.3 },
  columns: { flexDirection: 'row', justifyContent: 'space-between' },
  chartBox: { width: 255, borderWidth: 0.75, borderStyle: 'solid', borderColor: BORDER, borderRadius: 4, padding: 5, alignItems: 'center' },
  table: { borderWidth: 0.75, borderStyle: 'solid', borderColor: BORDER, borderRadius: 2 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomStyle: 'solid', borderBottomColor: LINE },
  trLast: { flexDirection: 'row' },
  th: { backgroundColor: '#f1f5f9' },
  td: { paddingVertical: 3.5, paddingHorizontal: 5, fontSize: 8, textAlign: 'center' },
  tdLabel: { backgroundColor: '#f8fafc', fontWeight: 'bold', textAlign: 'left' },
  statBox: { flex: 1, borderWidth: 0.75, borderStyle: 'solid', borderColor: BORDER, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 7 },
  kvRow: { flexDirection: 'row', marginBottom: 3 },
  kvLabel: { width: 78, fontWeight: 'bold', fontSize: 8 },
  kvValue: { flex: 1, fontSize: 8, color: '#334155' },
  opinionBox: { borderLeftWidth: 2.5, borderLeftStyle: 'solid', borderLeftColor: '#2563eb', backgroundColor: '#f8fafc', paddingVertical: 7, paddingHorizontal: 10, marginTop: 4 },
  signature: { alignItems: 'center', marginTop: 26 },
  signatureLine: { width: 230, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: INK, marginBottom: 3 }
});

const fmtDate = (date?: string) => date ? date.split('T')[0].split('-').reverse().join('/') : '—';
const PURPOSE_LABELS: Record<string, string> = { referencial: 'Referencial', sequencial: 'Sequencial', admissional: 'Admissional', demissional: 'Demissional', periodico: 'Periódico', outro: 'Outro' };
const dash = (value: unknown, suffix = '') => value === undefined || value === null || value === '' ? '-' : `${value}${suffix}`;

const Field = ({ label, value, width = '33.33%', bold }: { label: string; value: string; width?: string; bold?: boolean }) => (
  <View style={{ width, paddingRight: 8, marginBottom: 7 }}>
    <Text style={S.fieldLabel}>{label}</Text>
    <Text style={[S.fieldValue, bold ? { fontWeight: 'bold' } : {}]}>{value}</Text>
  </View>
);

const Section = ({ number, title, children, wrap = false }: { number: string; title: string; children: React.ReactNode; wrap?: boolean }) => (
  <View style={S.section} wrap={wrap}>
    <Text style={S.sectionTitle} minPresenceAhead={60}>{number} {title}</Text>
    {children}
  </View>
);

const DataTable = ({ head, rows, widths, headColors }: { head: string[]; rows: (string | number)[][]; widths: number[]; headColors?: (string | undefined)[] }) => (
  <View style={S.table}>
    <View style={[S.tr, S.th]}>
      {head.map((text, i) => <Text key={i} style={[S.td, { flex: widths[i], fontWeight: 'bold', color: headColors?.[i] || INK, textAlign: i === 0 ? 'left' : 'center' }]}>{text}</Text>)}
    </View>
    {rows.map((row, r) => (
      <View key={r} style={r === rows.length - 1 ? S.trLast : S.tr} wrap={false}>
        {row.map((cell, i) => <Text key={i} style={[S.td, i === 0 ? S.tdLabel : {}, { flex: widths[i] }]}>{String(cell)}</Text>)}
      </View>
    ))}
  </View>
);

const KeyValue = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <View style={S.kvRow} wrap={false}>
    <Text style={[S.kvLabel, color ? { color } : {}]}>{label}</Text>
    <Text style={S.kvValue}>{value}</Text>
  </View>
);

const AudiometryPDF = ({
  exam,
  patient,
  settings,
  options
}: {
  exam: Audiometry;
  patient: Patient;
  settings?: Settings;
  options?: PdfExportOptions;
}) => {
  const rightPTA = calculatePTA(exam.tonalData?.right);
  const leftPTA = calculatePTA(exam.tonalData?.left);
  const rightTymp = classifyTympanometry(exam.tympanometry?.right);
  const leftTymp = classifyTympanometry(exam.tympanometry?.left);
  const tympR = exam.tympanometry?.right, tympL = exam.tympanometry?.left;

  const hasTymp = hasRecordedValue(exam.tympanometry);
  const hasReflex = hasRecordedValue(exam.reflexes);
  const hasMeatoscopy = hasRecordedValue(exam.meatoscopy);
  const hasComplementary = hasRecordedValue(exam.complementary);
  const hasLogo = hasRecordedValue(exam.logoAudiometry);

  const showMeatoscopy = options?.includeMeatoscopy ?? hasMeatoscopy;
  const showTonalChart = options?.includeTonalChart ?? true;
  const showTonalTable = options?.includeTonalTable ?? true;
  const showTonal = showTonalChart || showTonalTable;
  const showPTA = exam.header?.responseType === 'threshold' && (options?.includePTA ?? true);
  const showLogo = options?.includeLogo ?? hasLogo;
  const showImmitance = options?.includeImmitance ?? (hasTymp || hasReflex);
  const showComplementary = (options?.includeComplementary ?? hasComplementary) && hasComplementary;
  const showOpinion = options?.includeOpinion ?? true;

  // Numeração dinâmica: só as seções impressas entram, sem lacunas.
  const order = [showMeatoscopy && 'meatoscopy', showTonal && 'tonal', showLogo && 'logo', showImmitance && 'immitance', showComplementary && 'complementary', showOpinion && 'opinion'].filter(Boolean) as string[];
  const num = (key: string) => `${order.indexOf(key) + 1}.`;
  const performed = [showMeatoscopy && 'Meatoscopia', showTonal && 'Audiometria tonal', showLogo && 'Logoaudiometria', showImmitance && 'Imitanciometria', showComplementary && 'Testes complementares'].filter(Boolean) as string[];

  const reviewed = isReviewCurrent(exam);
  const now = new Date();
  const emissionDate = now.toLocaleDateString('pt-BR');
  const emissionTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const letterhead = letterheadLines(settings);
  const professionalLine = [settings?.professionalName, settings?.crfaNumber ? `CRFa ${settings.crfaNumber}` : '', settings?.specialty].filter(Boolean).join(' • ');
  const hasLetterhead = !!(settings?.logoUrl || settings?.clinicName || professionalLine || letterhead.legal || letterhead.address || letterhead.contact);

  const tonalRows = FREQUENCIES.filter(f => OCTAVE_FREQUENCIES.has(f) || ([exam.tonalData?.right?.[f], exam.tonalData?.left?.[f]].some(point => point?.va !== undefined || point?.vo !== undefined)));
  const hasNR = [exam.tonalData?.right, exam.tonalData?.left, exam.freeField].some(ear => FREQUENCIES.some(f => ear?.[f]?.va === 'NR' || ear?.[f]?.vo === 'NR'));
  const age = ageAtExam(patient.birthDate, exam.examDate)?.label;
  const transducer = exam.header?.transducer === 'insert' ? 'Inserção' : exam.header?.transducer === 'supra' ? 'Supra-aural' : 'Não registrado';
  const avg = (value: number | null) => value !== null ? `${value} dB` : '—';
  const freeFieldLevels = FREQUENCIES.filter(f => exam.freeField?.[f]?.va !== undefined).map(f => `${f} Hz: ${formatTonalValue(exam.freeField?.[f], 'va')}`);

  return (
    <Document title={`Avaliação audiológica - ${patient.name}`} author={examProfessional(exam, settings)}>
      <Page size="A4" style={S.page}>
        {/* Cabeçalho corrido (a partir da página 2) e rodapé em todas as páginas */}
        <Text fixed style={S.runningHeader} render={({ pageNumber }) => pageNumber > 1 ? `${patient.name} · Avaliação audiológica de ${fmtDate(exam.examDate)}` : ''} />
        <View fixed style={S.pageFooter}>
          <Text>Documento gerado em {emissionDate} às {emissionTime} pelo AudioDash</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>

        {/* Timbre da clínica */}
        {hasLetterhead && (
          <View style={S.letterhead} wrap={false}>
            {settings?.logoUrl ? <Image src={settings.logoUrl} style={S.logo} /> : <View style={S.logoSpacer} />}
            <View style={S.letterheadCenter}>
              {settings?.clinicName ? <Text style={S.clinicName}>{settings.clinicName}</Text> : null}
              {professionalLine ? <Text style={S.letterheadLine}>{professionalLine}</Text> : null}
              {letterhead.legal ? <Text style={S.letterheadLine}>{letterhead.legal}</Text> : null}
              {letterhead.address ? <Text style={S.letterheadLine}>{letterhead.address}</Text> : null}
              {letterhead.contact ? <Text style={S.letterheadLine}>{letterhead.contact}</Text> : null}
            </View>
            <View style={S.logoSpacer} />
          </View>
        )}

        {/* Título e situação do documento */}
        <View style={S.titleRow} wrap={false}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={S.docTitle}>Avaliação Audiológica</Text>
            {performed.length > 0 && <Text style={S.docSubtitle}>{performed.join(' · ')}</Text>}
          </View>
          <Text style={[S.pill, reviewed ? { color: '#166534', borderColor: '#86efac', backgroundColor: '#f0fdf4' } : { color: '#92400e', borderColor: '#fcd34d', backgroundColor: '#fffbeb' }]}>
            {reviewed ? 'EXAME REVISADO' : 'RASCUNHO — AGUARDANDO REVISÃO PROFISSIONAL'}
          </Text>
        </View>

        {/* Identificação e protocolo */}
        <View style={S.card} wrap={false}>
          <View style={S.grid}>
            <Field label="Paciente" value={patient.name} width="66.66%" bold />
            <Field label="Data do exame" value={fmtDate(exam.examDate)} />
            <Field label="Nascimento" value={`${fmtDate(patient.birthDate)}${age ? ` (${age})` : ''}`} />
            <Field label="Sexo" value={patient.gender || '—'} />
            <Field label="CPF / RG" value={patient.cpf || patient.rg || '—'} />
            {exam.examPurpose ? <Field label="Finalidade" value={PURPOSE_LABELS[exam.examPurpose] || exam.examPurpose} /> : null}
            {exam.header?.requestingPhysician ? <Field label="Solicitante" value={exam.header.requestingPhysician} /> : null}
            {exam.header?.audiometer ? <Field label="Audiômetro" value={exam.header.audiometer} /> : null}
            {exam.header?.impedanciometer ? <Field label="Impedanciômetro" value={exam.header.impedanciometer} /> : null}
          </View>
          <View style={[S.grid, S.cardDivider]}>
            <Field label="Método" value={METHOD_LABELS[exam.header?.assessmentMethod || ''] || 'Não informado'} />
            <Field label="Tipo de resposta" value={RESPONSE_LABELS[exam.header?.responseType || ''] || 'Não informado'} />
            <Field label="Confiabilidade" value={RELIABILITY_LABELS[exam.header?.reliability || ''] || 'Não informada'} />
            <Field label="Transdutor" value={transducer} />
            <Field label="Critério de classificação" value={degreeStandardLabel(exam.header?.degreeStandard)} width="66.66%" />
          </View>
        </View>

        {/* Meatoscopia */}
        {showMeatoscopy && (
          <Section number={num('meatoscopy')} title="Meatoscopia">
            <KeyValue label="Orelha direita" value={meatoscopyText(exam.meatoscopy, 'right')} color={OD} />
            <KeyValue label="Orelha esquerda" value={meatoscopyText(exam.meatoscopy, 'left')} color={OE} />
            {exam.meatoscopy?.referToENT && <Text style={S.note}>{ENT_REFERRAL_TEXT}</Text>}
          </Section>
        )}

        {/* Audiometria tonal */}
        {showTonal && (
          <Section number={num('tonal')} title={exam.header?.responseType === 'minimum_response' ? 'Audiograma · níveis mínimos de resposta' : exam.header?.responseType === 'threshold' ? 'Audiometria tonal · limiares' : 'Audiograma · tipo de resposta não informado'}>
            <View style={S.columns}>
              {showTonalChart && (
                <View style={showTonalTable ? S.chartBox : { width: '100%', alignItems: 'center' }}>
                  <AudiogramPdfSVG rightData={exam.tonalData?.right || {}} leftData={exam.tonalData?.left || {}} freeFieldData={exam.freeField} />
                </View>
              )}
              {showTonalTable && (
                <View style={{ flex: 1, marginLeft: showTonalChart ? 14 : 0 }}>
                  <Text style={S.subTitle}>Níveis registrados (dB NA)</Text>
                  <DataTable
                    head={['Hz', 'VA · OD', 'VO · OD', 'VA · OE', 'VO · OE']}
                    headColors={[undefined, OD, OD, OE, OE]}
                    widths={[0.8, 1, 1, 1, 1]}
                    rows={tonalRows.map(f => [f, formatTonalValue(exam.tonalData?.right?.[f], 'va'), formatTonalValue(exam.tonalData?.right?.[f], 'vo'), formatTonalValue(exam.tonalData?.left?.[f], 'va'), formatTonalValue(exam.tonalData?.left?.[f], 'vo')])}
                  />
                  {freeFieldLevels.length > 0 && (
                    <Text style={S.note}>Campo livre (S, sem lateralidade; {exam.header?.freeFieldCondition || 'condição não informada'}): {freeFieldLevels.join(' · ')}.</Text>
                  )}
                  {showPTA && (
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      {([['OD', OD, rightPTA], ['OE', OE, leftPTA]] as const).map(([ear, color, pta], i) => (
                        <View key={ear} style={[S.statBox, i === 0 ? { marginRight: 6 } : {}]}>
                          <Text style={{ fontSize: 7.5, fontWeight: 'bold', color }}>Médias · {ear}</Text>
                          <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 2 }}>Tritonal (500–2000 Hz): {avg(pta.tritonal)}</Text>
                          <Text style={{ fontSize: 7.5, color: MUTED }}>Quadritonal (500–4000 Hz): {avg(pta.quadritonal)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
            {showTonalTable && showPTA && [rightPTA, leftPTA].some(pta => pta.tritonal === null || pta.quadritonal === null) && <Text style={S.note}>— : média não calculável (falta limiar numérico em alguma frequência da média, ou há NR). NR nunca é substituído por valor numérico.</Text>}
            {hasNR && <Text style={S.note}>NR é ausência de resposta no nível informado. Registros sem nível apresentado constam na tabela e não são posicionados no gráfico.</Text>}
          </Section>
        )}

        {/* Logoaudiometria */}
        {showLogo && (
          <Section number={num('logo')} title="Logoaudiometria" wrap>
            <DataTable
              head={['Teste de fala', 'OD', 'OE']}
              headColors={[undefined, OD, OE]}
              widths={[2, 1, 1]}
              rows={[
                ['LRF / SRT (dB)', dash(exam.logoAudiometry?.right?.srt?.db), dash(exam.logoAudiometry?.left?.srt?.db)],
                ['LDV / SDT (dB)', dash(exam.logoAudiometry?.right?.voiceDetection?.db), dash(exam.logoAudiometry?.left?.voiceDetection?.db)],
                ['IPRF monossílabos (%)', dash(recognitionPercentage(exam.logoAudiometry?.right?.irf?.mono), '%'), dash(recognitionPercentage(exam.logoAudiometry?.left?.irf?.mono), '%')]
              ]}
            />
            {(['right', 'left'] as const).map(ear => {
              const logo = exam.logoAudiometry?.[ear];
              if (!hasRecordedValue(logo)) return null;
              return (
                <View key={ear} style={{ marginTop: 6 }} wrap={false}>
                  <Text style={{ fontSize: 7.5, color: ear === 'right' ? OD : OE, fontWeight: 'bold' }}>{ear === 'right' ? 'Orelha direita' : 'Orelha esquerda'}</Text>
                  <Text style={{ fontSize: 7.5, color: MUTED }}>Idioma {logo?.language || 'não informado'}; material {logo?.materialReference || 'não informado'}; apresentação {logo?.presentation === 'recorded' ? 'gravada' : logo?.presentation === 'live' ? 'voz viva monitorada' : 'não informada'}; resposta {logo?.responseMode || 'não informada'}.</Text>
                  {Object.entries(logo?.irf || {}).filter(([, p]) => hasRecordedValue(p)).map(([key, point]) => (
                    <Text key={key} style={{ fontSize: 7.5, color: MUTED }}>IPRF ({key}): lista {point.listId || 'não informada'}; acertos {point.correctItems ?? '?'}/{point.totalItems ?? '?'}; {recognitionPercentage(point) ?? 'não calculável'}%; apresentação {point.db ?? '?'} dB NA; mascaramento {point.masking || 'não informado'}.</Text>
                  ))}
                </View>
              );
            })}
            <SpeechRecognitionPdf data={exam.logoAudiometry} />
          </Section>
        )}

        {/* Imitanciometria */}
        {showImmitance && (
          <Section number={num('immitance')} title="Imitanciometria">
            <View style={S.columns}>
              <View style={{ flex: 1, marginRight: 14 }}>
                <Text style={S.subTitle}>Timpanometria</Text>
                <DataTable
                  head={['', 'OD', 'OE']}
                  headColors={[undefined, OD, OE]}
                  widths={[1.1, 1, 1]}
                  rows={[
                    ['Curva', tympLabel(rightTymp.type), tympLabel(leftTymp.type)],
                    ['Pressão (daPa)', tympR?.curveShape === 'flat' ? 'Sem pico' : dash(tympR?.peak), tympL?.curveShape === 'flat' ? 'Sem pico' : dash(tympL?.peak)],
                    ['Admitância', tympR?.compliance200 != null ? `${tympR.compliance200} ${tympR.admittanceUnit || '(unidade não informada)'}` : '-', tympL?.compliance200 != null ? `${tympL.compliance200} ${tympL.admittanceUnit || '(unidade não informada)'}` : '-'],
                    ['Volume (ml)', dash(tympR?.volume), dash(tympL?.volume)],
                    ['Sonda (Hz)', dash(tympR?.probeFrequency), dash(tympL?.probeFrequency)]
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.subTitle}>Reflexos acústicos (ipsilateral / contralateral, dB)</Text>
                <DataTable
                  head={['Hz', 'OD', 'OE']}
                  headColors={[undefined, OD, OE]}
                  widths={[0.8, 1, 1]}
                  rows={(['500', '1000', '2000', '4000'] as const).map(freq => [
                    freq,
                    `${exam.reflexes?.right?.[freq]?.ipsi ?? exam.reflexes?.right?.[freq]?.limiar ?? '-'} / ${exam.reflexes?.right?.[freq]?.contra ?? '-'}`,
                    `${exam.reflexes?.left?.[freq]?.ipsi ?? exam.reflexes?.left?.[freq]?.limiar ?? '-'} / ${exam.reflexes?.left?.[freq]?.contra ?? '-'}`
                  ])}
                />
                {hasReflex && <Text style={S.note}>{reflexConventionText(exam.reflexes?.earConvention)}</Text>}
              </View>
            </View>
            <TympanogramPdf right={tympR} left={tympL} />
            {(['right', 'left'] as const).map(ear => hasRecordedValue(exam.tympanometry?.[ear]) && (
              <Text key={ear} style={S.note}>Timpanometria {ear === 'right' ? 'OD' : 'OE'}: referência {exam.tympanometry?.[ear]?.normativeReference || 'não informada'}; observações {exam.tympanometry?.[ear]?.protocolNotes || 'não informadas'}.</Text>
            ))}
          </Section>
        )}

        {/* Testes complementares */}
        {showComplementary && (
          <Section number={num('complementary')} title="Testes audiológicos complementares">
            {exam.complementary?.weber && <KeyValue label="Weber" value={exam.complementary.weber} />}
            {(exam.complementary?.eoa?.right || exam.complementary?.eoa?.left) && (
              <KeyValue label="EOA" value={`OD: ${exam.complementary?.eoa?.right || 'Não realizado'} | OE: ${exam.complementary?.eoa?.left || 'Não realizado'}${exam.complementary?.eoa?.notes ? ` (${exam.complementary.eoa.notes})` : ''}`} />
            )}
            {(exam.complementary?.toneDecayDetails?.right || exam.complementary?.toneDecayDetails?.left) && (
              <KeyValue label="Tone decay" value={`OD: ${exam.complementary?.toneDecayDetails?.right || '-'} | OE: ${exam.complementary?.toneDecayDetails?.left || '-'}`} />
            )}
            {(exam.complementary?.sisi?.right || exam.complementary?.sisi?.left) && (
              <KeyValue label="SISI" value={`OD: ${exam.complementary?.sisi?.right || '-'} | OE: ${exam.complementary?.sisi?.left || '-'}`} />
            )}
            {(exam.complementary?.bera?.right || exam.complementary?.bera?.left) && (
              <KeyValue label="PEATE" value={`OD: ${exam.complementary?.bera?.right || '-'} | OE: ${exam.complementary?.bera?.left || '-'}${exam.complementary?.bera?.notes ? ` (${exam.complementary.bera.notes})` : ''}`} />
            )}
            {hasRecordedValue(exam.complementary?.eoa) && <Text style={S.note}>EOA: {exam.complementary?.eoa?.type || 'tipo não informado'}; protocolo {exam.complementary?.eoa?.protocol || 'não informado'}; qualidade {exam.complementary?.eoa?.quality || 'não informada'}.</Text>}
            {hasRecordedValue(exam.complementary?.bera) && <Text style={S.note}>PEATE: protocolo {exam.complementary?.bera?.protocol || 'não informado'}; estímulo {exam.complementary?.bera?.stimulus || 'não informado'}; nível/unidade {exam.complementary?.bera?.levelAndUnit || 'não informado'}. Sem conversão automática nHL/eHL.</Text>}
          </Section>
        )}

        {/* Parecer */}
        {showOpinion && (
          <Section number={num('opinion')} title="Parecer fonoaudiológico e conduta" wrap>
            {(reviewed && exam.opinion?.clinicalStatus) ? <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 3 }}>Situação clínica: {CLINICAL_STATUS_LABELS[exam.opinion.clinicalStatus]}</Text> : null}
            {professionalClassificationLines(exam).map(line => <Text key={line} style={{ fontSize: 8, color: '#334155' }}>{line}</Text>)}
            {(reviewed && exam.opinion?.clinicalStatus) || professionalClassificationLines(exam).length > 0 ? <Text style={S.note}>Classificação de grau adotada: {degreeStandardLabel(exam.header?.degreeStandard)}.</Text> : null}
            <View style={S.opinionBox}>
              <Text style={{ fontSize: 9, lineHeight: 1.45 }}>{exam.resultAndConduct || exam.opinion?.clinical || 'Parecer não registrado.'}</Text>
            </View>
          </Section>
        )}

        {/* Assinatura */}
        <View style={S.signature} wrap={false}>
          <View style={S.signatureLine} />
          <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{examProfessional(exam, settings)}</Text>
          <Text style={{ fontSize: 7.5, color: MUTED }}>Fonoaudiólogo(a) responsável pelo exame</Text>
          <Text style={[S.note, { textAlign: 'center', marginTop: 8, width: 400 }]}>Validade condicionada à assinatura do fonoaudiólogo responsável (manuscrita ou eletrônica avançada/qualificada — Res. CFFa 777/2025, art. 6º).</Text>
        </View>
      </Page>
    </Document>
  );
};

export const createAudiometryDocument = (exam: Audiometry, patient: Patient, settings?: Settings, options?: PdfExportOptions) => <AudiometryPDF exam={exam} patient={patient} settings={settings} options={options} />;

export const exportToPdf = async (exam: Audiometry, patient: Patient, options?: PdfExportOptions) => {
  try {
    const settingsArray = await db.settings.toArray();
    const settings = settingsArray[0];

    const blob = await pdf(createAudiometryDocument(exam, patient, settings, options)).toBlob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laudo_Audiometrico_${patient.name.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error(err);
    await customAlert('Erro ao gerar PDF: ' + (err.message || String(err)));
  }
};

const AudiometryComparativePDF = ({ baseline, current, patient, settings }: { baseline: Audiometry, current: Audiometry, patient: Patient, settings?: Settings }) => {
  const emissionDate = new Date().toLocaleDateString('pt-BR');

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        
        {/* HEADER */}
        <View style={[styles.headerBox, { alignItems: 'center' }]} wrap={false}>
          {settings?.logoUrl ? (
            <Image src={settings.logoUrl} style={styles.headerLogo} />
          ) : (
            <View style={{ width: 45 }} />
          )}
          <View style={styles.headerCenter}>
            <Text style={styles.clinicName}>{settings?.clinicName || ''}</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#2563eb', marginTop: 2 }}>
              LAUDO COMPARATIVO DE AUDIOMETRIA EVOLUTIVA (PCA / NR-7 ANEXO II)
            </Text>
          </View>
          <View style={{ width: 45 }} />
        </View>

        {/* PATIENT INFO */}
        <View style={styles.patientBox} wrap={false}>
          <View style={styles.row}>
            <Text style={styles.label}>Paciente: </Text>
            <Text style={[styles.val, { fontWeight: 'bold', marginRight: 20 }]}>{patient.name}</Text>
            <Text style={styles.label}>CPF: </Text>
            <Text style={[styles.val, { marginRight: 20 }]}>{patient.cpf || '---'}</Text>
            <Text style={styles.label}>Exame Base: </Text>
            <Text style={[styles.val, { marginRight: 15 }]}>{baseline.examDate.split('T')[0].split('-').reverse().join('/')} ({PURPOSE_LABELS[baseline.examPurpose || ''] || 'finalidade não informada'})</Text>
            <Text style={styles.label}>Exame Atual: </Text>
            <Text style={styles.val}>{current.examDate.split('T')[0].split('-').reverse().join('/')} ({PURPOSE_LABELS[current.examPurpose || ''] || 'finalidade não informada'})</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 15 }}>
          {/* SHIFT TABLES */}
          <View style={{ width: '100%' }}>
            <Text style={styles.sectionTitle}>Análise Técnica de Variação de Limiares Auditivos (Shift / Δ dB)</Text>
            
            <View style={{ flexDirection: 'row', gap: 15 }}>
              {['right', 'left'].map(ear => (
                <View key={ear} style={{ flex: 1 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: 'bold', marginBottom: 3, color: ear === 'right' ? '#dc2626' : '#2563eb' }}>
                    {ear === 'right' ? 'Orelha Direita (OD)' : 'Orelha Esquerda (OE)'}
                  </Text>
                  <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text style={styles.tableCellFreq}>Hz</Text>
                      <Text style={styles.tableCell}>Base (dB)</Text>
                      <Text style={styles.tableCell}>Atual (dB)</Text>
                      <Text style={styles.tableCell}>Variação (Δ)</Text>
                    </View>
                    {FREQUENCIES.map(f => {
                      const bVal = baseline.tonalData?.[ear as 'right' | 'left']?.[f]?.va;
                      const cVal = current.tonalData?.[ear as 'right' | 'left']?.[f]?.va;
                      
                      const hasB = typeof bVal === 'number';
                      const hasC = typeof cVal === 'number';
                      const shift = (hasB && hasC) ? (cVal as number) - (bVal as number) : null;
                      
                      const isSignificantWorsening = shift !== null && shift >= 15;
                      
                      return (
                        <View key={`sh_${ear}_${f}`} style={styles.tableRow}>
                          <Text style={styles.tableCellFreq}>{f}</Text>
                          <Text style={styles.tableCell}>{hasB ? bVal : '--'}</Text>
                          <Text style={styles.tableCell}>{hasC ? cVal : '--'}</Text>
                          <Text style={[styles.tableCell, { fontWeight: 'bold', color: isSignificantWorsening ? '#dc2626' : (shift !== null && shift < 0 ? '#10b981' : '#333') }]}>
                            {shift !== null ? `${shift > 0 ? '+' : ''}${shift} dB` : '--'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={{ fontSize: 6.8, marginTop: 3 }}>NR-7, Anexo II: {compareNR7(baseline.tonalData?.[ear as 'right' | 'left'], current.tonalData?.[ear as 'right' | 'left']).reason}</Text>
                </View>
              ))}
            </View>
            
            <View style={{ backgroundColor: '#fef2f2', padding: 5, borderRadius: 3, marginTop: 4, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ fontSize: 7.5, color: '#991b1b', fontWeight: 'bold' }}>Critérios descritivos da NR-7, Anexo II (itens 5.3 e 5.4):</Text>
              <Text style={{ fontSize: 7, color: '#991b1b', marginTop: 1 }}>
                Em vermelho: piora de 15 dB ou mais na frequência. Desencadeamento: média de 3, 4 e 6 kHz ≥ 10 dB ou ≥ 15 dB em uma dessas frequências, com referência ≤ 25 dB NA. Agravamento: média de 0,5–2 kHz ou 3–6 kHz ≥ 10 dB ou ≥ 15 dB em frequência isolada. O exame base deve ser o exame de referência vigente. Diagnóstico conclusivo e aptidão: médico do trabalho (item 6).
              </Text>
            </View>

          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} wrap={false}>
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <View style={styles.signatureLine}></View>
            <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{examProfessional(current, settings)}</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>Fonoaudiólogo(a) responsável pela comparação</Text>
          </View>
          <Text style={styles.emissionStamp}>Laudo comparativo emitido em {emissionDate} via AudioDash.</Text>
        </View>

        <Text 
          style={styles.pageNumber} 
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} 
          fixed 
        />

      </Page>
    </Document>
  );
};

export const exportComparisonToPdf = async (baseline: Audiometry, current: Audiometry, patient: Patient) => {
  try {
    const settingsArray = await db.settings.toArray();
    const settings = settingsArray[0];

    const blob = await pdf(<AudiometryComparativePDF baseline={baseline} current={current} patient={patient} settings={settings} />).toBlob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comparativo_Audiometria_${patient.name.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error(err);
    await customAlert('Erro ao gerar PDF Comparativo: ' + (err.message || String(err)));
  }
};
