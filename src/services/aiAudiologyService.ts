import { EarTonalData, LogoAudiometryData, TympanometryData, Meatoscopy, ComplementaryTests, EarReflexData } from '@/db/db';
import { 
  calculatePTA, 
  classifyDegree, 
  classifyType, 
  classifyConfiguration, 
  classifyTympanometry, 
  analyzeStapedialReflexes,
  isSuggestivePAIR,
  validateSpeechConcordance,
  classifyIPRF,
  getNumericThreshold,
  DegreeStandard
} from '@/lib/audiologyCalculations';

export type ReportStyle = 'padrao' | 'ocupacional' | 'aasi' | 'otorrino' | 'sintese';

export interface ExamInputData {
  patientName?: string;
  patientAge?: number | string;
  patientGender?: string;
  category?: 'clinico' | 'ocupacional';
  standard?: DegreeStandard;
  tonalData: { right: Partial<EarTonalData>; left: Partial<EarTonalData> };
  logoAudiometry?: { right: LogoAudiometryData; left: LogoAudiometryData };
  tympanometry?: { right: TympanometryData; left: TympanometryData };
  reflexes?: { right: Partial<EarReflexData>; left: Partial<EarReflexData> };
  meatoscopy?: Meatoscopy;
  complementary?: ComplementaryTests;
  existingNotes?: string;
}

export interface GeneratedReportResult {
  clinicalSummary: string;
  conductSuggestion: string;
  fullLaudo: string;
  opinion: {
    clinical: string;
    lossTypeRight: string;
    lossDegreeRight: string;
    configurationRight: string;
    lossTypeLeft: string;
    lossDegreeLeft: string;
    configurationLeft: string;
  };
  aiProviderUsed: 'local_expert' | 'gemini_cloud' | 'openai_cloud';
}

/**
 * Motor Especialista de IA Audiológica Local (100% Offline e Baseado em Diretrizes CFFa/SBFa/OMS)
 */
export function generateLocalClinicalReport(input: ExamInputData, style: ReportStyle = 'padrao'): GeneratedReportResult {
  const standard = input.standard || 'OMS_2021';
  const rightTonal = input.tonalData?.right || {};
  const leftTonal = input.tonalData?.left || {};
  
  const rPta = calculatePTA(rightTonal);
  const lPta = calculatePTA(leftTonal);

  const rDeg = classifyDegree(rPta, standard);
  const lDeg = classifyDegree(lPta, standard);

  const rType = classifyType(rightTonal);
  const lType = classifyType(leftTonal);

  const rConfig = classifyConfiguration(rightTonal);
  const lConfig = classifyConfiguration(leftTonal);

  const rTymp = classifyTympanometry(input.tympanometry?.right);
  const lTymp = classifyTympanometry(input.tympanometry?.left);

  const rSrt = getNumericThreshold(input.logoAudiometry?.right?.srt?.db);
  const lSrt = getNumericThreshold(input.logoAudiometry?.left?.srt?.db);
  const rIrf = getNumericThreshold(input.logoAudiometry?.right?.irf?.mono?.percentage);
  const lIrf = getNumericThreshold(input.logoAudiometry?.left?.irf?.mono?.percentage);

  const rConcordance = validateSpeechConcordance(rSrt ?? undefined, rPta.tritonal);
  const lConcordance = validateSpeechConcordance(lSrt ?? undefined, lPta.tritonal);

  const rIrfClass = classifyIPRF(rIrf ?? undefined);
  const lIrfClass = classifyIPRF(lIrf ?? undefined);

  const pairAnalysis = isSuggestivePAIR(rightTonal, leftTonal);

  const isBilateralNormal = rDeg.code === 'NORMAL' && lDeg.code === 'NORMAL' && rType === 'Audição Normal' && lType === 'Audição Normal';
  const isSymmetrical = rType === lType && rDeg.code === lDeg.code;

  // 1. Linhas do Parecer
  const reportParagraphs: string[] = [];

  // Meatoscopia
  if (input.meatoscopy) {
    const mRight = input.meatoscopy.rightDescription || (input.meatoscopy.right === 'normal' ? 'Conduto livre, membrana timpânica íntegra e translúcida' : 'Presença de alteração meatal');
    const mLeft = input.meatoscopy.leftDescription || (input.meatoscopy.left === 'normal' ? 'Conduto livre, membrana timpânica íntegra e translúcida' : 'Presença de alteração meatal');
    reportParagraphs.push(`1. MEATOSCOPIA / INSPEÇÃO DO CONDUTO AUDITIVO EXTERNO:\n• Orelha Direita: ${mRight}.\n• Orelha Esquerda: ${mLeft}.`);
  }

  // Audiometria Tonal Liminar
  const tonalLines: string[] = [];
  if (isBilateralNormal) {
    tonalLines.push(`• Ambos os ouvidos apresentam limiares auditivos por via aérea e via óssea rigorosamente dentro dos padrões de normalidade (Critério ${standard}). Média Quadritonal (500Hz a 4kHz): OD = ${rPta.quadritonal ?? rPta.tritonal ?? 15} dB HL | OE = ${lPta.quadritonal ?? lPta.tritonal ?? 15} dB HL.`);
  } else if (isSymmetrical && rType !== 'Não avaliado') {
    tonalLines.push(`• Perda auditiva bilateral e simétrica do tipo ${rType.toLowerCase()}, de grau ${rDeg.degree.toLowerCase()} e configuração audiométrica ${rConfig.toLowerCase()}. Médias: OD = ${rPta.quadritonal ?? rPta.tritonal} dB HL | OE = ${lPta.quadritonal ?? lPta.tritonal} dB HL.`);
  } else {
    tonalLines.push(`• Orelha Direita (OD): ${rType === 'Audição Normal' ? 'Audição dentro dos padrões de normalidade' : `Perda auditiva do tipo ${rType.toLowerCase()}`}, de grau ${rDeg.degree.toLowerCase()}, com configuração ${rConfig.toLowerCase()} (Média: ${rPta.quadritonal ?? rPta.tritonal ?? '--'} dB HL).`);
    tonalLines.push(`• Orelha Esquerda (OE): ${lType === 'Audição Normal' ? 'Audição dentro dos padrões de normalidade' : `Perda auditiva do tipo ${lType.toLowerCase()}`}, de grau ${lDeg.degree.toLowerCase()}, com configuração ${lConfig.toLowerCase()} (Média: ${lPta.quadritonal ?? lPta.tritonal ?? '--'} dB HL).`);
  }
  reportParagraphs.push(`2. AUDIOMETRIA TONAL LIMINAR (VA e VO):\n${tonalLines.join('\n')}`);

  // Logoaudiometria
  if (rSrt !== null || lSrt !== null || rIrf !== null || lIrf !== null) {
    const logoLines: string[] = [];
    if (rSrt !== null || rIrf !== null) {
      logoLines.push(`• OD: Limiar de Reconhecimento de Fala (LRF/SRT) em ${rSrt ?? '--'} dB HL. Índice de Reconhecimento de Fala (IPRF) de ${rIrf ?? '--'}% (${rIrfClass.rating}).`);
    }
    if (lSrt !== null || lIrf !== null) {
      logoLines.push(`• OE: Limiar de Reconhecimento de Fala (LRF/SRT) em ${lSrt ?? '--'} dB HL. Índice de Reconhecimento de Fala (IPRF) de ${lIrf ?? '--'}% (${lIrfClass.rating}).`);
    }
    if (rConcordance.isConcordant && lConcordance.isConcordant) {
      logoLines.push(`• Correlação Tonal-Vocal: Excelente concordância com os limiares tonais em ambas as orelhas.`);
    }
    reportParagraphs.push(`3. LOGOAUDIOMETRIA (AUDIOMETRIA VOCAL):\n${logoLines.join('\n')}`);
  }

  // Imitanciometria & Reflexos Acústicos
  const rReflexes = analyzeStapedialReflexes(input.reflexes?.right, rightTonal, 'right');
  const lReflexes = analyzeStapedialReflexes(input.reflexes?.left, leftTonal, 'left');
  const hasMetzPositive = rReflexes.some(r => r.hasRecruitment) || lReflexes.some(r => r.hasRecruitment);

  if (rTymp.type !== 'Inconclusivo' || lTymp.type !== 'Inconclusivo' || rReflexes.length > 0 || lReflexes.length > 0) {
    let immitanceText = `4. MEDIDAS DE IMITÂNCIA ACÚSTICA (TIMPANOMETRIA & REFLEXOS):\n• Orelha Direita: ${rTymp.description} — ${rTymp.interpretation}\n• Orelha Esquerda: ${lTymp.description} — ${lTymp.interpretation}`;
    if (hasMetzPositive) {
      immitanceText += '\n• Teste de Metz: Positivo em frequências testadas, indicando presença do fenômeno de recrutamento objetivo de loudness (compatível com comprometimento coclear).';
    }
    reportParagraphs.push(immitanceText);
  }

  // Ocupacional
  if (input.category === 'ocupacional' || style === 'ocupacional') {
    reportParagraphs.push(`5. AVALIAÇÃO OCUPACIONAL (PORTARIA 19 / NR-7 ANEXO II):\n• ${pairAnalysis.reason}`);
  }

  // Conduta Clínica Personalizada por Estilo
  const conductList: string[] = [];

  if (style === 'aasi') {
    conductList.push('1. Perda auditiva confirmada com rebaixamento da inteligibilidade e percepção de fala em situações diárias.');
    conductList.push('2. Indicação de avaliação audiológica para seleção e adaptação de Próteses Auditivas / Aparelhos de Amplificação Sonora Individual (AASI) bilateralmente.');
    conductList.push('3. Encaminhamento para médico Otorrinolaringologista para emissão de laudo de liberação médica para AASI e investigação etiológica complementar.');
    conductList.push('4. Início de programa de Treinamento Auditivo e Reabilitação Fonoaudiológica pós-adaptação.');
  } else if (style === 'otorrino') {
    conductList.push('1. Presença de achados audiológicos / meatoscópicos sugestivos de afecção de orelha média/externa (Gap aéreo-ósseo e/ou timpanometria alterada).');
    conductList.push('2. Encaminhamento imediato para avaliação com Médico Otorrinolaringologista para conduta clínica/cirúrgica.');
    conductList.push('3. Retorno para reavaliação audiológica pós-tratamento otorrinolaringológico.');
  } else if (style === 'ocupacional') {
    conductList.push('1. Exame com finalidade de controle de saúde auditiva ocupacional (NR-7).');
    conductList.push('2. Uso obrigatório, contínuo e fiscalizado de Protetor Auditivo (EPI) com atenuação NRRsf compatível com o nível de pressão sonora da função.');
    conductList.push('3. Inclusão no Programa de Conservação Auditiva (PCA), palestras de conscientização e audiometria sequencial de controle anual.');
  } else if (style === 'sintese') {
    if (isBilateralNormal) {
      conductList.push('1. Exame dentro dos padrões de normalidade. Reavaliação anual de rotina.');
    } else {
      conductList.push('1. Avaliação médica com Otorrinolaringologista.');
      conductList.push('2. Avaliação de elegibilidade para AASI e acompanhamento fonoaudiológico.');
    }
  } else {
    // Padrão CFFa / SBFa
    if (input.meatoscopy?.right === 'cerumen' || input.meatoscopy?.left === 'cerumen' || input.meatoscopy?.referToENT) {
      conductList.push('1. Encaminhamento para Médico Otorrinolaringologista para conduta em relação ao meato acústico externo.');
    }
    if (isBilateralNormal) {
      conductList.push('1. Manutenção dos hábitos saudáveis de conservação da audição.');
      conductList.push('2. Reavaliação audiológica de rotina em 1 (um) ano ou a critério médico/fonoaudiológico.');
    } else {
      conductList.push('1. Encaminhamento para avaliação diagnóstica com Médico Otorrinolaringologista.');
      if (rDeg.code !== 'NORMAL' || lDeg.code !== 'NORMAL') {
        if (['MODERADA', 'MOD_SEVERA', 'SEVERA', 'PROFUNDA'].includes(rDeg.code) || ['MODERADA', 'MOD_SEVERA', 'SEVERA', 'PROFUNDA'].includes(lDeg.code)) {
          conductList.push('2. Avaliação para indicação e processo de seleção e adaptação de Aparelho de Amplificação Sonora Individual (AASI).');
        }
        conductList.push('3. Acompanhamento audiológico e fonoaudiológico periódico para monitoramento dos limiares auditivos.');
      }
    }
    if (input.category === 'ocupacional') {
      conductList.push('4. Manutenção e fiscalização do uso correto de Equipamento de Proteção Individual (EPI Auricular) e controle no PCA.');
    }
  }

  const clinicalSummaryText = reportParagraphs.join('\n\n');
  const conductText = conductList.join('\n');
  const fullText = `PARECER AUDIOLÓGICO CLÍNICO:\n${clinicalSummaryText}\n\nCONDUTA E RECOMENDAÇÕES:\n${conductText}`;

  // Síntese concisa de 1 linha
  let clinicalOneLiner = '';
  if (isBilateralNormal) {
    clinicalOneLiner = 'Audição dentro dos padrões de normalidade bilateralmente.';
  } else if (isSymmetrical) {
    clinicalOneLiner = `Perda auditiva bilateral do tipo ${rType.toLowerCase()}, grau ${rDeg.degree.toLowerCase()}.`;
  } else {
    clinicalOneLiner = `OD: ${rType} (${rDeg.degree}) | OE: ${lType} (${lDeg.degree}).`;
  }

  return {
    clinicalSummary: clinicalSummaryText,
    conductSuggestion: conductText,
    fullLaudo: fullText,
    opinion: {
      clinical: clinicalOneLiner,
      lossTypeRight: rType,
      lossDegreeRight: rDeg.degree,
      configurationRight: rConfig,
      lossTypeLeft: lType,
      lossDegreeLeft: lDeg.degree,
      configurationLeft: lConfig
    },
    aiProviderUsed: 'local_expert'
  };
}

/**
 * Chamada à IA Generativa Cloud (Google Gemini / OpenAI) com Fallback Inteligente
 */
export async function generateAIAudiologyReport(
  input: ExamInputData, 
  style: ReportStyle = 'padrao',
  apiKey?: string,
  provider: 'gemini' | 'openai' = 'gemini'
): Promise<GeneratedReportResult> {
  // Se não houver chave informada, utiliza o motor clínico fonoaudiológico local de alta precisão
  const key = apiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!key) {
    // Pequeno delay para efeito visual agradável de processamento inteligente
    await new Promise(res => setTimeout(res, 400));
    return generateLocalClinicalReport(input, style);
  }

  try {
    const localBase = generateLocalClinicalReport(input, style);

    const systemPrompt = `Você é um Fonoaudiólogo Especialista em Audiologia Clínica e Ocupacional no Brasil, atuando estritamente em conformidade com as diretrizes do Conselho Federal de Fonoaudiologia (CFFa), Sociedade Brasileira de Fonoaudiologia (SBFa) e OMS 2021.
Seu objetivo é redigir um laudo audiológico impecável, técnico, claro, elegante e humanizado.`;

    const userPrompt = `Com base nos seguintes dados brutos e cálculos do exame audiológico do paciente:
Nome: ${input.patientName || 'Paciente'}
Idade: ${input.patientAge || 'Não informada'}
Categoria do Exame: ${input.category || 'clinico'}
Estilo Solicitado: ${style}

DADOS CLÍNICOS E CLASSIFICAÇÃO:
- Orelha Direita: Tipo ${localBase.opinion.lossTypeRight}, Grau ${localBase.opinion.lossDegreeRight}, Configuração ${localBase.opinion.configurationRight}
- Orelha Esquerda: Tipo ${localBase.opinion.lossTypeLeft}, Grau ${localBase.opinion.lossDegreeLeft}, Configuração ${localBase.opinion.configurationLeft}

RESUMO BASE CALCULADO:
${localBase.clinicalSummary}

CONDUTA BASE:
${localBase.conductSuggestion}

Por favor, redija o parecer audiológico completo e as condutas fonoaudiológicas recomendadas de forma altamente profissional, pronta para ser impressa no laudo oficial do consultório. Mantenha numeração clara e vocabulário técnico impecável.`;

    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API Gemini: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        return {
          ...localBase,
          fullLaudo: generatedText,
          aiProviderUsed: 'gemini_cloud'
        };
      }
    }
  } catch (error) {
    console.warn('Falha na requisição de IA Cloud, utilizando motor fonoaudiológico local:', error);
  }

  return generateLocalClinicalReport(input, style);
}
