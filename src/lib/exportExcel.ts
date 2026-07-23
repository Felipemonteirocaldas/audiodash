// @ts-nocheck
// @ts-ignore
import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate';
import { saveAs } from 'file-saver';
import { Audiometry, Patient, db } from '@/db/db';

const FREQUENCIES = ['125', '250', '500', '1000', '2000', '3000', '4000', '6000', '8000'];

const parseVal = (v: any) => {
  if (v === undefined || v === null || v === '-' || v === 'NR' || v === '') return undefined;
  const num = Number(v);
  return isNaN(num) ? undefined : num;
};

export const exportToExcelJs = async (exam: Audiometry, patient: Patient) => {
  const settingsArray = await db.settings.toArray();
  const settings = settingsArray[0];

  // Fetch the template
  const response = await fetch('/template.xlsx');
  const arrayBuffer = await response.arrayBuffer();

  // Load the workbook using xlsx-populate
  // @ts-ignore
  const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);
  
  const sheet = workbook.sheet('Laudo Audiométrico');

  // Fill in Clinic Header (Row 1 and 2)
  // Let's create a solid blue background for A1:F2
  const clinicName = settings?.clinicName || 'Clínica de Audiologia';
  const profName = `${settings?.professionalName || 'Fonoaudiólogo'} - CRFa: ${settings?.crfaNumber || '---'}`;
  
  sheet.cell('A1').value(clinicName).style({ bold: true, fontSize: 16, fontColor: 'FFFFFF', fill: '1E3A8A', horizontalAlignment: 'center', verticalAlignment: 'center' });
  sheet.range('A1:F1').merged(true).style({ fill: '1E3A8A' });
  
  sheet.cell('A2').value(profName).style({ fontSize: 11, fontColor: 'FFFFFF', fill: '1E3A8A', horizontalAlignment: 'center', verticalAlignment: 'center' });
  sheet.range('A2:F2').merged(true).style({ fill: '1E3A8A' });

  // Fill Patient Info (Row 4 to 6)
  sheet.cell('A4').value('Identificação do Paciente').style({ bold: true, fontSize: 12, fontColor: '1E3A8A', bottomBorder: true });
  sheet.range('A4:F4').merged(true);

  sheet.cell('A5').value('Nome:').style({ bold: true });
  sheet.cell('B5').value(patient.name);
  sheet.cell('D5').value('Data:').style({ bold: true });
  sheet.cell('E5').value(new Date(exam.examDate).toLocaleDateString('pt-BR'));
  
  sheet.cell('A6').value('Anamnese:').style({ bold: true });

  FREQUENCIES.forEach((f, idx) => {
    const row = 10 + idx;
    sheet.cell(`B${row}`).value(parseVal(exam.tonalData.right[f]?.va));
    sheet.cell(`C${row}`).value(parseVal(exam.tonalData.right[f]?.vo));
    sheet.cell(`D${row}`).value(parseVal(exam.tonalData.left[f]?.va));
    sheet.cell(`E${row}`).value(parseVal(exam.tonalData.left[f]?.vo));
  });
  
  // Center all values in the table
  sheet.range('A10:E18').style({ horizontalAlignment: 'center', border: true, borderColor: 'CBD5E1' });
  sheet.range('A9:E9').style({ border: true, borderColor: 'CBD5E1' });

  // Logoaudiometria Table
  sheet.cell('A20').value('Logoaudiometria').style({ bold: true, fontSize: 12, fontColor: '1E3A8A', bottomBorder: true });
  sheet.range('A20:C20').merged(true);

  sheet.cell('A21').value('Teste').style({ bold: true, fill: 'F1F5F9', horizontalAlignment: 'center', border: true });
  sheet.cell('B21').value('OD').style({ bold: true, fontColor: 'DC2626', fill: 'F1F5F9', horizontalAlignment: 'center', border: true });
  sheet.cell('C21').value('OE').style({ bold: true, fontColor: '2563EB', fill: 'F1F5F9', horizontalAlignment: 'center', border: true });

  sheet.cell('A22').value('LRF (dB)').style({ border: true, horizontalAlignment: 'center' });
  sheet.cell('B22').value(parseVal(exam.logoAudiometry?.right?.srt?.db)).style({ border: true, horizontalAlignment: 'center' });
  sheet.cell('C22').value(parseVal(exam.logoAudiometry?.left?.srt?.db)).style({ border: true, horizontalAlignment: 'center' });

  sheet.cell('A23').value('LDV (dB)').style({ border: true, horizontalAlignment: 'center' });
  sheet.cell('B23').value(parseVal(exam.logoAudiometry?.right?.voiceDetection?.db)).style({ border: true, horizontalAlignment: 'center' });
  sheet.cell('C23').value(parseVal(exam.logoAudiometry?.left?.voiceDetection?.db)).style({ border: true, horizontalAlignment: 'center' });

  sheet.cell('A24').value('IPRF (%)').style({ border: true, horizontalAlignment: 'center' });
  sheet.cell('B24').value(parseVal(exam.logoAudiometry?.right?.irf?.mono?.percentage)).style({ border: true, horizontalAlignment: 'center' });
  sheet.cell('C24').value(parseVal(exam.logoAudiometry?.left?.irf?.mono?.percentage)).style({ border: true, horizontalAlignment: 'center' });

  // Parecer
  sheet.cell('A26').value('Parecer Fonoaudiológico').style({ bold: true, fontSize: 12, fontColor: '1E3A8A', bottomBorder: true });
  sheet.range('A26:F26').merged(true);
  
  sheet.cell('A31').value(exam.resultAndConduct || 'Sem parecer registrado.').style({ horizontalAlignment: 'left', verticalAlignment: 'top', wrapText: true, border: true });
  sheet.range('A27:F30').merged(true);

  // Save the blob
  const blob = await workbook.outputAsync();
  saveAs(blob, `Laudo_${patient.name.replace(/\s+/g, '_')}.xlsx`);
};
