import { Audiometry, Patient } from '@/db/db';
import * as docx from 'docx';
import { saveAs } from 'file-saver';
import * as xlsx from 'xlsx';

export const exportToDocx = async (exam: Audiometry, patient: Patient) => {
  const doc = new docx.Document({
    sections: [{
      properties: {},
      children: [
        new docx.Paragraph({
          children: [new docx.TextRun({ text: "Laudo Audiométrico", bold: true, size: 32 })],
        }),
        new docx.Paragraph({ text: `Paciente: ${patient.name}` }),
        new docx.Paragraph({ text: `Data do Exame: ${exam.examDate}` }),
        new docx.Paragraph({ text: "" }),
        new docx.Paragraph({
          children: [new docx.TextRun({ text: "Parecer Fonoaudiológico:", bold: true })],
        }),
        new docx.Paragraph({ text: exam.finalReport }),
      ],
    }],
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Laudo_${patient.name.replace(/\s+/g, '_')}.docx`);
};

export const exportToXlsx = (exam: Audiometry, patient: Patient) => {
  const data = [
    { Frequencia: '125', OD_VA: exam.tonalData.right['125']?.va, OE_VA: exam.tonalData.left['125']?.va },
    { Frequencia: '250', OD_VA: exam.tonalData.right['250']?.va, OE_VA: exam.tonalData.left['250']?.va },
    { Frequencia: '500', OD_VA: exam.tonalData.right['500']?.va, OE_VA: exam.tonalData.left['500']?.va },
    { Frequencia: '1000', OD_VA: exam.tonalData.right['1000']?.va, OE_VA: exam.tonalData.left['1000']?.va },
    { Frequencia: '2000', OD_VA: exam.tonalData.right['2000']?.va, OE_VA: exam.tonalData.left['2000']?.va },
    { Frequencia: '3000', OD_VA: exam.tonalData.right['3000']?.va, OE_VA: exam.tonalData.left['3000']?.va },
    { Frequencia: '4000', OD_VA: exam.tonalData.right['4000']?.va, OE_VA: exam.tonalData.left['4000']?.va },
    { Frequencia: '6000', OD_VA: exam.tonalData.right['6000']?.va, OE_VA: exam.tonalData.left['6000']?.va },
    { Frequencia: '8000', OD_VA: exam.tonalData.right['8000']?.va, OE_VA: exam.tonalData.left['8000']?.va },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Audiometria");
  xlsx.writeFile(wb, `Audiometria_${patient.name.replace(/\s+/g, '_')}.xlsx`);
};
