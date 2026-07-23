import { Audiometry, Patient, db } from '@/db/db';
import * as docx from 'docx';
import { saveAs } from 'file-saver';

const FREQUENCIES = ['125', '250', '500', '1000', '2000', '3000', '4000', '6000', '8000'];

const parseVal = (v: any) => {
  if (v === undefined || v === null || v === '-' || v === 'NR' || v === '') return '-';
  return String(v);
};

const svgToArrayBuffer = (): Promise<ArrayBuffer | null> => {
  return new Promise((resolve) => {
    const svgElement = document.getElementById('audiogram-svg');
    if (!svgElement) {
      resolve(null);
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    
    // Scale 3x for high resolution
    const SCALE = 3;
    const baseWidth = 600;
    const baseHeight = 600;
    
    canvas.width = baseWidth * SCALE;
    canvas.height = baseHeight * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      resolve(bytes.buffer);
    };
    img.onerror = () => resolve(null);
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  });
};

export const exportToDocx = async (exam: Audiometry, patient: Patient) => {
  const settingsArray = await db.settings.toArray();
  const settings = settingsArray[0];

  const imageBuffer = await svgToArrayBuffer();

  const createCell = (text: string, bold = false, color = "000000", bgColor?: string, size = 18) => {
    return new docx.TableCell({
      children: [new docx.Paragraph({ 
        children: [new docx.TextRun({ text, bold, color, size })],
        alignment: docx.AlignmentType.CENTER 
      })],
      shading: bgColor ? { fill: bgColor, type: docx.ShadingType.CLEAR, color: "auto" } : undefined,
      verticalAlign: docx.VerticalAlign.CENTER,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      borders: {
        top: { style: docx.BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
        bottom: { style: docx.BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
        left: { style: docx.BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
        right: { style: docx.BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
      }
    });
  };

  const tonalRows = FREQUENCIES.map(f => {
    return new docx.TableRow({
      children: [
        createCell(f, true, "475569", undefined, 16),
        createCell(parseVal(exam.tonalData.right[f]?.va), false, "000000", undefined, 18),
        createCell(parseVal(exam.tonalData.right[f]?.vo), false, "000000", undefined, 18),
        createCell(parseVal(exam.tonalData.left[f]?.va), false, "000000", undefined, 18),
        createCell(parseVal(exam.tonalData.left[f]?.vo), false, "000000", undefined, 18),
      ]
    });
  });

  const tonalTable = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({
        children: [
          createCell("Freq. (Hz)", true, "1E293B", "F1F5F9", 16),
          createCell("VA (OD)", true, "DC2626", "F1F5F9", 16),
          createCell("VO (OD)", true, "DC2626", "F1F5F9", 16),
          createCell("VA (OE)", true, "2563EB", "F1F5F9", 16),
          createCell("VO (OE)", true, "2563EB", "F1F5F9", 16),
        ]
      }),
      ...tonalRows
    ]
  });

  const vocalTable = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({
        children: [
          createCell("Teste", true, "1E293B", "F1F5F9", 16),
          createCell("OD", true, "DC2626", "F1F5F9", 16),
          createCell("OE", true, "2563EB", "F1F5F9", 16),
        ]
      }),
      new docx.TableRow({ children: [ createCell("LRF (dB)", true, "475569", undefined, 16), createCell(parseVal(exam.vocalData.right.lrf)), createCell(parseVal(exam.vocalData.left.lrf)) ] }),
      new docx.TableRow({ children: [ createCell("LDV (dB)", true, "475569", undefined, 16), createCell(parseVal(exam.vocalData.right.ldt)), createCell(parseVal(exam.vocalData.left.ldt)) ] }),
      new docx.TableRow({ children: [ createCell("IPRF (%)", true, "475569", undefined, 16), createCell(parseVal(exam.vocalData.right.iprfMono)), createCell(parseVal(exam.vocalData.left.iprfMono)) ] }),
    ]
  });

  // Layout table for side-by-side Chart and Tonal Data
  const layoutTable = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    borders: docx.TableBorders.NONE, // Invisible grid
    rows: [
      new docx.TableRow({
        children: [
          new docx.TableCell({
            width: { size: 50, type: docx.WidthType.PERCENTAGE },
            verticalAlign: docx.VerticalAlign.TOP,
            borders: docx.TableBorders.NONE,
            children: imageBuffer ? [
              new docx.Paragraph({
                children: [
                  new docx.ImageRun({
                    data: imageBuffer,
                    transformation: { width: 320, height: 320 },
                  })
                ],
                alignment: docx.AlignmentType.CENTER,
              })
            ] : [new docx.Paragraph({ text: "Gráfico Indisponível" })]
          }),
          new docx.TableCell({
            width: { size: 50, type: docx.WidthType.PERCENTAGE },
            verticalAlign: docx.VerticalAlign.TOP,
            borders: docx.TableBorders.NONE,
            children: [
              new docx.Paragraph({
                children: [new docx.TextRun({ text: "Limiares Tonais", bold: true, size: 20, color: "1E3A8A" })],
                spacing: { after: 100 },
                alignment: docx.AlignmentType.CENTER
              }),
              tonalTable,
              
              new docx.Paragraph({
                children: [new docx.TextRun({ text: "Logoaudiometria", bold: true, size: 20, color: "1E3A8A" })],
                spacing: { before: 300, after: 100 },
                alignment: docx.AlignmentType.CENTER
              }),
              vocalTable
            ]
          })
        ]
      })
    ]
  });

  const doc = new docx.Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 20 },
          paragraph: { spacing: { line: 276 } } // 1.15 spacing
        }
      }
    },
    sections: [{
      properties: {
        page: { margin: { top: 700, right: 700, bottom: 700, left: 700 } }
      },
      children: [
        // Header with solid blue background effect
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          borders: docx.TableBorders.NONE,
          rows: [
            new docx.TableRow({
              children: [
                new docx.TableCell({
                  shading: { fill: "1E3A8A", type: docx.ShadingType.CLEAR, color: "auto" },
                  margins: { top: 200, bottom: 200 },
                  borders: docx.TableBorders.NONE,
                  children: [
                    new docx.Paragraph({
                      children: [new docx.TextRun({ text: settings?.clinicName || "Clínica de Audiologia", bold: true, size: 32, color: "FFFFFF" })],
                      alignment: docx.AlignmentType.CENTER,
                      spacing: { after: 50 }
                    }),
                    new docx.Paragraph({
                      children: [new docx.TextRun({ text: `${settings?.professionalName || 'Fonoaudiólogo'} - CRFa: ${settings?.crfaNumber || '---'}`, size: 20, color: "E2E8F0" })],
                      alignment: docx.AlignmentType.CENTER,
                    })
                  ]
                })
              ]
            })
          ]
        }),
        
        new docx.Paragraph({ spacing: { before: 300 } }), // spacer
        
        // Patient Info Block
        new docx.Paragraph({
          children: [new docx.TextRun({ text: "Identificação do Paciente", bold: true, size: 24, color: "1E3A8A" })],
          border: { bottom: { color: "CBD5E1", space: 1, value: "single", size: 6 } },
          spacing: { after: 100 }
        }),
        
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          borders: docx.TableBorders.NONE,
          rows: [
            new docx.TableRow({
              children: [
                new docx.TableCell({
                  borders: docx.TableBorders.NONE,
                  children: [
                    new docx.Paragraph({ children: [new docx.TextRun({ text: "Nome: ", bold: true }), new docx.TextRun({ text: patient.name })] }),
                    new docx.Paragraph({ children: [new docx.TextRun({ text: "Anamnese: ", bold: true }), new docx.TextRun({ text: exam.anamnesis.queixa || 'Negada' })] })
                  ]
                }),
                new docx.TableCell({
                  borders: docx.TableBorders.NONE,
                  children: [
                    new docx.Paragraph({ children: [new docx.TextRun({ text: "Data: ", bold: true }), new docx.TextRun({ text: new Date(exam.examDate).toLocaleDateString('pt-BR') })] })
                  ]
                })
              ]
            })
          ]
        }),
        
        new docx.Paragraph({ spacing: { before: 300 } }), // spacer
        
        // Main Content (Side-by-side)
        layoutTable,

        new docx.Paragraph({ spacing: { before: 300 } }), // spacer

        // Parecer Fonoaudiológico
        new docx.Paragraph({
          children: [new docx.TextRun({ text: "Parecer Fonoaudiológico", bold: true, size: 24, color: "1E3A8A" })],
          border: { bottom: { color: "CBD5E1", space: 1, value: "single", size: 6 } },
          spacing: { after: 100 }
        }),
        
        // Box for Parecer
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          borders: {
            top: { style: docx.BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
            bottom: { style: docx.BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
            left: { style: docx.BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
            right: { style: docx.BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
          },
          rows: [
            new docx.TableRow({
              children: [
                new docx.TableCell({
                  margins: { top: 150, bottom: 150, left: 150, right: 150 },
                  shading: { fill: "F8FAFC", type: docx.ShadingType.CLEAR, color: "auto" },
                  children: [
                    new docx.Paragraph({ text: exam.finalReport || "Sem parecer registrado." })
                  ]
                })
              ]
            })
          ]
        }),

        // Signature Line
        new docx.Paragraph({
          children: [new docx.TextRun({ text: "_________________________________________________" })],
          alignment: docx.AlignmentType.CENTER,
          spacing: { before: 800, after: 100 }
        }),
        new docx.Paragraph({
          children: [new docx.TextRun({ text: settings?.professionalName || 'Fonoaudiólogo(a)', bold: true })],
          alignment: docx.AlignmentType.CENTER,
        }),
        new docx.Paragraph({
          children: [new docx.TextRun({ text: `CRFa: ${settings?.crfaNumber || '---'}`, color: "475569", size: 18 })],
          alignment: docx.AlignmentType.CENTER,
        }),
      ],
    }],
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Laudo_${patient.name.replace(/\s+/g, '_')}.docx`);
};
