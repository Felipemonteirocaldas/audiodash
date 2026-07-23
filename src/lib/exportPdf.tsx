import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Svg, Line, Path, Circle, Polygon, Polyline, Rect, G, Image } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Audiometry, Patient, Settings, db, EarTonalData } from '@/db/db';

const FREQUENCIES = ['125', '250', '500', '1000', '2000', '3000', '4000', '6000', '8000'];
const FREQ_OFFSETS: Record<string, number> = {
  '125': 0, '250': 1, '500': 2, '1000': 3, '2000': 4, '3000': 4.5, '4000': 5, '6000': 5.5, '8000': 6
};

const SVG_WIDTH = 600;
const SVG_HEIGHT = 600;
const MARGIN = { top: 40, right: 40, bottom: 40, left: 50 };
const INNER_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

const getX = (freq: string) => MARGIN.left + (FREQ_OFFSETS[freq] / 6) * INNER_WIDTH;
const getY = (dbVal: number) => MARGIN.top + ((dbVal + 10) / 130) * INNER_HEIGHT;

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#333'
  },
  headerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '2px solid #2563eb',
    paddingBottom: 8,
    marginBottom: 10
  },
  clinicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a8a'
  },
  profName: {
    fontSize: 10,
    marginTop: 2,
    color: '#475569'
  },
  infoBox: {
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
    backgroundColor: '#f8fafc'
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#0f172a',
    width: 90
  },
  infoValue: {
    flex: 1,
    color: '#334155'
  },
  mainLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10
  },
  leftCol: {
    width: '55%'
  },
  rightCol: {
    width: '43%'
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#e2e8f0',
    padding: 4,
    marginBottom: 6,
    color: '#0f172a',
    textAlign: 'center',
    borderRadius: 2
  },
  chartContainer: {
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    padding: 5
  },
  table: {
    width: '100%',
    flexDirection: 'column',
    borderTop: '1px solid #cbd5e1',
    borderLeft: '1px solid #cbd5e1',
    marginBottom: 10
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
  },
  tableCell: {
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
    padding: 3,
    flex: 1,
    textAlign: 'center',
    fontSize: 8
  },
  tableCellFreq: {
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
    padding: 3,
    flex: 1.2,
    fontWeight: 'bold',
    backgroundColor: '#f1f5f9',
    textAlign: 'center',
    fontSize: 8
  },
  reportBox: {
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: 8,
    minHeight: 50,
    marginBottom: 20
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    paddingTop: 10
  },
  signatureLine: {
    width: 200,
    borderBottom: '1px solid #333',
    marginBottom: 4
  }
});

const AudiogramPdfSVG = ({ rightData, leftData }: { rightData: Partial<EarTonalData>, leftData: Partial<EarTonalData> }) => {
  const renderGrid = () => {
    const lines = [];
    for (let db = -10; db <= 120; db += 10) {
      const y = getY(db);
      lines.push(<Line key={`hy_${db}`} x1={MARGIN.left} y1={y} x2={SVG_WIDTH - MARGIN.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />);
      lines.push(
        <Text key={`hy_t_${db}`} x={MARGIN.left - 5} y={y + 3} style={{ fontSize: 10 }} fill="#64748b" textAnchor="end">
          {db}
        </Text>
      );
    }
    FREQUENCIES.forEach(freq => {
      const x = getX(freq);
      lines.push(<Line key={`vx_${freq}`} x1={x} y1={MARGIN.top} x2={x} y2={SVG_HEIGHT - MARGIN.bottom} stroke="#e2e8f0" strokeWidth={1} />);
      lines.push(
        <Text key={`vx_t_${freq}`} x={x - 8} y={MARGIN.top - 10} style={{ fontSize: 10 }} fill="#64748b">
          {freq}
        </Text>
      );
    });
    return lines;
  };

  const renderPath = (data: Partial<EarTonalData>, color: string, dasharray: string) => {
    const points = FREQUENCIES
      // @ts-ignore
      .filter(f => data[f as any]?.va !== undefined && data[f as any]?.va !== 'NR')
      // @ts-ignore
      .map(f => `${getX(f)},${getY(data[f as any]!.va as number)}`)
      .join(' L ');
    
    if (!points) return null;
    return <Path d={`M ${points}`} fill="none" stroke={color} strokeWidth={2} strokeDasharray={dasharray} />;
  };

  const renderSymbol = (x: number, y: number, type: string, color: string, isNR: boolean, offsetDirection: 1 | -1) => {
    let symbol = null;
    switch (type) {
      case 'OD_VA': 
        symbol = <Circle cx={x} cy={y} r={6} fill="none" stroke={color} strokeWidth={2} />;
        break;
      case 'OD_VA_MASK': 
        symbol = <Polygon points={`${x},${y-7} ${x-7},${y+5} ${x+7},${y+5}`} fill="none" stroke={color} strokeWidth={2} />;
        break;
      case 'OE_VA': 
        symbol = (
          <G stroke={color} strokeWidth={2}>
            <Line x1={x-6} y1={y-6} x2={x+6} y2={y+6} />
            <Line x1={x+6} y1={y-6} x2={x-6} y2={y+6} />
          </G>
        );
        break;
      case 'OE_VA_MASK': 
        symbol = <Rect x={x-6} y={y-6} width={12} height={12} fill="none" stroke={color} strokeWidth={2} />;
        break;
      case 'OD_VO': 
        symbol = <Polyline points={`${x+6},${y-8} ${x-4},${y} ${x+6},${y+8}`} fill="none" stroke={color} strokeWidth={2} />;
        break;
      case 'OD_VO_MASK': 
        symbol = <Polyline points={`${x+4},${y-8} ${x-4},${y-8} ${x-4},${y+8} ${x+4},${y+8}`} fill="none" stroke={color} strokeWidth={2} />;
        break;
      case 'OE_VO': 
        symbol = <Polyline points={`${x-6},${y-8} ${x+4},${y} ${x-6},${y+8}`} fill="none" stroke={color} strokeWidth={2} />;
        break;
      case 'OE_VO_MASK': 
        symbol = <Polyline points={`${x-4},${y-8} ${x+4},${y-8} ${x+4},${y+8} ${x-4},${y+8}`} fill="none" stroke={color} strokeWidth={2} />;
        break;
    }

    return (
      <G key={`${x}-${y}-${type}`}>
        {symbol}
        {isNR && (
          <G stroke={color} strokeWidth={2} fill="none">
            <Line x1={x + (offsetDirection * 6)} y1={y + 6} x2={x + (offsetDirection * 15)} y2={y + 15} />
            <Polyline points={`${x + (offsetDirection * 15)},${y + 10} ${x + (offsetDirection * 15)},${y + 15} ${x + (offsetDirection * 10)},${y + 15}`} />
          </G>
        )}
      </G>
    );
  };

  const renderDataPoints = () => {
    const points: React.ReactNode[] = [];
    FREQUENCIES.forEach(freq => {
      const x = getX(freq);
      
      // @ts-ignore
      const r = rightData[freq as any];
      if (r) {
        if (r.va !== undefined) {
          const isNR = r.va === 'NR';
          const y = isNR ? getY(120) : getY(r.va as number);
          // @ts-ignore
          points.push(renderSymbol(x, y, r.maskedVa ? 'OD_VA_MASK' : 'OD_VA', '#ef4444', isNR, -1));
        }
        if (r.vo !== undefined) {
          const isNR = r.vo === 'NR';
          const y = isNR ? getY(120) : getY(r.vo as number);
          // @ts-ignore
          points.push(renderSymbol(x - 8, y, r.maskedVo ? 'OD_VO_MASK' : 'OD_VO', '#ef4444', isNR, -1));
        }
      }

      // @ts-ignore
      const l = leftData[freq as any];
      if (l) {
        if (l.va !== undefined) {
          const isNR = l.va === 'NR';
          const y = isNR ? getY(120) : getY(l.va as number);
          // @ts-ignore
          points.push(renderSymbol(x, y, l.maskedVa ? 'OE_VA_MASK' : 'OE_VA', '#3b82f6', isNR, 1));
        }
        if (l.vo !== undefined) {
          const isNR = l.vo === 'NR';
          const y = isNR ? getY(120) : getY(l.vo as number);
          // @ts-ignore
          points.push(renderSymbol(x + 8, y, l.maskedVo ? 'OE_VO_MASK' : 'OE_VO', '#3b82f6', isNR, 1));
        }
      }
    });
    return points;
  };

  return (
    <View style={styles.chartContainer}>
      <Svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} style={{ width: 300, height: 300 }}>
        <Text x={SVG_WIDTH / 2 - 35} y={MARGIN.top - 20} style={{ fontSize: 12 }} fill="#000">Frequência (Hz)</Text>
        <Text x={10} y={SVG_HEIGHT / 2 + 40} style={{ fontSize: 12 }} fill="#000" transform="rotate(-90 10 300)">Intensidade (dB HL)</Text>
        
        {renderGrid()}
        {renderPath(rightData, '#ef4444', '0')}
        {renderPath(leftData, '#3b82f6', '5,5')}
        {renderDataPoints()}
      </Svg>
    </View>
  );
};

const AudiometryPDF = ({ exam, patient, settings }: { exam: Audiometry, patient: Patient, settings?: Settings }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* HEADER */}
      <View style={[styles.headerBox, { alignItems: 'center' }]} wrap={false}>
        {settings?.logoUrl && (
          <Image src={settings.logoUrl} style={{ width: 60, height: 60, objectFit: 'contain' }} />
        )}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1e3a8a' }}>ASSOCIAÇÃO PODE - PORTADORES DE DIREITOS ESPECIAIS</Text>
          <Text style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>CENTRO ESPECIALIZADO EM REABILITAÇÃO (CER II)</Text>
          <Text style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>MODALIDADES AUDITIVA E INTELECTUAL</Text>
          <Text style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>CNPJ: 06.698.790/0001-07 / CNES: 5952239</Text>
        </View>
        {/* Placeholder para balancear o cabeçalho se houver logo na esquerda */}
        {settings?.logoUrl && <View style={{ width: 60 }} />}
      </View>

      {/* PATIENT */}
      <View style={styles.infoBox} wrap={false}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Paciente:</Text>
          <Text style={styles.infoValue}>{patient.name}</Text>
          <Text style={styles.infoLabel}>Nascimento:</Text>
          <Text style={{ width: 100 }}>{patient.birthDate ? patient.birthDate.split('T')[0].split('-').reverse().join('/') : '---'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sexo:</Text>
          <Text style={styles.infoValue}>{patient.gender}</Text>
          <Text style={styles.infoLabel}>Data do Exame:</Text>
          <Text style={{ width: 100 }}>{exam.examDate ? exam.examDate.split('T')[0].split('-').reverse().join('/') : '---'}</Text>
        </View>
      </View>

      {/* 2-COLUMN LAYOUT */}
      <View style={styles.mainLayout} wrap={false}>
        
        {/* LEFT COLUMN: CHART */}
        <View style={styles.leftCol}>
          <Text style={styles.sectionTitle}>Audiometria Tonal</Text>
          <AudiogramPdfSVG rightData={exam.tonalData.right} leftData={exam.tonalData.left} />
          <Text style={{ fontSize: 7, color: '#64748b', marginTop: 4, textAlign: 'center' }}>
            Classificação: OMS (2021); DAVIS E SILVERMAN (1970); SILMAN E SILVERMAN (1997).
          </Text>
        </View>

        {/* RIGHT COLUMN: TABLES */}
        <View style={styles.rightCol}>
          <Text style={styles.sectionTitle}>Limiares Tonais (dB HL)</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCellFreq}>Hz</Text>
              <Text style={[styles.tableCell, { color: '#ef4444' }]}>VA(OD)</Text>
              <Text style={[styles.tableCell, { color: '#ef4444' }]}>VO(OD)</Text>
              <Text style={[styles.tableCell, { color: '#3b82f6' }]}>VA(OE)</Text>
              <Text style={[styles.tableCell, { color: '#3b82f6' }]}>VO(OE)</Text>
            </View>
            {FREQUENCIES.map(f => (
              <View key={`tbl_${f}`} style={styles.tableRow}>
                <Text style={styles.tableCellFreq}>{f}</Text>
                {/* @ts-ignore */}
                <Text style={styles.tableCell}>{exam.tonalData.right[f as any]?.va ?? '-'}</Text>
                {/* @ts-ignore */}
                <Text style={styles.tableCell}>{exam.tonalData.right[f as any]?.vo ?? '-'}</Text>
                {/* @ts-ignore */}
                <Text style={styles.tableCell}>{exam.tonalData.left[f as any]?.va ?? '-'}</Text>
                {/* @ts-ignore */}
                <Text style={styles.tableCell}>{exam.tonalData.left[f as any]?.vo ?? '-'}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Logoaudiometria</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCellFreq}>Teste</Text>
              <Text style={[styles.tableCell, { color: '#ef4444' }]}>OD</Text>
              <Text style={[styles.tableCell, { color: '#3b82f6' }]}>OE</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellFreq}>LRF (dB)</Text>
              <Text style={styles.tableCell}>{exam.logoAudiometry?.right?.srt?.db ?? '-'}</Text>
              <Text style={styles.tableCell}>{exam.logoAudiometry?.left?.srt?.db ?? '-'}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellFreq}>LDV (dB)</Text>
              <Text style={styles.tableCell}>{exam.logoAudiometry?.right?.voiceDetection?.db ?? '-'}</Text>
              <Text style={styles.tableCell}>{exam.logoAudiometry?.left?.voiceDetection?.db ?? '-'}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCellFreq}>IPRF (%)</Text>
              <Text style={styles.tableCell}>{exam.logoAudiometry?.right?.irf?.mono?.percentage ?? '-'}</Text>
              <Text style={styles.tableCell}>{exam.logoAudiometry?.left?.irf?.mono?.percentage ?? '-'}</Text>
            </View>
          </View>

        </View>
      </View>

      {/* PARECER */}
      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Resultado / Conduta</Text>
      <View style={styles.reportBox}>
        <Text style={{ lineHeight: 1.5 }}>{exam.resultAndConduct || 'Sem parecer registrado.'}</Text>
      </View>

      {/* FOOTER */}
      <View style={styles.footer} wrap={false}>
        <View style={{ alignItems: 'center', marginBottom: 15 }}>
          <View style={styles.signatureLine}></View>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2 }}>{settings?.professionalName || 'Fonoaudiólogo(a)'}</Text>
          <Text style={{ fontSize: 8, color: '#475569' }}>CRFa: {settings?.crfaNumber || '---'}</Text>
        </View>

        {/* CONTATOS */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: 8, width: '100%' }}>
          <View style={{ width: '30%', alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 7, color: '#475569', marginBottom: 2 }}>+55 (87) 3835-1688</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>+55 (87) 98808-0085</Text>
          </View>
          <View style={{ width: '40%', alignItems: 'center' }}>
            <Text style={{ fontSize: 7, color: '#475569', marginBottom: 2 }}>Rua Padre Augusto de Carvalho, 421</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>Centro, Pesqueira/PE, Brasil. CEP: 55200-000</Text>
          </View>
          <View style={{ width: '30%', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 7, color: '#475569', marginBottom: 2 }}>www.associacaopode.org</Text>
            <Text style={{ fontSize: 7, color: '#475569', marginBottom: 2 }}>associacaopode2@yahoo.com.br</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>@podepesqueira / @PODEpesqueira</Text>
          </View>
        </View>
      </View>

    </Page>
  </Document>
);

export const exportToPdf = async (exam: Audiometry, patient: Patient) => {
  const settingsArray = await db.settings.toArray();
  const settings = settingsArray[0];

  const blob = await pdf(<AudiometryPDF exam={exam} patient={patient} settings={settings} />).toBlob();
  saveAs(blob, `Laudo_${patient.name.replace(/\s+/g, '_')}.pdf`);
};
