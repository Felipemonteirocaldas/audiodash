import { isReviewCurrent, hasRecordedValue, professionalClassificationLines, examProfessional } from '@/lib/examIntegrity';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { Audiometry, Patient, db, TonalFrequency } from '@/db/db';
import { calculatePTA, classifyTympanometry, degreeStandardLabel } from '@/lib/audiologyCalculations';
import { letterheadLines } from '@/lib/letterhead';
import { ENT_REFERRAL_TEXT, meatoscopyText, reflexConventionText } from '@/lib/examForm';
import { customAlert } from '@/lib/dialogs';
import { protocolLine, tympanometryLabel, tonalWithMasking, freeFieldLevels, reflexCell, logoProtocolLine, iprfLines, complementaryEntries, complementaryNotes, draftFilePrefix } from '@/lib/exportFormat';

const heading = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true, size: 22, color: '1E3A8A' })] });
const note = (text: string) => new Paragraph({ children: [new TextRun({ text, size: 18, color: '475569' })] });
const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold })] })] });

const FREQUENCIES: TonalFrequency[] = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];

export const exportToDocx = async (exam: Audiometry, patient: Patient) => {
  try {
    const settingsArray = await db.settings.toArray();
    const settings = settingsArray[0];

    const rightPTA = calculatePTA(exam.header?.responseType === 'threshold' ? exam.tonalData?.right : undefined);
    const leftPTA = calculatePTA(exam.header?.responseType === 'threshold' ? exam.tonalData?.left : undefined);
    const rightTymp = classifyTympanometry(exam.tympanometry?.right);
    const leftTymp = classifyTympanometry(exam.tympanometry?.left);
    const freeField = freeFieldLevels(exam.freeField, FREQUENCIES);
    const hasMasking = (['right', 'left'] as const).some(ear => FREQUENCIES.some(f => exam.tonalData?.[ear]?.[f]?.maskedVa || exam.tonalData?.[ear]?.[f]?.maskedVo));
    const complementary = complementaryEntries(exam.complementary);
    const complementaryText = complementaryNotes(exam.complementary);

    const letterhead = letterheadLines(settings);
    const letterheadParagraphs = [letterhead.legal, letterhead.address, letterhead.contact].filter(Boolean).map(text => new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, size: 18, color: '475569' })]
    }));

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ text: isReviewCurrent(exam) ? 'EXAME REVISADO' : 'RASCUNHO — AGUARDANDO REVISÃO PROFISSIONAL' }),
            // Cabeçalho
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: settings?.clinicName || '',
                  bold: true,
                  size: 28,
                  color: '1E3A8A'
                })
              ]
            }),
            ...letterheadParagraphs,
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `Fonoaudiólogo(a): ${examProfessional(exam, settings)}`,
                  size: 20,
                  color: '475569'
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: 'AVALIAÇÃO AUDIOLÓGICA',
                  bold: true,
                  size: 22,
                  color: '2563EB'
                })
              ]
            }),

            // Dados do Paciente
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: '1. Identificação do Paciente', bold: true, size: 22, color: '1E3A8A' })]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Paciente: ', bold: true }),
                new TextRun({ text: `${patient.name}    ` }),
                new TextRun({ text: 'Nascimento: ', bold: true }),
                new TextRun({ text: `${patient.birthDate ? patient.birthDate.split('T')[0].split('-').reverse().join('/') : '---'}    ` }),
                new TextRun({ text: 'Sexo: ', bold: true }),
                new TextRun({ text: `${patient.gender || '---'}` })
              ]
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({ text: 'CPF / RG: ', bold: true }),
                new TextRun({ text: `${patient.cpf || patient.rg || '---'}    ` }),
                new TextRun({ text: 'Data do Exame: ', bold: true }),
                new TextRun({ text: `${exam.examDate ? exam.examDate.split('T')[0].split('-').reverse().join('/') : '---'}    ` }),
                new TextRun({ text: 'Propósito: ', bold: true }),
                new TextRun({ text: `${exam.examPurpose || 'não informada'}` })
              ]
            }),
            new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Protocolo: ', bold: true }), new TextRun({ text: protocolLine(exam.header) })] }),

            // Meatoscopia se houver
            ...(exam.meatoscopy?.right || exam.meatoscopy?.left || exam.meatoscopy?.rightDescription || exam.meatoscopy?.leftDescription || exam.meatoscopy?.referToENT ? [
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun({ text: '2. Inspeção do Meato Acústico Externo (Meatoscopia)', bold: true, size: 22, color: '1E3A8A' })]
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({ text: 'OD: ', bold: true, color: 'DC2626' }),
                  new TextRun({ text: meatoscopyText(exam.meatoscopy, 'right') }),
                  new TextRun({ text: 'OE: ', bold: true, color: '2563EB', break: 1 }),
                  new TextRun({ text: meatoscopyText(exam.meatoscopy, 'left') }),
                  ...(exam.meatoscopy?.referToENT ? [new TextRun({ text: ENT_REFERRAL_TEXT, break: 1 })] : [])
                ]
              })
            ] : []),

            // Tabela Tonal
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: '3. Limiares Audiométricos Tonais (dB NA)', bold: true, size: 22, color: '1E3A8A' })]
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Frequência (Hz)', bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'VA OD (dB)', bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'VO OD (dB)', bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'VA OE (dB)', bold: true })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'VO OE (dB)', bold: true })], alignment: AlignmentType.CENTER })] })
                  ]
                }),
                ...FREQUENCIES.map(f => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: f, alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: tonalWithMasking(exam.tonalData?.right?.[f], 'va'), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: tonalWithMasking(exam.tonalData?.right?.[f], 'vo'), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: tonalWithMasking(exam.tonalData?.left?.[f], 'va'), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: tonalWithMasking(exam.tonalData?.left?.[f], 'vo'), alignment: AlignmentType.CENTER })] })
                  ]
                }))
              ]
            }),
            ...(hasMasking ? [note('(M) = limiar obtido com mascaramento.')] : []),
            ...(freeField.length ? [note(`Campo livre (sem lateralidade; ${exam.header?.freeFieldCondition || 'condição não informada'}): ${freeField.join(' · ')}.`)] : []),

            // Médias Tonais
            new Paragraph({
              spacing: { before: 150, after: 200 },
              children: [
                new TextRun({ text: 'Médias OD: ', bold: true, color: 'DC2626' }),
                new TextRun({ text: `Tritonal: ${rightPTA.tritonal !== null ? `${rightPTA.tritonal} dB` : '--'} | Quadritonal: ${rightPTA.quadritonal !== null ? `${rightPTA.quadritonal} dB` : '--'}        ` }),
                new TextRun({ text: 'Médias OE: ', bold: true, color: '2563EB' }),
                new TextRun({ text: `Tritonal: ${leftPTA.tritonal !== null ? `${leftPTA.tritonal} dB` : '--'} | Quadritonal: ${leftPTA.quadritonal !== null ? `${leftPTA.quadritonal} dB` : '--'}` })
              ]
            }),

            // Logoaudiometria
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: '4. Logoaudiometria', bold: true, size: 22, color: '1E3A8A' })]
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({ text: 'OD: ', bold: true, color: 'DC2626' }),
                new TextRun({ text: `LRF: ${exam.logoAudiometry?.right?.srt?.db ?? '--'} dB | LDV: ${exam.logoAudiometry?.right?.voiceDetection?.db ?? '--'} dB | IPRF: ${exam.logoAudiometry?.right?.irf?.mono?.percentage ?? '--'}%\n` }),
                new TextRun({ text: 'OE: ', bold: true, color: '2563EB' }),
                new TextRun({ text: `LRF: ${exam.logoAudiometry?.left?.srt?.db ?? '--'} dB | LDV: ${exam.logoAudiometry?.left?.voiceDetection?.db ?? '--'} dB | IPRF: ${exam.logoAudiometry?.left?.irf?.mono?.percentage ?? '--'}%` })
              ]
            }),
            ...(['right', 'left'] as const).filter(ear => hasRecordedValue(exam.logoAudiometry?.[ear])).flatMap(ear => [
              note(`${ear === 'right' ? 'OD' : 'OE'}: ${logoProtocolLine(exam.logoAudiometry?.[ear])}`),
              ...iprfLines(exam.logoAudiometry?.[ear]).map(line => note(`${ear === 'right' ? 'OD' : 'OE'} — ${line}`))
            ]),

            // Imitanciometria se preenchida
            ...(hasRecordedValue(exam.tympanometry) || hasRecordedValue(exam.reflexes) ? [heading('5. Imitanciometria')] : []),
            ...(hasRecordedValue(exam.tympanometry) ? [
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({ text: 'OD: ', bold: true, color: 'DC2626' }),
                  new TextRun({ text: `${tympanometryLabel(exam.tympanometry?.right, rightTymp.type)} | Sonda: ${exam.tympanometry?.right?.probeFrequency || '?'} Hz | Pico: ${exam.tympanometry?.right?.curveShape === 'flat' ? 'sem pico' : `${exam.tympanometry?.right?.peak ?? '-'} daPa`} | Admitância: ${exam.tympanometry?.right?.compliance200 ?? '-'} ${exam.tympanometry?.right?.admittanceUnit || '(unidade não informada)'} | Volume: ${exam.tympanometry?.right?.volume ?? '-'} | Referência: ${exam.tympanometry?.right?.normativeReference || 'não informada'}\n` }),
                  new TextRun({ text: 'OE: ', bold: true, color: '2563EB' }),
                  new TextRun({ text: `${tympanometryLabel(exam.tympanometry?.left, leftTymp.type)} | Sonda: ${exam.tympanometry?.left?.probeFrequency || '?'} Hz | Pico: ${exam.tympanometry?.left?.curveShape === 'flat' ? 'sem pico' : `${exam.tympanometry?.left?.peak ?? '-'} daPa`} | Admitância: ${exam.tympanometry?.left?.compliance200 ?? '-'} ${exam.tympanometry?.left?.admittanceUnit || '(unidade não informada)'} | Volume: ${exam.tympanometry?.left?.volume ?? '-'} | Referência: ${exam.tympanometry?.left?.normativeReference || 'não informada'}` })
                ]
              })
            ] : []),
            ...(hasRecordedValue(exam.reflexes) ? [
              note('Reflexos acústicos (ipsilateral / contralateral, dB):'),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({ children: [cell('Hz', true), cell('OD', true), cell('OE', true)] }),
                  ...(['500', '1000', '2000', '4000'] as const).map(freq => new TableRow({ children: [cell(freq), cell(reflexCell(exam.reflexes?.right?.[freq])), cell(reflexCell(exam.reflexes?.left?.[freq]))] }))
                ]
              }),
              note(reflexConventionText(exam.reflexes?.earConvention))
            ] : []),

            // Testes complementares
            ...(complementary.length || complementaryText.length ? [
              heading('6. Testes Audiológicos Complementares'),
              ...complementary.map(([label, value]) => new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })] })),
              ...complementaryText.map(text => note(text))
            ] : []),

            // Conclusão e Parecer
            heading('7. Parecer Fonoaudiológico e Conduta'),
            ...professionalClassificationLines(exam).map(line => new Paragraph({ children: [new TextRun({ text: line, size: 20 })] })),
            new Paragraph({ children: [new TextRun({ text: `Classificação de grau adotada: ${degreeStandardLabel(exam.header?.degreeStandard)}.`, size: 18, color: '475569' })] }),
            new Paragraph({
              spacing: { after: 400 },
              children: [
                new TextRun({
                  text: exam.resultAndConduct || exam.opinion?.clinical || 'Parecer não registrado.',
                  size: 20
                })
              ]
            }),

            // Assinatura
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 400 },
              children: [
                new TextRun({ text: '____________________________________________________\n', bold: true }),
                new TextRun({ text: `${examProfessional(exam, settings)}\n`, bold: true, size: 20 }),
                new TextRun({ text: 'Documento gerado pelo AudioDash. Validade condicionada à assinatura do fonoaudiólogo responsável (manuscrita ou eletrônica avançada/qualificada — Res. CFFa 777/2025, art. 6º).', size: 16, color: '94A3B8' })
              ]
            })
          ]
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${draftFilePrefix(exam)}Laudo_Audiometrico_${patient.name.replace(/\s+/g, '_')}.docx`);
  } catch (err: any) {
    console.error(err);
    await customAlert('Erro ao exportar Word: ' + (err.message || String(err)));
  }
};
