import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Svg, Line, Path, Circle, Polygon, Polyline, Rect, G, Image } from '@react-pdf/renderer';
import { Audiometry, Patient, Settings, db, EarTonalData, TonalFrequency } from '@/db/db';
import { customAlert } from '@/lib/dialogs';
import { calculatePTA, classifyTympanometry } from '@/lib/audiologyCalculations';

const FREQUENCIES: TonalFrequency[] = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
const FREQ_OFFSETS: Record<string, number> = {
  '125': 0, '250': 1, '500': 2, '750': 2.5, '1000': 3, '1500': 3.5, '2000': 4, '3000': 4.5, '4000': 5, '6000': 5.5, '8000': 6
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

const AudiogramPdfSVG = ({ rightData, leftData, freeFieldData }: { rightData: Partial<EarTonalData>, leftData: Partial<EarTonalData>, freeFieldData?: Partial<EarTonalData> }) => {
  const renderGrid = () => {
    const lines = [];
    for (let db = -10; db <= 120; db += 10) {
      const y = getY(db);
      lines.push(<Line key={`hy_${db}`} x1={MARGIN.left} y1={y} x2={SVG_WIDTH - MARGIN.right} y2={y} stroke="#cbd5e1" strokeWidth={0.75} />);
      lines.push(
        <Text key={`hy_t_${db}`} x={MARGIN.left - 5} y={y + 3} style={{ fontSize: 9 }} fill="#475569" textAnchor="end">
          {db}
        </Text>
      );
    }
    FREQUENCIES.forEach(freq => {
      const x = getX(freq);
      lines.push(<Line key={`vx_${freq}`} x1={x} y1={MARGIN.top} x2={x} y2={SVG_HEIGHT - MARGIN.bottom} stroke="#cbd5e1" strokeWidth={0.75} />);
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
    const points = FREQUENCIES
      .filter(f => data[f]?.va !== undefined && data[f]?.va !== 'NR')
      .map(f => `${getX(f)},${getY(data[f]!.va as number)}`)
      .join(' L ');
    
    if (!points) return null;
    return (
      <Path 
        d={`M ${points}`} 
        fill="none" 
        stroke={color} 
        strokeWidth={2} 
        {...(dasharray && dasharray !== '0' ? { strokeDasharray: dasharray } : {})} 
      />
    );
  };

  const renderSymbol = (x: number, y: number, type: string, color: string, isNR: boolean, offsetDirection: 1 | -1) => {
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

    return (
      <G key={`${x}-${y}-${type}`}>
        {symbol}
        {isNR && (
          <G stroke={color} strokeWidth={1.8} fill="none">
            <Line x1={x + (offsetDirection * 5)} y1={y + 5} x2={x + (offsetDirection * 12)} y2={y + 12} />
            <Polyline points={`${x + (offsetDirection * 12)},${y + 8} ${x + (offsetDirection * 12)},${y + 12} ${x + (offsetDirection * 8)},${y + 12}`} />
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
        if (r.va !== undefined) {
          const isNR = r.va === 'NR';
          const y = isNR ? getY(120) : getY(r.va as number);
          points.push(renderSymbol(x, y, r.maskedVa ? 'OD_VA_MASK' : 'OD_VA', '#dc2626', isNR, -1));
        }
        if (r.vo !== undefined) {
          const isNR = r.vo === 'NR';
          const y = isNR ? getY(120) : getY(r.vo as number);
          points.push(renderSymbol(x - 8, y, r.maskedVo ? 'OD_VO_MASK' : 'OD_VO', '#dc2626', isNR, -1));
        }
      }

      const l = leftData[freq];
      if (l) {
        if (l.va !== undefined) {
          const isNR = l.va === 'NR';
          const y = isNR ? getY(120) : getY(l.va as number);
          points.push(renderSymbol(x, y, l.maskedVa ? 'OE_VA_MASK' : 'OE_VA', '#2563eb', isNR, 1));
        }
        if (l.vo !== undefined) {
          const isNR = l.vo === 'NR';
          const y = isNR ? getY(120) : getY(l.vo as number);
          points.push(renderSymbol(x + 8, y, l.maskedVo ? 'OE_VO_MASK' : 'OE_VO', '#2563eb', isNR, 1));
        }
      }

      if (freeFieldData && freeFieldData[freq]?.va !== undefined) {
        const ff = freeFieldData[freq];
        const isNR = ff?.va === 'NR';
        const y = isNR ? getY(120) : getY(ff?.va as number);
        points.push(renderSymbol(x, y, 'FREE_FIELD', '#10b981', isNR, 1));
      }
    });
    return points;
  };

  return (
    <View style={styles.chartContainer}>
      <Svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} style={{ width: 245, height: 245 }}>
        <Text x={SVG_WIDTH / 2 - 35} y={MARGIN.top - 20} style={{ fontSize: 10, fontWeight: 'bold' }} fill="#0f172a">Frequência (Hz)</Text>
        <Text x={10} y={SVG_HEIGHT / 2 + 40} style={{ fontSize: 10, fontWeight: 'bold' }} fill="#0f172a" transform="rotate(-90 10 300)">Intensidade (dB HL)</Text>
        
        {renderGrid()}
        {renderPath(rightData, '#dc2626', '0')}
        {renderPath(leftData, '#2563eb', '5,5')}
        {renderDataPoints()}
      </Svg>
    </View>
  );
};

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

  const hasTymp = !!(exam.tympanometry?.right?.peak || exam.tympanometry?.right?.compliance200 || exam.tympanometry?.left?.peak || exam.tympanometry?.left?.compliance200);
  const hasReflex = !!(exam.reflexes?.right?.['1000']?.ipsi || exam.reflexes?.left?.['1000']?.ipsi || exam.reflexes?.sondaOD || exam.reflexes?.sondaOE);
  const hasMeatoscopy = !!(exam.meatoscopy?.right || exam.meatoscopy?.left);
  const hasComplementary = !!(exam.complementary?.weber || exam.complementary?.toneDecay || exam.complementary?.eoa?.right || exam.complementary?.bera?.right);
  const hasLogo = !!(exam.logoAudiometry?.right?.srt?.db || exam.logoAudiometry?.left?.srt?.db || exam.logoAudiometry?.right?.irf?.mono?.percentage || exam.logoAudiometry?.left?.irf?.mono?.percentage);

  const showMeatoscopy = options?.includeMeatoscopy ?? hasMeatoscopy;
  const showTonalChart = options?.includeTonalChart ?? true;
  const showTonalTable = options?.includeTonalTable ?? true;
  const showPTA = options?.includePTA ?? true;
  const showLogo = options?.includeLogo ?? hasLogo;
  const showImmitance = options?.includeImmitance ?? (hasTymp || hasReflex);
  const showComplementary = options?.includeComplementary ?? hasComplementary;
  const showOpinion = options?.includeOpinion ?? true;

  const emissionDate = new Date().toLocaleDateString('pt-BR');
  const emissionTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* CABEÇALHO CLÍNICO INSTITUCIONAL */}
        <View style={styles.headerBox} wrap={false}>
          {settings?.logoUrl ? (
            <Image src={settings.logoUrl} style={styles.headerLogo} />
          ) : (
            <View style={{ width: 45 }} />
          )}

          <View style={styles.headerCenter}>
            <Text style={styles.clinicName}>{settings?.clinicName || 'Clínica de Fonoaudiologia & Audiologia'}</Text>
            <Text style={styles.headerSub}>
              {settings?.professionalName ? `${settings.professionalName} ${settings.crfaNumber ? `• CRFa: ${settings.crfaNumber}` : ''}` : 'Fonoaudiologia Clínica e Ocupacional'}
              {settings?.specialty ? ` • ${settings.specialty}` : ''}
            </Text>
            <Text style={styles.headerSub}>
              {[settings?.phone, settings?.email, settings?.address].filter(Boolean).join(' | ') || 'Laudo Audiológico Digital'}
            </Text>
          </View>

          <View style={{ width: 45, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 6.5, color: '#94a3b8' }}>LAUDO</Text>
            <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#1e3a8a' }}>OFICIAL</Text>
          </View>
        </View>

        {/* IDENTIFICAÇÃO DO PACIENTE E PROTOCOLO */}
        <View style={styles.patientBox} wrap={false}>
          <View style={styles.row}>
            <Text style={[styles.label, { width: 55 }]}>Paciente:</Text>
            <Text style={[styles.val, { flex: 2, fontWeight: 'bold', color: '#0f172a' }]}>{patient.name}</Text>
            <Text style={[styles.label, { width: 55 }]}>Nascimento:</Text>
            <Text style={[styles.val, { width: 70 }]}>
              {patient.birthDate ? patient.birthDate.split('T')[0].split('-').reverse().join('/') : '---'}
            </Text>
            <Text style={[styles.label, { width: 30 }]}>Sexo:</Text>
            <Text style={[styles.val, { width: 40 }]}>{patient.gender || '---'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { width: 55 }]}>CPF / RG:</Text>
            <Text style={[styles.val, { flex: 2 }]}>{patient.cpf || patient.rg || '---'}</Text>
            <Text style={[styles.label, { width: 55 }]}>Data Exame:</Text>
            <Text style={[styles.val, { width: 70 }]}>
              {exam.examDate ? exam.examDate.split('T')[0].split('-').reverse().join('/') : '---'}
            </Text>
            <Text style={[styles.label, { width: 30 }]}>Tipo:</Text>
            <Text style={[styles.val, { width: 60, textTransform: 'capitalize' }]}>{exam.examPurpose || 'Referencial'}</Text>
          </View>

          {(exam.header?.requestingPhysician || exam.header?.audiometer || exam.header?.impedanciometer) && (
            <View style={[styles.row, { marginTop: 1.5, paddingTop: 1.5, borderTopWidth: 1, borderTopColor: '#e2e8f0' }]}>
              {exam.header?.requestingPhysician && (
                <Text style={[styles.val, { flex: 1.2 }]}>
                  <Text style={styles.label}>Solicitante: </Text>{exam.header.requestingPhysician}
                </Text>
              )}
              {exam.header?.audiometer && (
                <Text style={[styles.val, { flex: 1 }]}>
                  <Text style={styles.label}>Audiômetro: </Text>{exam.header.audiometer}
                </Text>
              )}
              {exam.header?.impedanciometer && (
                <Text style={[styles.val, { flex: 1 }]}>
                  <Text style={styles.label}>Impedanciômetro: </Text>{exam.header.impedanciometer}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* MEATOSCOPIA */}
        {showMeatoscopy && (
          <View style={{ marginBottom: 4 }} wrap={false}>
            <Text style={styles.sectionTitle}>1. Inspeção do Meato Acústico Externo (Meatoscopia)</Text>
            <View style={[styles.patientBox, { padding: 3.5, marginBottom: 0 }]}>
              <View style={styles.row}>
                <Text style={[styles.label, { width: 25, color: '#dc2626' }]}>OD:</Text>
                <Text style={[styles.val, { flex: 1 }]}>{exam.meatoscopy?.rightDescription || (exam.meatoscopy?.right === 'normal' ? 'Conduto livre e membrana timpânica íntegra.' : exam.meatoscopy?.right || 'Normal')}</Text>
                <Text style={[styles.label, { width: 25, color: '#2563eb' }]}>OE:</Text>
                <Text style={[styles.val, { flex: 1 }]}>{exam.meatoscopy?.leftDescription || (exam.meatoscopy?.left === 'normal' ? 'Conduto livre e membrana timpânica íntegra.' : exam.meatoscopy?.left || 'Normal')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 2 COLUNAS: GRÁFICO AUDIOGRAMA + TABELAS DE LIMIARES E FALA */}
        <View style={styles.mainLayout} wrap={false}>
          
          {/* COLUNA ESQUERDA: AUDIOGRAMA */}
          {showTonalChart && (
            <View style={showTonalTable ? styles.leftCol : { width: '100%' }}>
              <Text style={styles.sectionTitle}>2. Audiograma Tonal Liminar</Text>
              <AudiogramPdfSVG 
                rightData={exam.tonalData?.right || {}} 
                leftData={exam.tonalData?.left || {}} 
                freeFieldData={exam.freeField}
              />
              <Text style={{ fontSize: 6.5, color: '#475569', marginTop: 2, textAlign: 'center' }}>
                OD: VA(O), VO(&lt;) [Masc: Δ, [] | OE: VA(X), VO(&gt;) [Masc: □, ]] | Campo Livre (S)
              </Text>
            </View>
          )}

          {/* COLUNA DIREITA: TABELA TONAL + MÉDIAS + LOGOAUDIOMETRIA */}
          {(showTonalTable || showLogo) && (
            <View style={showTonalChart ? styles.rightCol : { width: '100%' }}>
              {showTonalTable && (
                <>
                  <Text style={styles.sectionTitle}>3. Limiares Tonais (dB NA)</Text>
                  <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text style={styles.tableCellFreq}>Hz</Text>
                      <Text style={[styles.tableCell, { color: '#dc2626', fontWeight: 'bold' }]}>VA(OD)</Text>
                      <Text style={[styles.tableCell, { color: '#dc2626' }]}>VO(OD)</Text>
                      <Text style={[styles.tableCell, { color: '#2563eb', fontWeight: 'bold' }]}>VA(OE)</Text>
                      <Text style={[styles.tableCell, { color: '#2563eb' }]}>VO(OE)</Text>
                    </View>
                    {FREQUENCIES.map(f => (
                      <View key={`tbl_${f}`} style={styles.tableRow}>
                        <Text style={styles.tableCellFreq}>{f}</Text>
                        <Text style={styles.tableCell}>{exam.tonalData?.right?.[f]?.va ?? '-'}</Text>
                        <Text style={styles.tableCell}>{exam.tonalData?.right?.[f]?.vo ?? '-'}</Text>
                        <Text style={styles.tableCell}>{exam.tonalData?.left?.[f]?.va ?? '-'}</Text>
                        <Text style={styles.tableCell}>{exam.tonalData?.left?.[f]?.vo ?? '-'}</Text>
                      </View>
                    ))}
                  </View>

                  {/* MÉDIAS AUDIOMÉTRICAS */}
                  {showPTA && (
                    <View style={styles.ptaBox}>
                      <View>
                        <Text style={[styles.label, { color: '#dc2626' }]}>Médias OD:</Text>
                        <Text style={{ fontSize: 6.5, color: '#475569' }}>
                          Tritonal: {rightPTA.tritonal !== null ? `${rightPTA.tritonal} dB` : '--'} | Quadritonal: {rightPTA.quadritonal !== null ? `${rightPTA.quadritonal} dB` : '--'}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.label, { color: '#2563eb' }]}>Médias OE:</Text>
                        <Text style={{ fontSize: 6.5, color: '#475569' }}>
                          Tritonal: {leftPTA.tritonal !== null ? `${leftPTA.tritonal} dB` : '--'} | Quadritonal: {leftPTA.quadritonal !== null ? `${leftPTA.quadritonal} dB` : '--'}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* LOGOAUDIOMETRIA */}
              {showLogo && (
                <>
                  <Text style={styles.sectionTitle}>4. Logoaudiometria</Text>
                  <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text style={styles.tableCellFreq}>Teste de Fala</Text>
                      <Text style={[styles.tableCell, { color: '#dc2626', fontWeight: 'bold' }]}>OD</Text>
                      <Text style={[styles.tableCell, { color: '#2563eb', fontWeight: 'bold' }]}>OE</Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCellFreq}>LRF / SRT (dB)</Text>
                      <Text style={styles.tableCell}>{exam.logoAudiometry?.right?.srt?.db ?? '-'}</Text>
                      <Text style={styles.tableCell}>{exam.logoAudiometry?.left?.srt?.db ?? '-'}</Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCellFreq}>LDV / SDT (dB)</Text>
                      <Text style={styles.tableCell}>{exam.logoAudiometry?.right?.voiceDetection?.db ?? '-'}</Text>
                      <Text style={styles.tableCell}>{exam.logoAudiometry?.left?.voiceDetection?.db ?? '-'}</Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCellFreq}>IPRF (%) Monossílabos</Text>
                      <Text style={styles.tableCell}>{exam.logoAudiometry?.right?.irf?.mono?.percentage ? `${exam.logoAudiometry.right.irf.mono.percentage}%` : '-'}</Text>
                      <Text style={styles.tableCell}>{exam.logoAudiometry?.left?.irf?.mono?.percentage ? `${exam.logoAudiometry.left.irf.mono.percentage}%` : '-'}</Text>
                    </View>
                  </View>
                </>
              )}

            </View>
          )}
        </View>

        {/* IMITANCIOMETRIA */}
        {showImmitance && (
          <View style={{ marginBottom: 4 }} wrap={false}>
            <Text style={styles.sectionTitle}>5. Medidas de Imitância Acústica (Imitanciometria)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Timpanometria */}
              <View style={{ flex: 1 }}>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={styles.tableCellFreq}>Timpanometria</Text>
                    <Text style={[styles.tableCell, { color: '#dc2626' }]}>OD</Text>
                    <Text style={[styles.tableCell, { color: '#2563eb' }]}>OE</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellFreq}>Curva (Jerger)</Text>
                    <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{rightTymp.type !== 'Inconclusivo' ? `Tipo ${rightTymp.type}` : '-'}</Text>
                    <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{leftTymp.type !== 'Inconclusivo' ? `Tipo ${leftTymp.type}` : '-'}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellFreq}>Pressão (daPa)</Text>
                    <Text style={styles.tableCell}>{exam.tympanometry?.right?.peak ?? '-'}</Text>
                    <Text style={styles.tableCell}>{exam.tympanometry?.left?.peak ?? '-'}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellFreq}>Complacência (ml)</Text>
                    <Text style={styles.tableCell}>{exam.tympanometry?.right?.compliance200 ?? '-'}</Text>
                    <Text style={styles.tableCell}>{exam.tympanometry?.left?.compliance200 ?? '-'}</Text>
                  </View>
                </View>
              </View>

              {/* Reflexos */}
              <View style={{ flex: 1 }}>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={styles.tableCellFreq}>Reflexo (Ipsi/Contra)</Text>
                    <Text style={[styles.tableCell, { color: '#dc2626' }]}>OD</Text>
                    <Text style={[styles.tableCell, { color: '#2563eb' }]}>OE</Text>
                  </View>
                  {(['500', '1000', '2000', '4000'] as const).map(freq => (
                    <View key={`ref_tbl_${freq}`} style={styles.tableRow}>
                      <Text style={styles.tableCellFreq}>{freq} Hz</Text>
                      <Text style={styles.tableCell}>
                        {exam.reflexes?.right?.[freq]?.ipsi ? `${exam.reflexes.right[freq]?.ipsi}/${exam.reflexes.right[freq]?.contra || '-'}` : '-'}
                      </Text>
                      <Text style={styles.tableCell}>
                        {exam.reflexes?.left?.[freq]?.ipsi ? `${exam.reflexes.left[freq]?.ipsi}/${exam.reflexes.left[freq]?.contra || '-'}` : '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TESTES COMPLEMENTARES */}
        {showComplementary && hasComplementary && (
          <View style={{ marginBottom: 4 }} wrap={false}>
            <Text style={styles.sectionTitle}>6. Testes Audiológicos Especiais / Complementares</Text>
            <View style={[styles.patientBox, { padding: 3.5, marginBottom: 0 }]}>
              {exam.complementary?.weber && (
                <View style={styles.row}>
                  <Text style={[styles.label, { width: 50 }]}>Weber: </Text>
                  <Text style={[styles.val, { flex: 1 }]}>{exam.complementary.weber}</Text>
                </View>
              )}
              {(exam.complementary?.eoa?.right || exam.complementary?.eoa?.left) && (
                <View style={styles.row}>
                  <Text style={[styles.label, { width: 50 }]}>EOA: </Text>
                  <Text style={[styles.val, { flex: 1 }]}>
                    OD: {exam.complementary?.eoa?.right || 'Não realizado'} | OE: {exam.complementary?.eoa?.left || 'Não realizado'} {exam.complementary?.eoa?.notes ? `(${exam.complementary.eoa.notes})` : ''}
                  </Text>
                </View>
              )}
              {(exam.complementary?.bera?.right || exam.complementary?.bera?.left) && (
                <View style={styles.row}>
                  <Text style={[styles.label, { width: 50 }]}>PEATE: </Text>
                  <Text style={[styles.val, { flex: 1 }]}>
                    OD: {exam.complementary?.bera?.right || '-'} | OE: {exam.complementary?.bera?.left || '-'} {exam.complementary?.bera?.notes ? `(${exam.complementary.bera.notes})` : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* PARECER AUDIOLÓGICO & CONDUTA */}
        {showOpinion && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>7. Conclusão Diagnóstica e Parecer Fonoaudiológico</Text>
            <View style={styles.reportBox}>
              <Text style={{ lineHeight: 1.35, fontSize: 7, color: '#0f172a' }}>
                {exam.resultAndConduct || exam.opinion?.clinical || 'Audição dentro dos padrões de normalidade bilateralmente.'}
              </Text>
            </View>
          </View>
        )}

        {/* ASSINATURA E CARIMBO OFICIAL */}
        <View style={styles.footer} wrap={false}>
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <View style={styles.signatureLine}></View>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0f172a' }}>
              {settings?.professionalName || 'Fonoaudiólogo(a) Responsável'}
            </Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>
              CRFa: {settings?.crfaNumber || '---'} {settings?.specialty ? `• ${settings.specialty}` : ''}
            </Text>
          </View>
          <Text style={styles.emissionStamp}>
            Laudo emitido eletronicamente em {emissionDate} às {emissionTime} via AudioDash conforme resolução CFFa e diretrizes SBFa / OMS (2021).
          </Text>
        </View>

        {/* NUMERAÇÃO DINÂMICA DE PÁGINA */}
        <Text 
          style={styles.pageNumber} 
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} 
          fixed 
        />

      </Page>
    </Document>
  );
};

export const exportToPdf = async (exam: Audiometry, patient: Patient, options?: PdfExportOptions) => {
  try {
    const settingsArray = await db.settings.toArray();
    const settings = settingsArray[0];

    const blob = await pdf(<AudiometryPDF exam={exam} patient={patient} settings={settings} options={options} />).toBlob();
    
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
            <Text style={styles.clinicName}>{settings?.clinicName || 'Clínica de Audiologia'}</Text>
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
            <Text style={[styles.val, { marginRight: 15 }]}>{baseline.examDate.split('T')[0].split('-').reverse().join('/')} ({baseline.examPurpose || 'Referencial'})</Text>
            <Text style={styles.label}>Exame Atual: </Text>
            <Text style={styles.val}>{current.examDate.split('T')[0].split('-').reverse().join('/')} ({current.examPurpose || 'Sequencial'})</Text>
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
                      
                      const isSignificantWorsening = shift !== null && shift >= 10;
                      
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
                </View>
              ))}
            </View>
            
            <View style={{ backgroundColor: '#fef2f2', padding: 5, borderRadius: 3, marginTop: 4, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ fontSize: 7.5, color: '#991b1b', fontWeight: 'bold' }}>Critério de Alerta e Conduta Ocupacional (NR-7 Anexo II):</Text>
              <Text style={{ fontSize: 7, color: '#991b1b', marginTop: 1 }}>
                Valores destacados em vermelho indicam piora de 10 dB ou mais em relação ao exame referencial. Sugere-se investigação audiológica complementar e controle no PCA.
              </Text>
            </View>

          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} wrap={false}>
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <View style={styles.signatureLine}></View>
            <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{settings?.professionalName || 'Fonoaudiólogo(a)'}</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>CRFa: {settings?.crfaNumber || '---'}</Text>
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
