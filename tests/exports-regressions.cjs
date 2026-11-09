const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the application's actual pure modules, without opening the patient's database.
const cache = new Map();
function load(file, overrides = {}) {
  const absolute = path.resolve(file);
  if (!Object.keys(overrides).length && cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name in overrides) return overrides[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
      const target = [base, `${base}.ts`, `${base}.tsx`].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      return load(target, overrides);
    }
    return require(name);
  };
  const execute = vm.runInThisContext(`(function(exports, require) { ${code}\n})`, { filename: absolute });
  execute(exports, localRequire);
  if (!Object.keys(overrides).length) cache.set(absolute, exports);
  return exports;
}

// Fixtures sintéticas; resultados esperados escritos à mão.
const integrity = load('src/lib/examIntegrity.ts');
const comparison = load('src/lib/examComparison.ts');
const format = load('src/lib/exportFormat.ts');
const tonal = va => Object.fromEntries(['250', '500', '1000', '2000', '3000', '4000', '6000', '8000'].map(f => [f, { va }]));
const fixture = (over = {}) => ({ id: 'synthetic-exam', patientId: 'synthetic-patient', examDate: '2026-10-20', examCategory: 'ocupacional', header: { clinicalRulesVersion: integrity.CLINICAL_RULES_VERSION, speechTherapist: 'Profissional de teste · CRFa teste', degreeStandard: 'OMS_2021', transducer: 'insert', assessmentMethod: 'conventional', responseType: 'threshold', reliability: 'good', auditoryRest14h: true }, tonalData: { right: tonal(10), left: tonal(10) }, meatoscopy: { right: 'normal', left: 'normal' }, resultAndConduct: 'Parecer de teste.', opinion: { clinicalStatus: 'normal_bilateral' }, createdAt: 1, updatedAt: 1, ...over });
const review = exam => ({ ...exam, opinion: { ...exam.opinion, workflowStatus: 'reviewed', reviewedSignature: integrity.reviewSignature(exam), reviewedAt: 1 } });
const ADULT = '1980-01-01';

// Coleta o texto de um documento react-pdf sem renderizar (Text etc. são primitivas em string).
function collectText(node, out = []) {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out; }
  if (Array.isArray(node)) { node.forEach(n => collectText(n, out)); return out; }
  // Text com vários filhos vira um array de pedaços; o join com espaço é normalizado em textOf.
  if (typeof node.type === 'function') return collectText(node.type(node.props), out);
  return collectText(node.props?.children, out);
}
const textOf = element => collectText(element).join(' ').replace(/\s+/g, ' ');

test('comparison order: older exam is baseline; same date breaks tie by createdAt and flags it', () => {
  const older = fixture({ id: 'a', examDate: '2025-01-10', createdAt: 50 });
  const newer = fixture({ id: 'b', examDate: '2026-01-10', createdAt: 10 });
  let r = comparison.orderForComparison(newer, older);
  assert.equal(r.baseline.id, 'a'); assert.equal(r.current.id, 'b'); assert.equal(r.sameDate, false);
  const first = fixture({ id: 'first', examDate: '2026-03-01', createdAt: 100 });
  const second = fixture({ id: 'second', examDate: '2026-03-01', createdAt: 200 });
  r = comparison.orderForComparison(second, first);
  assert.equal(r.baseline.id, 'first'); assert.equal(r.current.id, 'second'); assert.equal(r.sameDate, true);
});

test('NR-7 comparison requires two occupational exams', () => {
  const base = fixture({ examDate: '2025-10-20' }), cur = fixture();
  assert.equal(comparison.nr7ComparisonEligibility(base, cur, ADULT).eligible, true);
  const clinical = comparison.nr7ComparisonEligibility(base, fixture({ examCategory: 'clinico' }), ADULT);
  assert.equal(clinical.eligible, false);
  assert.deepEqual(clinical.blockers, ['Exame atual não está registrado como ocupacional.']);
  assert.equal(comparison.nr7ComparisonEligibility(fixture({ examCategory: undefined }), cur, ADULT).eligible, false);
});

test('NR-7 comparison age boundary: 17 at base exam blocks, 18th birthday on both dates allows', () => {
  const birth = '2008-06-15';
  const day17 = comparison.nr7ComparisonEligibility(fixture({ examDate: '2026-06-14' }), fixture({ examDate: '2026-07-01' }), birth);
  assert.equal(day17.eligible, false);
  assert.deepEqual(day17.blockers, ['Paciente com menos de 18 anos na data do exame base.']);
  assert.equal(comparison.nr7ComparisonEligibility(fixture({ examDate: '2026-06-15' }), fixture({ examDate: '2026-07-01' }), birth).eligible, true);
  const unknown = comparison.nr7ComparisonEligibility(fixture(), fixture(), undefined);
  assert.equal(unknown.eligible, false);
  assert.equal(unknown.blockers.length, 2);
});

test('NR-7 comparison warns on missing or different protocol fields without blocking', () => {
  const base = fixture({ examDate: '2025-10-20' });
  assert.deepEqual(comparison.nr7ComparisonEligibility(base, fixture(), ADULT).warnings, []);
  const cur = fixture({ header: { ...fixture().header, transducer: 'supra', reliability: '' } });
  const r = comparison.nr7ComparisonEligibility(base, cur, ADULT);
  assert.equal(r.eligible, true);
  assert.equal(r.warnings.length, 2);
  assert.match(r.warnings[0], /^Transdutor diferente entre os exames \(base: Inserção; atual: Supra-aural\)/);
  assert.equal(r.warnings[1], 'Confiabilidade: sem registro no exame atual.');
});

test('recorded "Inconclusivo" tympanometry is distinct from pending classification', () => {
  assert.equal(format.tympanometryLabel({ recordedType: 'Inconclusivo' }, 'Inconclusivo'), 'Inconclusivo (informado pelo profissional)');
  assert.equal(format.tympanometryLabel({}, 'Inconclusivo'), 'Classificação não registrada');
  assert.equal(format.tympanometryLabel({ recordedType: 'A', probeFrequency: '1000' }, 'Inconclusivo'), 'Classificação incompleta ou incompatível com a sonda');
  assert.equal(format.tympanometryLabel({ recordedType: 'As' }, 'As'), 'Tipo As (Ar)');
});

test('draft prefix and status label follow current review', () => {
  const draft = fixture();
  assert.equal(format.draftFilePrefix(draft), 'Rascunho_');
  assert.equal(format.reviewStatusLabel(draft), 'RASCUNHO — AGUARDANDO REVISÃO');
  assert.equal(format.draftFilePrefix(review(draft)), '');
  assert.equal(format.reviewStatusLabel(review(draft)), 'REVISADO');
});

async function excelBook(exam) {
  let saved;
  const exporter = load('src/lib/exportExcel.ts', { 'file-saver': { saveAs: blob => { saved = blob; } } });
  await exporter.exportToExcelJs(exam, { name: 'Paciente sintético' });
  const book = new (require('exceljs').Workbook)();
  await book.xlsx.load(Buffer.from(await saved.arrayBuffer()));
  return book;
}
const sheetRows = sheet => { const rows = []; sheet.eachRow(row => rows.push(row.values.slice(1))); return rows; };

test('Excel hides clinical status of drafts and omits legacy dif/limiar', async () => {
  const exam = fixture({ reflexes: { right: { 1000: { ipsi: 90, contra: 95, dif: '80', limiar: 85 } }, left: {} } });
  let rows = sheetRows((await excelBook(exam)).getWorksheet('Parecer'));
  assert.deepEqual(rows.find(r => r[0] === 'Situação clínica'), ['Situação clínica', 'Não revisada']);
  rows = sheetRows((await excelBook(review(exam))).getWorksheet('Parecer'));
  assert.deepEqual(rows.find(r => r[0] === 'Situação clínica'), ['Situação clínica', 'Dentro dos critérios de normalidade bilateral']);
  const details = sheetRows((await excelBook(exam)).getWorksheet('Procedimentos'));
  assert.ok(details.some(r => r[1] === 'right / 1000 / ipsi' && r[2] === '90'));
  assert.ok(!details.some(r => /dif|limiar/.test(r[1])));
  // Registro antigo só com limiar (nome antigo do ipsi): o valor medido sai como ipsi, não some.
  const legacy = sheetRows((await excelBook(fixture({ reflexes: { right: { 2000: { limiar: 100 } }, left: {} } }))).getWorksheet('Procedimentos'));
  assert.ok(legacy.some(r => r[1] === 'right / 2000 / ipsi' && r[2] === '100'));
});

test('comparative PDF: draft title, NR preserved, NR-7 block hidden for clinical exams', async () => {
  const pdfModule = load('src/lib/exportPdf.tsx', {
    '@/db/db': { db: { settings: { toArray: async () => [] } } },
    '@/lib/dialogs': { customAlert: async message => { throw new Error(message); } }
  });
  const base = fixture({ examDate: '2025-10-20', examCategory: 'clinico' });
  base.tonalData.right['4000'] = { va: 'NR', nrLevelVa: 80 };
  const cur = fixture();
  const text = textOf(pdfModule.createComparisonDocument(base, cur, { name: 'Paciente sintético', birthDate: ADULT }));
  assert.match(text, /COMPARATIVO DE AUDIOMETRIA — RASCUNHO/);
  assert.doesNotMatch(text, /LAUDO/);
  assert.match(text, /RASCUNHO — AGUARDANDO REVISÃO/);
  assert.match(text, /NR a 80 dB NA/);
  assert.doesNotMatch(text, /NR-7, Anexo II: /);
  assert.match(text, /Critérios da NR-7, Anexo II, não aplicados: Exame base não está registrado como ocupacional\./);

  const reviewedText = textOf(pdfModule.createComparisonDocument(review(fixture({ examDate: '2025-10-20' })), review(cur), { name: 'Paciente sintético', birthDate: ADULT }));
  assert.match(reviewedText, /LAUDO COMPARATIVO DE AUDIOMETRIA \(PCA \/ NR-7 ANEXO II\)/);
  assert.match(reviewedText, /NR-7, Anexo II: /);

  const blob = await require('@react-pdf/renderer').pdf(pdfModule.createComparisonDocument(base, cur, { name: 'Paciente sintético', birthDate: ADULT })).toBlob();
  assert.equal(Buffer.from(await blob.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
});

test('Word includes free field, masking, reflexes, complementary tests, protocol and IPRF dis/tris', async () => {
  let saved, name;
  const word = load('src/lib/exportWord.ts', {
    'file-saver': { saveAs: (blob, filename) => { saved = blob; name = filename; } },
    '@/db/db': { db: { settings: { toArray: async () => [] } } },
    '@/lib/dialogs': { customAlert: async message => { throw new Error(message); } }
  });
  const exam = fixture({
    freeField: { 1000: { va: 30 } },
    header: { ...fixture().header, freeFieldCondition: 'sem dispositivos, warble' },
    reflexes: { right: { 1000: { ipsi: 90, contra: 95 } }, left: {}, earConvention: 'stimulated' },
    complementary: { weber: 'Indiferente' },
    tympanometry: { right: { recordedType: 'Inconclusivo', probeFrequency: '226', curveShape: 'peaked' }, left: {} },
    logoAudiometry: { right: { srt: {}, voiceDetection: {}, irf: { dis: { listId: 'L2', correctItems: '20', totalItems: '25', db: 50 }, tris: { listId: 'L3', correctItems: '24', totalItems: '25', db: 50 } } }, left: { srt: {}, voiceDetection: {}, irf: {} } }
  });
  exam.tonalData.right['2000'] = { va: 40, maskedVa: true };
  await word.exportToDocx(exam, { name: 'Paciente sintetico' });
  assert.equal(name, 'Rascunho_Laudo_Audiometrico_Paciente_sintetico.docx');
  const zip = await require('jszip').loadAsync(Buffer.from(await saved.arrayBuffer()));
  const xml = await zip.file('word/document.xml').async('string');
  for (const expected of [
    'Campo livre (sem lateralidade; sem dispositivos, warble): 1000 Hz: 30.',
    '40 (M)',
    '(M) = limiar obtido com mascaramento.',
    '90 / 95',
    'Colunas OD/OE = orelha estimulada.',
    'Weber: ',
    'Indiferente',
    'Método: audiometria convencional; tipo de resposta: limiar auditivo; confiabilidade: boa; transdutor: inserção.',
    'IPRF (dis): lista L2; acertos 20/25; 80%',
    'IPRF (tris): lista L3; acertos 24/25; 96%',
    'Inconclusivo (informado pelo profissional)'
  ]) assert.ok(xml.includes(expected), `Word sem: ${expected}`);
});
