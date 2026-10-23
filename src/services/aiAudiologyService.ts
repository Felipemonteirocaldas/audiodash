import { recognitionPercentage } from '@/lib/clinicalProtocol';
import type { Audiometry, AudiologicalOpinion } from '@/db/db';
import { calculatePTA, classifyDegree, classifyType, classifyConfiguration, classifyWHOGlobal, assessNR7Audiogram, degreeStandardLabel } from '@/lib/audiologyCalculations';
import { ENT_REFERRAL_TEXT, meatoscopyText } from '@/lib/examForm';
import { formatTonalValue, hasRecordedValue, adultTablesEligibility, degreeEligibility } from '@/lib/examIntegrity';

/** Local deterministic summary; conduct is supplied by the responsible clinician. */
export function generateLocalClinicalReport(exam: Partial<Audiometry>, patientAge?: number): { fullLaudo: string; opinion: AudiologicalOpinion } {
  const header = exam.header || {};
  const standard = header.degreeStandard || 'OMS_2021';
  const eligibility = adultTablesEligibility(header, patientAge);
  const canInterpret = eligibility.eligible;
  const degreeCheck = degreeEligibility(header, patientAge);
  const lines = ['RESUMO DOS DADOS REGISTRADOS — PARA REVISÃO', `Referência de grau: ${degreeStandardLabel(header.degreeStandard)}.`];
  const opinion: AudiologicalOpinion = { workflowStatus: 'draft' };
  for (const ear of ['right', 'left'] as const) {
    const label = ear === 'right' ? 'OD' : 'OE';
    const data = exam.tonalData?.[ear];
    const points = Object.entries(data || {}).filter(([, point]) => point.va !== undefined || point.vo !== undefined);
    lines.push(`${label}: ${points.length ? points.map(([freq, point]) => `${freq} Hz: VA ${formatTonalValue(point, 'va')}; VO ${formatTonalValue(point, 'vo')}`).join(' | ') : 'Audiometria tonal não registrada.'}`);
    const pta = calculatePTA(data);
    if (header.responseType === 'threshold') lines.push(`Média tritonal: ${pta.tritonal ?? 'indisponível'}; quadritonal: ${pta.quadritonal ?? 'indisponível'} dB NA.`);
    if (canInterpret) {
      const degree = classifyDegree(pta, standard);
      const type = classifyType(data);
      const configuration = classifyConfiguration(data);
      Object.assign(opinion, ear === 'right' ? { lossTypeRight: type, lossDegreeRight: degree.degree, configurationRight: configuration } : { lossTypeLeft: type, lossDegreeLeft: degree.degree, configurationLeft: configuration });
      lines.push(`Sugestão descritiva: tipo — ${type}; grau — ${degree.degree}. ${configuration} Confirmar suficiência e validade dos dados.`);
    } else if (degreeCheck.eligible && degreeCheck.isChild) {
      const degree = classifyDegree(pta, standard, true);
      if (degree.code !== 'NA') Object.assign(opinion, ear === 'right' ? { lossDegreeRight: degree.degree } : { lossDegreeLeft: degree.degree });
      lines.push(`Sugestão descritiva de grau (referência pediátrica): ${degree.degree}. Tipo e configuração definidos pelo profissional; integrar com os demais procedimentos (cross-check).`);
    }
    if (exam.examCategory === 'ocupacional') lines.push(`NR-7, Anexo II (análise descritiva): ${assessNR7Audiogram(data).reason}`);
    if (exam.meatoscopy?.[ear] || (ear === 'right' ? exam.meatoscopy?.rightDescription : exam.meatoscopy?.leftDescription)?.trim()) lines.push(`Inspeção: ${meatoscopyText(exam.meatoscopy, ear)}.`);
    const logo = exam.logoAudiometry?.[ear];
    if (hasRecordedValue(logo?.srt?.db)) lines.push(`LRF: ${logo!.srt.db} dB NA.`);
    if (hasRecordedValue(logo?.voiceDetection?.db)) lines.push(`LDV: ${logo!.voiceDetection.db} dB NA.`);
    if (hasRecordedValue(logo)) lines.push(`Condições de fala: idioma ${logo?.language || 'não informado'}; material ${logo?.materialReference || 'não informado'}; apresentação ${logo?.presentation === 'recorded' ? 'gravada' : logo?.presentation === 'live' ? 'voz viva monitorada' : 'não informada'}; resposta ${logo?.responseMode || 'não informada'}.`);
    for (const [material, point] of Object.entries(logo?.irf || {})) {
      if (hasRecordedValue(point)) lines.push(`IPRF (${material}): ${recognitionPercentage(point) ?? 'inválido/não informado'}%, lista ${point.listId || 'não informada'}, contagem ${point.correctItems ?? '?'}/${point.totalItems ?? '?'}; apresentação ${point.db ?? 'não informada'} dB NA; mascaramento ${point.masking || 'não informado'}.`);
    }
    const tymp = exam.tympanometry?.[ear];
    if (hasRecordedValue(tymp)) lines.push(`Timpanometria: sonda ${tymp?.probeFrequency || 'não informada'} Hz; pico ${tymp?.curveShape === 'flat' ? 'ausente' : tymp?.peak ?? 'não informado'} daPa; admitância ${tymp?.compliance200 ?? 'não informada'} ${tymp?.admittanceUnit || '(unidade não informada)'}; volume ${tymp?.volume ?? 'não informado'} ml; tipo ${tymp?.recordedType || 'a revisar'}; referência ${tymp?.normativeReference || 'não informada'}; condições ${tymp?.protocolNotes || 'não informadas'}.`);
    for (const [freq, point] of Object.entries(exam.reflexes?.[ear] || {})) {
      if (hasRecordedValue(point)) lines.push(`Reflexo ${freq} Hz (${label}${exam.reflexes?.earConvention === 'stimulated' ? ', orelha estimulada' : exam.reflexes?.earConvention === 'probe' ? ', orelha da sonda' : ', convenção da coluna não informada'}): ipsi ${point.ipsi ?? point.limiar ?? 'não informado'}, contra ${point.contra ?? 'não informado'}; decay ${point.decay ?? 'não informado'}.`);
    }
  }
  if (exam.meatoscopy?.referToENT) lines.push(ENT_REFERRAL_TEXT);
  if (degreeCheck.eligible && standard === 'OMS_2021') lines.push(`Classificação global (OMS 2021, melhor orelha): ${classifyWHOGlobal(calculatePTA(exam.tonalData?.right), calculatePTA(exam.tonalData?.left)).label}`);
  if (hasRecordedValue(exam.freeField)) {
    lines.push(`CAMPO LIVRE: ${header.freeFieldCondition || 'condição não informada'}. Resultados sem atribuição de lateralidade.`);
    for (const [freq, point] of Object.entries(exam.freeField || {})) lines.push(`${freq} Hz: ${formatTonalValue(point, 'va')}.`);
  }
  if (!canInterpret) lines.push(`Classificação a definir pelo profissional. ${eligibility.reason} Níveis mínimos de resposta não são tratados como limiares.`);
  if (hasRecordedValue(exam.complementary)) lines.push('Testes complementares: consultar os resultados e protocolos registrados no exame. A unidade de PEATE não é convertida automaticamente para limiar comportamental.');
  lines.push('PARECER E CONDUTA: registrar a integração dos achados, limitações e orientações individualizadas após revisão profissional.');
  return { fullLaudo: lines.join('\n\n'), opinion };
}
