import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Audiometry, Patient, TonalFrequency } from '@/db/db';
import { formatTonalValue, isReviewCurrent, CLINICAL_STATUS_LABELS, professionalClassificationLines } from '@/lib/examIntegrity';
import { degreeStandardLabel } from '@/lib/audiologyCalculations';

const FREQUENCIES: TonalFrequency[] = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];

export async function exportToExcelJs(exam: Audiometry, patient: Patient) {
  const book = new ExcelJS.Workbook();
  const info = book.addWorksheet('Identificação');
  info.addRows([
    ['AUDIODASH — REGISTRO AUDIOLÓGICO'],
    ['Situação', isReviewCurrent(exam) ? 'REVISADO' : 'RASCUNHO — AGUARDANDO REVISÃO'],
    ['Paciente', patient.name], ['Data do exame', exam.examDate],
    ['Profissional', exam.header?.speechTherapist || 'Não informado'],
    ['Método', exam.header?.assessmentMethod || 'Não informado'],
    ['Tipo de resposta', exam.header?.responseType || 'Não informado'],
    ['Confiabilidade', exam.header?.reliability || 'Não informada'],
    ['Referência de grau', degreeStandardLabel(exam.header?.degreeStandard)],
    ['Transdutor', exam.header?.transducer || 'Não registrado'],
    ['Campo livre', exam.header?.freeFieldCondition || 'Não informado'],
    ['Calibração', exam.header?.calibrationDate || 'Não informada'],
    ['Referência de procedimento', exam.header?.audiometryProtocol || 'Não selecionada'],
    ['Reteste de 1 kHz OD/OE', `${exam.header?.retest1000?.right || '—'} / ${exam.header?.retest1000?.left || '—'}`],
    ['Observações do reteste', exam.header?.retest1000?.notes || ''],
    ['Nota', 'NR representa ausência de resposta no nível apresentado. Campo livre não atribui lateralidade.']
  ]);
  const tonal = book.addWorksheet('Audiometria tonal');
  tonal.addRow(['Hz', 'VA OD (dB NA)', 'VO OD (dB NA)', 'Masc. VA OD', 'Masc. VO OD', 'VA OE (dB NA)', 'VO OE (dB NA)', 'Masc. VA OE', 'Masc. VO OE', 'Campo livre (dB NA)']);
  for (const freq of FREQUENCIES) {
    const r = exam.tonalData?.right?.[freq], l = exam.tonalData?.left?.[freq];
    tonal.addRow([freq, formatTonalValue(r, 'va'), formatTonalValue(r, 'vo'), r?.maskedVa ? 'Sim' : '', r?.maskedVo ? 'Sim' : '', formatTonalValue(l, 'va'), formatTonalValue(l, 'vo'), l?.maskedVa ? 'Sim' : '', l?.maskedVo ? 'Sim' : '', formatTonalValue(exam.freeField?.[freq], 'va')]);
  }
  const details = book.addWorksheet('Procedimentos');
  details.addRow(['Procedimento', 'Campo', 'Valor registrado']);
  const append = (section: string, value: unknown, prefix = '') => {
    if (value && typeof value === 'object') Object.entries(value).forEach(([key, val]) => append(section, val, prefix ? `${prefix} / ${key}` : key));
    else if (value !== undefined && value !== null && value !== '') details.addRow([section, prefix, String(value)]);
  };
  append('Meatoscopia', exam.meatoscopy); append('Logoaudiometria', exam.logoAudiometry); append('Timpanometria', exam.tympanometry); append('Reflexos', exam.reflexes); append('Mascaramento', exam.tonalMasking); append('Complementares', exam.complementary);
  const report = book.addWorksheet('Parecer');
  report.addRows([['Situação', isReviewCurrent(exam) ? 'REVISADO' : 'RASCUNHO'], ['Situação clínica', exam.opinion?.clinicalStatus ? CLINICAL_STATUS_LABELS[exam.opinion.clinicalStatus] : 'Não revisada'], ...professionalClassificationLines(exam).map(line => ['Classificação registrada', line]), ['Síntese', exam.opinion?.clinical || ''], ['Parecer e conduta', exam.resultAndConduct || 'Não registrado']]);
  for (const sheet of book.worksheets) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.columns.forEach((column, index) => { column.width = index === 0 ? 24 : 32; });
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    sheet.eachRow(row => { row.alignment = { vertical: 'top', wrapText: true }; });
  }
  report.getColumn(2).width = 100;
  report.getRow(4).height = 240;
  const buffer = await book.xlsx.writeBuffer();
  saveAs(new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Audiometria_${exam.examDate}_${patient.name.replace(/[^a-zA-Z0-9À-ÿ -]/g, '').slice(0, 60)}.xlsx`);
}
