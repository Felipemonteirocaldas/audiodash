import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { Audiometry, Patient, db, TonalFrequency } from '@/db/db';
import { calculatePTA, classifyTympanometry } from '@/lib/audiologyCalculations';
import { customAlert } from '@/lib/dialogs';

const FREQUENCIES: TonalFrequency[] = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];

export const exportToDocx = async (exam: Audiometry, patient: Patient) => {
  try {
    const settingsArray = await db.settings.toArray();
    const settings = settingsArray[0];

    const rightPTA = calculatePTA(exam.tonalData?.right);
    const leftPTA = calculatePTA(exam.tonalData?.left);
    const rightTymp = classifyTympanometry(exam.tympanometry?.right);
    const leftTymp = classifyTympanometry(exam.tympanometry?.left);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Cabeçalho
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: settings?.clinicName || 'CLÍNICA DE FONOAUDIOLOGIA E AUDIOLOGIA',
                  bold: true,
                  size: 28,
                  color: '1E3A8A'
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `Fonoaudiólogo(a): ${settings?.professionalName || 'Responsável'} ${settings?.crfaNumber ? `- CRFa: ${settings.crfaNumber}` : ''}`,
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
                  text: 'LAUDO AUDIOLÓGICO OFICIAL',
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
                new TextRun({ text: `${exam.examPurpose || 'Referencial'}` })
              ]
            }),

            // Meatoscopia se houver
            ...(exam.meatoscopy?.right || exam.meatoscopy?.left ? [
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun({ text: '2. Inspeção do Meato Acústico Externo (Meatoscopia)', bold: true, size: 22, color: '1E3A8A' })]
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({ text: 'OD: ', bold: true, color: 'DC2626' }),
                  new TextRun({ text: `${exam.meatoscopy?.rightDescription || exam.meatoscopy?.right || 'Normal'}\n` }),
                  new TextRun({ text: 'OE: ', bold: true, color: '2563EB' }),
                  new TextRun({ text: `${exam.meatoscopy?.leftDescription || exam.meatoscopy?.left || 'Normal'}` })
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
                    new TableCell({ children: [new Paragraph({ text: String(exam.tonalData?.right?.[f]?.va ?? '-'), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: String(exam.tonalData?.right?.[f]?.vo ?? '-'), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: String(exam.tonalData?.left?.[f]?.va ?? '-'), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: String(exam.tonalData?.left?.[f]?.vo ?? '-'), alignment: AlignmentType.CENTER })] })
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
            ...(exam.tympanometry?.right?.peak || exam.tympanometry?.left?.peak ? [
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun({ text: '5. Imitanciometria', bold: true, size: 22, color: '1E3A8A' })]
              }),
              new Paragraph({
                spacing: { after: 200 },
                children: [
                  new TextRun({ text: 'OD: ', bold: true, color: 'DC2626' }),
                  new TextRun({ text: `Curva ${rightTymp.type} | Pico: ${exam.tympanometry?.right?.peak ?? '-'} daPa | Complacência: ${exam.tympanometry?.right?.compliance200 ?? '-'} ml | Vea: ${exam.tympanometry?.right?.volume ?? '-'} ml\n` }),
                  new TextRun({ text: 'OE: ', bold: true, color: '2563EB' }),
                  new TextRun({ text: `Curva ${leftTymp.type} | Pico: ${exam.tympanometry?.left?.peak ?? '-'} daPa | Complacência: ${exam.tympanometry?.left?.compliance200 ?? '-'} ml | Vea: ${exam.tympanometry?.left?.volume ?? '-'} ml` })
                ]
              })
            ] : []),

            // Conclusão e Parecer
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: '6. Conclusão Diagnóstica e Parecer Fonoaudiológico', bold: true, size: 22, color: '1E3A8A' })]
            }),
            new Paragraph({
              spacing: { after: 400 },
              children: [
                new TextRun({
                  text: exam.resultAndConduct || exam.opinion?.clinical || 'Audição dentro dos padrões de normalidade bilateralmente.',
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
                new TextRun({ text: `${settings?.professionalName || 'Fonoaudiólogo(a) Responsável'}\n`, bold: true, size: 20 }),
                new TextRun({ text: `CRFa: ${settings?.crfaNumber || '---'} ${settings?.specialty ? `• ${settings.specialty}` : ''}\n`, size: 18, color: '475569' }),
                new TextRun({ text: 'Documento emitido via AudioDash conforme diretrizes CFFa / SBFa / OMS (2021)', size: 16, color: '94A3B8' })
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
