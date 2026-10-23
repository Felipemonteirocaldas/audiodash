import { formatTonalValue, isReviewCurrent, hasRecordedValue, professionalClassificationLines, examProfessional } from '@/lib/examIntegrity';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { Audiometry, Patient, db, TonalFrequency, TympanometryData } from '@/db/db';
import { calculatePTA, classifyTympanometry, degreeStandardLabel } from '@/lib/audiologyCalculations';
import { letterheadLines } from '@/lib/letterhead';
import { ENT_REFERRAL_TEXT, meatoscopyText } from '@/lib/examForm';
import { customAlert } from '@/lib/dialogs';

const tympWordLabel = (data: TympanometryData | undefined, type: string) => type === 'Inconclusivo' ? `Classificação: ${data?.recordedType ? 'incompleta ou incompatível com a sonda' : 'não registrada'}` : type === 'Normal' || type === 'Alterada' ? `Curva ${type.toLowerCase()}` : `Tipo ${type === 'As' ? 'As (Ar)' : type}`;

const FREQUENCIES: TonalFrequency[] = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];

export const exportToDocx = async (exam: Audiometry, patient: Patient) => {
  try {
    const settingsArray = await db.settings.toArray();
    const settings = settingsArray[0];

    const rightPTA = calculatePTA(exam.header?.responseType === 'threshold' ? exam.tonalData?.right : undefined);
    const leftPTA = calculatePTA(exam.header?.responseType === 'threshold' ? exam.tonalData?.left : undefined);
    const rightTymp = classifyTympanometry(exam.tympanometry?.right);
    const leftTymp = classifyTympanometry(exam.tympanometry?.left);

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
                    new TableCell({ children: [new Paragraph({ text: String(formatTonalValue(exam.tonalData?.right?.[f], 'va')), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: String(formatTonalValue(exam.tonalData?.right?.[f], 'vo')), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: String(formatTonalValue(exam.tonalData?.left?.[f], 'va')), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: String(formatTonalValue(exam.tonalData?.left?.[f], 'vo')), alignment: AlignmentType.CENTER })] })
                  ]
                }))
              ]
            }),

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

            // Imitanciometria se preenchida
            ...(hasRecordedValue(exam.tympanometry) ? [
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun({ text: '5. Imitanciometria', bold: true, size: 22, color: '1E3A8A' })]
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({ text: 'OD: ', bold: true, color: 'DC2626' }),
                  new TextRun({ text: `${tympWordLabel(exam.tympanometry?.right, rightTymp.type)} | Sonda: ${exam.tympanometry?.right?.probeFrequency || '?'} Hz | Pico: ${exam.tympanometry?.right?.curveShape === 'flat' ? 'sem pico' : `${exam.tympanometry?.right?.peak ?? '-'} daPa`} | Admitância: ${exam.tympanometry?.right?.compliance200 ?? '-'} ${exam.tympanometry?.right?.admittanceUnit || '(unidade não informada)'} | Volume: ${exam.tympanometry?.right?.volume ?? '-'} | Referência: ${exam.tympanometry?.right?.normativeReference || 'não informada'}\n` }),
                  new TextRun({ text: 'OE: ', bold: true, color: '2563EB' }),
                  new TextRun({ text: `${tympWordLabel(exam.tympanometry?.left, leftTymp.type)} | Sonda: ${exam.tympanometry?.left?.probeFrequency || '?'} Hz | Pico: ${exam.tympanometry?.left?.curveShape === 'flat' ? 'sem pico' : `${exam.tympanometry?.left?.peak ?? '-'} daPa`} | Admitância: ${exam.tympanometry?.left?.compliance200 ?? '-'} ${exam.tympanometry?.left?.admittanceUnit || '(unidade não informada)'} | Volume: ${exam.tympanometry?.left?.volume ?? '-'} | Referência: ${exam.tympanometry?.left?.normativeReference || 'não informada'}` })
                ]
              })
            ] : []),

            // Conclusão e Parecer
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: '6. Parecer Fonoaudiológico e Conduta', bold: true, size: 22, color: '1E3A8A' })]
            }),
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
    saveAs(blob, `Laudo_Audiometrico_${patient.name.replace(/\s+/g, '_')}.docx`);
  } catch (err: any) {
    console.error(err);
    await customAlert('Erro ao exportar Word: ' + (err.message || String(err)));
  }
};
