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

const a = load('src/lib/audiologyCalculations.ts');
const protocol = load('src/lib/clinicalProtocol.ts');
const integrity = load('src/lib/examIntegrity.ts');
const reports = load('src/services/aiAudiologyService.ts');
const overview = load('src/lib/clinicalOverview.ts');
const tonal = va => Object.fromEntries(['250', '500', '1000', '2000', '3000', '4000', '6000', '8000'].map(f => [f, { va }]));
const fixture = () => ({ id: 'synthetic-exam', patientId: 'synthetic-patient', examDate: '2026-10-20', header: { clinicalRulesVersion: integrity.CLINICAL_RULES_VERSION, speechTherapist: 'Profissional de teste · CRFa teste', degreeStandard: 'OMS_2021', transducer: 'insert', assessmentMethod: 'conventional', responseType: 'threshold', reliability: 'good' }, tonalData: { right: tonal(10), left: tonal(10) }, meatoscopy: { right: 'normal', left: 'normal' }, resultAndConduct: 'Parecer de teste revisado pelo profissional.', opinion: { clinicalStatus: 'normal_bilateral' }, createdAt: 1, updatedAt: 1 });
const review = exam => ({ ...exam, opinion: { ...exam.opinion, workflowStatus: 'reviewed', reviewedSignature: integrity.reviewSignature(exam), reviewedAt: 1 } });

test('numeric parsing accepts Brazilian decimals and rejects garbage/nonfinite values', () => {
  assert.equal(a.getNumericThreshold('0,8'), 0.8);
  for (const value of ['10abc', 'Infinity', 'NR', ' ', NaN, Infinity]) assert.equal(a.getNumericThreshold(value), null);
  assert.equal(a.getNumericThreshold(0), 0);
});
test('means require every prescribed frequency and never replace NR by 120', () => {
  assert.equal(a.calculatePTA({ 500: { va: 10 }, 1000: { va: 20 } }).tritonal, null);
  assert.equal(a.calculatePTA({ 500: { va: 10 }, 1000: { va: 20 }, 2000: { va: 30 } }).tritonal, 20);
  assert.equal(a.calculatePTA({ 500: { va: 'NR' }, 1000: { va: 'NR' }, 2000: { va: 'NR' }, 4000: { va: 'NR' } }).quadritonal, null);
  assert.equal(a.classifyDegree({ tritonal: 10, quadritonal: null }, 'OMS_2021').code, 'NA');
});
test('WHO and Lloyd tables keep their own mean and boundaries', () => {
  const pta = { tritonal: 30, quadritonal: 65 };
  assert.equal(a.classifyDegree(pta, 'OMS_2021').code, 'SEVERA');
  assert.equal(a.classifyDegree(pta, 'OMS_2014').code, 'SEVERA');
  assert.equal(a.classifyDegree(pta, 'LLOYD_KAPLAN').code, 'LEVE');
});
test('air-only, incomplete and NR audiograms do not establish sensorineural type', () => {
  assert.match(a.classifyType(tonal(50)), /Indeterminado/);
  assert.match(a.classifyType({ 500: { va: 10 } }), /Indeterminado/);
  assert.match(a.classifyType(tonal('NR')), /Não avaliado|Indeterminado/);
});
test('masked paired data distinguish conductive and sensorineural patterns', () => {
  const conductive = tonal(40), sensorineural = tonal(40);
  for (const f of ['500', '1000', '2000', '4000']) { conductive[f] = { va: 40, vo: 10, maskedVo: true }; sensorineural[f] = { va: 40, vo: 35 }; }
  assert.equal(a.classifyType(conductive), 'Condutiva');
  assert.equal(a.classifyType(sensorineural), 'Neurossensorial');
  conductive[1000].maskedVo = false;
  assert.match(a.classifyType(conductive), /mascaramento/);
});
test('missing speech/reflex measures are not concordance or normality', () => {
  assert.equal(a.validateSpeechConcordance(undefined, null).isConcordant, null);
  assert.match(a.classifyIPRF(150).rating, /inválido/);
  assert.match(a.classifyIPRF(-1).rating, /inválido/);
  assert.doesNotMatch(a.classifyIPRF(10).interpretation, /neuropatia|retrococlear/);
  assert.match(a.analyzeStapedialReflexes({ 1000: { ipsi: 40 } }, { 1000: { va: 60 } }, 'right')[0].interpretation, /Inconsistência/);
});
test('masking and occupational analysis do not manufacture contralateral thresholds or etiology', () => {
  assert.equal(a.checkMaskingNecessity({ 1000: { va: 80 } }, {}).length, 0);
  assert.equal(a.isSuggestivePAIR({ 4000: { va: 50 }, 8000: { va: 20 } }, { 4000: { va: 50 }, 8000: { va: 20 } }).isPAIR, false);
  assert.equal(a.assessNR7Audiogram({ 4000: { va: 50 }, 8000: { va: 20 } }).status, 'not_assessable');
});
test('tympanometry needs documented context and never synthesizes measurement', () => {
  const data = { peak: 0, compliance200: '0,8', volume: 1, probeFrequency: '226', curveShape: 'peaked' };
  assert.equal(a.classifyTympanometry(data).type, 'Inconclusivo');
  assert.equal(a.classifyTympanometry(data, true).type, 'Inconclusivo');
  assert.equal(a.classifyTympanometry({ ...data, recordedType: 'A', admittanceUnit: 'ml', normativeReference: 'Referência documentada do teste sintético' }).type, 'A');
  assert.equal(a.classifyTympanometry({ ...data, compliance200: -1 }, true).type, 'Inconclusivo');
  assert.equal(a.classifyTympanometry({ ...data, probeFrequency: '1000' }, true).type, 'Inconclusivo');
});
test('age is calculated at examination and handles birthdays, infants and invalid dates', () => {
  assert.equal(integrity.ageAtExam('2010-10-22', '2026-10-21').years, 15);
  assert.equal(integrity.ageAtExam('2010-10-21', '2026-10-21').years, 16);
  assert.equal(integrity.ageAtExam('2026-10-01', '2026-10-21').label, '20 dias');
  assert.equal(integrity.ageAtExam('2026-02-30', '2026-10-21'), null);
  assert.equal(integrity.ageAtExam('2026-10-22', '2026-10-21'), null);
});
test('zero and left-ear-only data remain recorded', () => {
  assert.equal(integrity.hasRecordedValue({ left: { srt: { db: 0 } } }), true);
  assert.equal(integrity.hasRecordedValue({ right: {}, left: {} }), false);
});
test('NR stores actual presentation level, including legacy unknown level', () => {
  assert.equal(integrity.formatTonalValue({ va: 'NR', nrLevelVa: 80 }, 'va'), 'NR a 80 dB NA');
  assert.equal(integrity.noResponseLevel({ vo: 'NR' }, 'vo'), null);
  assert.match(integrity.formatTonalValue({ vo: 'NR' }, 'vo'), /não informado/);
});
test('local summary never diagnoses an empty or pediatric exam or prescribes AASI', () => {
  const empty = reports.generateLocalClinicalReport({ tonalData: { right: {}, left: {} } });
  assert.doesNotMatch(empty.fullLaudo, /Perda auditiva bilateral|perda confirmada|Indicação.*AASI/);
  assert.equal(empty.opinion.lossTypeRight, undefined);
  const pediatric = reports.generateLocalClinicalReport(fixture(), 4);
  // Criança: tipo continua manual; grau só pela tabela indicada para crianças (aqui OMS 2021, Quadro 15).
  assert.equal(pediatric.opinion.lossTypeRight, undefined);
  assert.match(pediatric.opinion.lossDegreeRight, /sem grau/);
  const pediatricAdultTable = reports.generateLocalClinicalReport({ ...fixture(), header: { ...fixture().header, degreeStandard: 'LLOYD_KAPLAN' } }, 4);
  assert.equal(pediatricAdultTable.opinion.lossDegreeRight, undefined);
  const adult = reports.generateLocalClinicalReport(fixture(), 40);
  assert.equal(adult.opinion.lossTypeRight, 'Limiares dentro do padrão de normalidade');
  assert.match(adult.opinion.lossDegreeRight, /sem grau/);
});
test('review survives serialization/property reordering and becomes stale on clinical changes', () => {
  const exam = review(fixture());
  assert.equal(integrity.isReviewCurrent(JSON.parse(JSON.stringify(exam))), true);
  assert.equal(integrity.isReviewCurrent({ ...exam, header: Object.fromEntries(Object.entries(exam.header).reverse()) }), true);
  for (const patch of [{ patientId: 'another' }, { examDate: '2026-10-19' }, { resultAndConduct: 'Texto alterado' }, { header: { ...exam.header, transducer: 'supra' } }, { tonalData: { ...exam.tonalData, left: tonal(50) } }]) assert.equal(integrity.isReviewCurrent({ ...exam, ...patch }), false);
});
test('review blocks invalid IPRF, NR without intensity and normality from field alone', () => {
  assert.equal(integrity.getReviewIssues(fixture()).length, 0);
  assert.ok(integrity.getReviewIssues({ ...fixture(), tonalData: { right: { 500: { va: 'NR' } }, left: {} } }).some(s => /nível apresentado/.test(s)));
  assert.ok(integrity.getReviewIssues({ ...fixture(), logoAudiometry: { left: { irf: { mono: { percentage: 150 } } } } }).some(s => /0 e 100/.test(s)));
  assert.ok(integrity.getReviewIssues({ ...fixture(), tonalData: { right: {}, left: {} }, freeField: tonal(10) }).some(s => /lateralidade/.test(s)));
});
test('dashboard uses reviewed structured decisions, not normal substrings', () => {
  const draft = { ...fixture(), opinion: { clinical: 'Normal OD; alterado OE' } };
  const altered = review({ ...fixture(), opinion: { clinical: 'Normal OD; alterado OE', clinicalStatus: 'altered' } });
  const counts = overview.summarizeExams([draft, altered, review(fixture())]);
  assert.equal(counts.normal, 1); assert.equal(counts.altered, 1); assert.equal(counts.draft, 1);
});
test('next appointment never falls back to completed or past entries', () => {
  const appointments = [{ id: '1', status: 'completed', time: '08:00' }, { id: '2', status: 'scheduled', time: '09:00' }, { id: '3', status: 'scheduled', time: '14:00' }];
  assert.equal(overview.nextScheduledAppointment(appointments, '12:00').id, '3');
  assert.equal(overview.nextScheduledAppointment(appointments, '15:00'), null);
});
test('Excel round-trip preserves NR level, intermediate frequencies, zero and OE procedures', async () => {
  let saved;
  const exporter = load('src/lib/exportExcel.ts', { 'file-saver': { saveAs: blob => { saved = blob; } } });
  const exam = fixture();
  exam.tonalData.right[750] = { va: 'NR', nrLevelVa: 80 };
  exam.tonalData.left[1500] = { va: 0 };
  exam.logoAudiometry = { left: { srt: { db: 0 }, irf: { mono: { percentage: 0, db: 60 } } } };
  await exporter.exportToExcelJs(exam, { name: 'Paciente sintético' });
  const book = new (require('exceljs').Workbook)();
  await book.xlsx.load(Buffer.from(await saved.arrayBuffer()));
  const tonalSheet = book.getWorksheet('Audiometria tonal');
  const rows = [];
  tonalSheet.eachRow(row => rows.push(row.values));
  assert.equal(rows.find(row => row[1] === '750')[2], 'NR a 80 dB NA');
  assert.equal(rows.find(row => row[1] === '1500')[6], 0);
  assert.match(JSON.stringify(book.getWorksheet('Procedimentos').getSheetValues()), /left \/ srt \/ db/);
  assert.match(book.getWorksheet('Identificação').getCell('B2').value, /RASCUNHO/);
});

test('PDF renders a synthetic draft with legacy NR, zero and OE-only measures', async () => {
  const renderer = require('@react-pdf/renderer');
  const pdfModule = load('src/lib/exportPdf.tsx', {
    '@/db/db': { db: { settings: { toArray: async () => [] } } },
    '@/lib/dialogs': { customAlert: async message => { throw new Error(message); } }
  });
  const exam = fixture();
  exam.tonalData.right[750] = { va: 'NR' };
  exam.tonalData.left[1500] = { va: 'NR', nrLevelVa: 90 };
  exam.logoAudiometry = { left: { srt: { db: 0 }, irf: { mono: { percentage: 0, db: 60 } } } };
  exam.tympanometry = { left: { peak: 0, compliance200: '0,8', volume: 1, probeFrequency: '226', curveShape: 'peaked', recordedType: 'A' } };
  const element = pdfModule.createAudiometryDocument(exam, { name: 'Paciente sintético', birthDate: '1980-01-01' });
  const blob = await renderer.pdf(element).toBlob();
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
  assert.ok(bytes.length > 1000);
});


test('BSA 2018 masking uses explicit protocol and insertion threshold 55 dB', () => {
  const right = { 1000: { va: 65, vo: 60 } }, left = { 1000: { va: 10, vo: 5 } };
  assert.equal(a.checkMaskingNecessity(right, left, 'insert').length, 0);
  assert.ok(a.checkMaskingNecessity(right, left, 'insert', 'BSA_2018').some(alert => alert.type === 'VA' && alert.ear === 'right'));
  const rule3 = a.checkMaskingNecessity({ 1000: { va: 60, vo: 55 } }, { 1000: { va: 50, vo: 5 } }, 'insert', 'BSA_2018');
  assert.ok(rule3.some(alert => alert.type === 'VA' && /regra 3/.test(alert.reason)));
  assert.ok(a.checkMaskingNecessity({ 1000: { va: 30, vo: 20 } }, { 1000: { va: 10 } }, 'supra', 'BSA_2018').some(alert => alert.type === 'VO'));
});
test('BSA retest review respects 5 dB boundary and never replaces final threshold', () => {
  assert.equal(protocol.assessRetest1000(10, 15).requiresReview, false);
  assert.equal(protocol.assessRetest1000(10, 20).requiresReview, true);
  assert.equal(protocol.assessRetest1000('NR', 20).difference, null);
  const exam = fixture();
  exam.header.audiometryProtocol = 'BSA_2018';
  exam.header.retest1000 = { right: '20' };
  assert.ok(integrity.getReviewIssues(exam).some(s => /reteste/.test(s)));
  exam.header.retest1000.notes = 'Variação investigada e decisão final registrada pelo profissional de teste.';
  assert.equal(integrity.getReviewIssues(exam).length, 0);
});
test('recognition score is computed from actual counts without assuming 25 items', () => {
  assert.equal(protocol.calculateRecognitionScore('23', '25').percent, 92);
  assert.equal(protocol.calculateRecognitionScore('23', '50').percent, 46);
  assert.equal(protocol.calculateRecognitionScore('1', '3').percent, 33.33);
  assert.equal(protocol.calculateRecognitionScore('0', '25').percent, 0);
  for (const [c, n] of [['26', '25'], ['1', '0'], ['1.5', '25'], [' ', '25'], [null, '25']]) assert.equal(protocol.calculateRecognitionScore(c, n).percent, null);
  assert.equal(protocol.recognitionPercentage({ correctItems: '23', totalItems: '25', percentage: 100 }), 92);
});
test('review detects conflicting counts, unsupported units and missing source metadata', () => {
  const exam = fixture();
  exam.logoAudiometry = { right: { language: 'pt-BR', materialReference: 'Material sintético', presentation: 'recorded', responseMode: 'Repetição', irf: { mono: { correctItems: '23', totalItems: '25', percentage: 100, listId: 'Lista sintética', db: 60 } } } };
  assert.ok(integrity.getReviewIssues(exam).some(s => /não corresponde/.test(s)));
  exam.logoAudiometry.right.irf.mono.percentage = 92;
  assert.equal(integrity.getReviewIssues(exam).length, 0);
  exam.tympanometry = { right: { probeFrequency: '1000', curveShape: 'peaked', peak: 0, compliance200: 1, admittanceUnit: 'ml', normativeReference: 'Referência sintética' } };
  assert.ok(integrity.getReviewIssues(exam).some(s => /mmho/.test(s)));
});
test('updated clinical rules invalidate previous review; children only receive the Guide pediatric tables', () => {
  const old = fixture(); old.header.clinicalRulesVersion = '2026-10-21.1';
  assert.equal(integrity.isReviewCurrent(review(old)), false);
  for (const standard of ['OMS_2014', 'LLOYD_KAPLAN', 'KAPLAN_1993', 'DAVIS_1970', 'BIAP_1996']) assert.equal(a.classifyDegree({ tritonal: 10, quadritonal: 10 }, standard, true).code, 'NA');
  assert.equal(a.classifyDegree({ tritonal: 10, quadritonal: 10 }, 'NORTHERN_DOWNS_2005', false).code, 'NA');
  assert.equal(a.classifyDegree({ tritonal: 10, quadritonal: 10 }, 'NORTHERN_DOWNS_2005', true).code, 'NORMAL');
  assert.equal(a.classifyDegree({ tritonal: 10, quadritonal: 25 }, 'OMS_2021', true).code, 'LEVE');
});


test('audiogram intermediate frequencies use logarithmic positions, not half-octave approximations', () => {
  assert.equal(protocol.frequencyOctaveOffset(125), 0);
  assert.equal(protocol.frequencyOctaveOffset(1000), 3);
  assert.equal(protocol.frequencyOctaveOffset(8000), 6);
  assert.ok(Math.abs(protocol.frequencyOctaveOffset(750) - 2.584962500721156) < 1e-10);
  assert.ok(Math.abs(protocol.frequencyOctaveOffset(3000) - 4.584962500721156) < 1e-10);
});

const plot = load('src/lib/examPlot.ts');
test('audiogram line stops at NR and invalid values, preserves zero and untested interoctaves', () => {
  const data = { 250: { va: 0 }, 500: { va: 15 }, 1000: { va: 'NR', nrLevelVa: 95 }, 2000: { va: 30 }, 4000: { va: 40 } };
  assert.deepEqual(plot.airConductionSegments(data), [ [{ frequency: '250', level: 0 }, { frequency: '500', level: 15 }], [{ frequency: '2000', level: 30 }, { frequency: '4000', level: 40 }] ]);
  assert.equal(plot.airConductionPath(data, Number, v => v), 'M 250,0 L 500,15 M 2000,30 L 4000,40');
  for (const value of [NaN, Infinity, -15, 125, 12, null, '20']) assert.equal(plot.plottedLevel({ va: value }, 'va'), null);
  assert.equal(plot.plottedLevel({ va: 'NR' }, 'va'), null);
  assert.equal(plot.plottedLevel({ vo: 'NR', nrLevelVo: 65 }, 'vo'), 65);
});
test('tympanometry plot distinguishes flat/missing/invalid from recorded peaks, including zero', () => {
  const data = { curveShape: 'peaked', probeFrequency: '226', admittanceUnit: 'ml', peak: 0, compliance200: '0,8' };
  assert.deepEqual(plot.tympanometryPeak(data).point, { pressure: 0, admittance: 0.8, probe: '226', unit: 'ml' });
  assert.equal(plot.tympanometryPeak({ ...data, curveShape: 'flat' }).point, null);
  assert.equal(plot.tympanometryPeak({ ...data, compliance200: -1 }).point, null);
  assert.equal(plot.tympanometryPeak({ ...data, peak: '' }).point, null);
  assert.equal(plot.tympanometryPeak({ ...data, probeFrequency: '1000' }).point, null);
  assert.equal(plot.tympanometryPeak({ ...data, probeFrequency: '1000', admittanceUnit: 'mmho' }).point.unit, 'mmho');
  assert.equal(plot.tympanometryPeak({ ...data, peak: -600 }).point.pressure, -600);
});
test('rendered audiogram has standard geometry, measured field path and vertical NR arrows', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Component = load('src/components/AudiogramSVG.tsx').default;
  const markup = renderToStaticMarkup(React.createElement(Component, { freeFieldData: { 500: { va: 0 }, 1000: { va: 20 }, 2000: { va: 'NR', nrLevelVa: 80 } }, rightData: { 4000: { va: NaN } } }));
  assert.match(markup, /M 220,80 L 300,160/);
  assert.match(markup, /x1="380" y1="408" x2="380" y2="419"/);
  assert.doesNotMatch(markup, /NaN|undefined/);
  assert.match(markup, /stroke-dasharray="3,3"/);
});
test('rendered tympanometry separates probe frequencies and units; curve is labelled illustrative', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Component = load('src/components/TympanogramSVG.tsx').default;
  const base = { curveShape: 'peaked', peak: -600, compliance200: 1 };
  const markup = renderToStaticMarkup(React.createElement(Component, { rightData: { ...base, probeFrequency: '226', admittanceUnit: 'ml' }, leftData: { ...base, probeFrequency: '1000', admittanceUnit: 'mmho' } }));
  assert.equal((markup.match(/<svg/g) || []).length, 2);
  assert.equal((markup.match(/<circle/g) || []).length, 2);
  // Decisão do usuário (21/10/2026): curva ilustrativa passando pelo pico, sempre identificada como não medida.
  assert.equal((markup.match(/data-illustrative="true"/g) || []).length, 2);
  assert.match(markup, /Não é o traçado medido/);
  assert.match(markup, /-600/);
  assert.match(markup, /pressão do pico -600 daPa/);
  assert.match(markup, /<figcaption/);
});

const speechPlot = load('src/lib/speechPlot.ts');
test('speech graph uses measured presentation level and counts, preserves zero and omits incomplete records', () => {
  assert.deepEqual(speechPlot.speechRecognitionPoint({ db: 0, percentage: 0 }), { level: 0, percent: 0, list: 'não informada' });
  assert.equal(speechPlot.speechRecognitionPoint({ db: '65,5', correctItems: '23', totalItems: '25', percentage: 100 }).percent, 92);
  for (const point of [{ percentage: 90 }, { db: 60 }, { db: 'NR', percentage: 90 }, { db: 60, percentage: 120 }, { db: 60, correctItems: '26', totalItems: '25', percentage: 90 }, { db: 125, percentage: 90 }]) assert.equal(speechPlot.speechRecognitionPoint(point), null);
  assert.equal(speechPlot.speechX(-10), 55);
  assert.equal(speechPlot.speechX(120), 565);
  assert.equal(speechPlot.speechY(0), 245);
  assert.equal(speechPlot.speechY(100), 25);
});
test('speech graph separates word materials and does not fabricate curves or threshold estimates', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Component = load('src/components/SpeechRecognitionSVG.tsx').default;
  const data = { right: { irf: { mono: { db: 60, correctItems: '0', totalItems: '25', listId: 'Lista de teste' }, dis: { db: 50, percentage: 80 } } }, left: { irf: { mono: { db: 60, percentage: 100 }, tris: { percentage: 90 } } } };
  const groups = speechPlot.speechRecognitionPlots(data);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].points.length, 2);
  const markup = renderToStaticMarkup(React.createElement(Component, { data }));
  assert.equal((markup.match(/<svg/g) || []).length, 2);
  assert.match(markup, /cy="245"/);
  assert.doesNotMatch(markup, /<path|<polyline|NaN/);
  const empty = renderToStaticMarkup(React.createElement(Component, {}));
  assert.doesNotMatch(empty, /<svg/);
  assert.match(empty, /registre o nível/);
});

test('selecting an otoscopy finding does not invent anatomy, affect the other ear or decide referral', () => {
  const Component = load('src/components/exams/MeatoscopyExam.tsx').default;
  const current = { right: '', left: '', rightDescription: '', leftDescription: '', referToENT: false };
  let received;
  const root = Component({ meatoscopy: current, onChange: data => { received = data; } });
  const selects = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === 'select') selects.push(node);
    visit(node.props?.children);
  }
  visit(root);
  assert.equal(selects.length, 2);
  selects[0].props.onChange({ target: { value: 'cerumen' } });
  assert.deepEqual(received, { ...current, right: 'cerumen' });
  selects[1].props.onChange({ target: { value: 'perforation' } });
  assert.deepEqual(received, { ...current, left: 'perforation' });
});


// ---- Revisão científica 2 (21/10/2026). Valores esperados calculados manualmente a partir das fontes citadas. ----
const nr7 = (values, bone = {}) => Object.fromEntries(['500', '1000', '2000', '3000', '4000', '6000', '8000'].map((f, i) => [f, { va: values[i], ...(bone[f] !== undefined ? { vo: bone[f] } : {}) }]));

test('Guia CFFa 2023: média dentro do padrão não recebe grau; fronteiras OMS 2021 e Lloyd e Kaplan', () => {
  assert.equal(a.classifyDegree({ quadritonal: 19.9 }, 'OMS_2021').code, 'NORMAL');
  assert.doesNotMatch(a.classifyDegree({ quadritonal: 19.9 }, 'OMS_2021').degree, /Audição Normal|grau normal/i);
  assert.equal(a.classifyDegree({ quadritonal: 20 }, 'OMS_2021').code, 'LEVE');
  assert.equal(a.classifyDegree({ quadritonal: 34.9 }, 'OMS_2021').code, 'LEVE');
  assert.equal(a.classifyDegree({ quadritonal: 35 }, 'OMS_2021').code, 'MODERADA');
  assert.equal(a.classifyDegree({ quadritonal: 95 }, 'OMS_2021').code, 'COMPLETA');
  assert.equal(a.classifyDegree({ tritonal: 25 }, 'LLOYD_KAPLAN').code, 'NORMAL');
  assert.equal(a.classifyDegree({ tritonal: 26.7 }, 'LLOYD_KAPLAN').code, 'LEVE');
  assert.equal(a.classifyDegree({ tritonal: 90 }, 'LLOYD_KAPLAN').code, 'SEVERA');
  assert.equal(a.classifyDegree({ tritonal: 91.7 }, 'LLOYD_KAPLAN').code, 'PROFUNDA');
  assert.match(a.classifyDegree({ tritonal: null, quadritonal: null }, 'OMS_2021').degree, /requer/);
});

test('OMS 2021: classificação global pela melhor orelha e categoria unilateral', () => {
  // OD: (10+10+10+10)/4 = 10; OE: (40+40+40+40)/4 = 40 → unilateral (melhor < 20; pior ≥ 35).
  assert.equal(a.classifyWHOGlobal({ quadritonal: 10 }, { quadritonal: 40 }).code, 'UNILATERAL');
  // melhor 30 → leve pela melhor orelha, mesmo com a outra em 70.
  assert.equal(a.classifyWHOGlobal({ quadritonal: 30 }, { quadritonal: 70 }).code, 'LEVE');
  assert.equal(a.classifyWHOGlobal({ quadritonal: 30 }, { quadritonal: 70 }).betterEar, 'right');
  // melhor 15 e pior 30: não unilateral (pior < 35), melhor orelha dentro do padrão.
  assert.equal(a.classifyWHOGlobal({ quadritonal: 15 }, { quadritonal: 30 }).code, 'NORMAL');
  assert.equal(a.classifyWHOGlobal({ quadritonal: null }, { quadritonal: 30 }).code, 'NA');
});

test('Silman e Silverman (Quadro 2 do Guia CFFa): tipo pelas frequências com VO, sem exigir 250/6k/8k', () => {
  const ear = { 500: { va: 40, vo: 35 }, 1000: { va: 45, vo: 40 }, 2000: { va: 50, vo: 45 }, 4000: { va: 60, vo: 55 } };
  assert.equal(a.classifyType(ear), 'Neurossensorial');
  const mixed = { 500: { va: 60, vo: 30, maskedVo: true }, 1000: { va: 60, vo: 35, maskedVo: true }, 2000: { va: 60, vo: 40, maskedVo: true }, 4000: { va: 65, vo: 45, maskedVo: true } };
  assert.equal(a.classifyType(mixed), 'Mista');
  // gap de 15 com VO 20: VO > 15 e gap > 10 → mista; com VO 15: condutiva.
  assert.equal(a.classifyType({ 500: { va: 35, vo: 20, maskedVo: true }, 1000: { va: 35, vo: 20, maskedVo: true }, 2000: { va: 35, vo: 20, maskedVo: true }, 4000: { va: 35, vo: 20, maskedVo: true } }), 'Mista');
  assert.equal(a.classifyType({ 500: { va: 30, vo: 15, maskedVo: true }, 1000: { va: 30, vo: 15, maskedVo: true }, 2000: { va: 30, vo: 15, maskedVo: true }, 4000: { va: 30, vo: 15, maskedVo: true } }), 'Condutiva');
  // alteração restrita a 6 e 8 kHz: sem VO → tipo não determinável.
  assert.match(a.classifyType({ 500: { va: 10 }, 1000: { va: 10 }, 2000: { va: 15 }, 4000: { va: 20 }, 6000: { va: 45 }, 8000: { va: 50 } }), /sem via óssea/);
  assert.equal(a.classifyType({ 500: { va: 10 }, 1000: { va: 10 }, 2000: { va: 15 }, 4000: { va: 25 } }), 'Limiares dentro do padrão de normalidade');
});

test('NR-7 Anexo II, item 3.6, 5.1 e 5.2: avaliação descritiva por orelha', () => {
  assert.equal(a.assessNR7Audiogram(nr7([10, 10, 15, 20, 25, 25, 20])).status, 'acceptable');
  assert.equal(a.assessNR7Audiogram(nr7([10, 10, 15, 20, 25, 25, 'NR'])).status, 'not_assessable');
  // entalhe em 4 kHz (45) maior que 0,5–2k e 8k (20): padrão em VA; sem VO → incompleto.
  assert.equal(a.assessNR7Audiogram(nr7([10, 10, 15, 30, 45, 35, 20])).status, 'suggestive_air_only');
  assert.equal(a.assessNR7Audiogram(nr7([10, 10, 15, 30, 45, 35, 20], { 500: 10, 1000: 10, 2000: 15, 3000: 30, 4000: 40 })).status, 'suggestive');
  // VO normal em 3 e 4 kHz: padrão não reproduzido na VO.
  assert.equal(a.assessNR7Audiogram(nr7([10, 10, 15, 30, 45, 35, 20], { 500: 5, 1000: 5, 2000: 10, 3000: 10, 4000: 15 })).status, 'not_suggestive');
  // 8 kHz (50) mais elevado que o pico de 3–6 kHz (45): não atende ao 5.2.
  assert.equal(a.assessNR7Audiogram(nr7([10, 10, 15, 30, 45, 35, 50])).status, 'not_suggestive');
  // perda plana: 3–6k não são mais elevados que as demais.
  assert.equal(a.assessNR7Audiogram(nr7([40, 40, 40, 40, 40, 40, 40])).status, 'not_suggestive');
});

test('NR-7 Anexo II, itens 5.3 e 5.4: fronteiras de 10 dB (média) e 15 dB (frequência)', () => {
  const ref = nr7([10, 10, 10, 10, 10, 10, 10]);
  // média 3–6k: (20+20+20)/3 − 10 = 10 → desencadeamento (≥ 10).
  assert.equal(a.compareNR7(ref, nr7([10, 10, 10, 20, 20, 20, 10])).status, 'triggering');
  // média 3–6k: (20+20+15)/3 − 10 = 8,3; maior piora isolada 10 → não atinge.
  assert.equal(a.compareNR7(ref, nr7([10, 10, 10, 20, 20, 15, 10])).status, 'no_triggering');
  // piora isolada de 15 em 4 kHz (média 3–6k = 5) → atinge pelo critério b.
  assert.equal(a.compareNR7(ref, nr7([10, 10, 10, 10, 25, 10, 10])).status, 'triggering');
  // piora de 15 em 8 kHz não conta para desencadeamento (critério b restrito a 3, 4 e 6 kHz).
  assert.equal(a.compareNR7(ref, nr7([10, 10, 10, 10, 10, 10, 25])).status, 'no_triggering');
  const suggestive = nr7([10, 10, 15, 30, 45, 35, 20], { 500: 10, 1000: 10, 2000: 15, 3000: 30, 4000: 40 });
  // agravamento: piora de 15 em 8 kHz (frequência isolada) → 5.4 b.
  assert.equal(a.compareNR7(suggestive, nr7([10, 10, 15, 30, 45, 35, 35])).status, 'aggravation');
  // média 0,5–2k: (20+20+20)/3 − (10+10+15)/3 = 8,3 → não atinge; nenhuma piora ≥ 15.
  assert.equal(a.compareNR7(suggestive, nr7([20, 20, 20, 30, 45, 35, 20])).status, 'no_aggravation');
  assert.equal(a.compareNR7(ref, nr7([10, 10, 10, 'NR', 10, 10, 10])).status, 'not_assessable');
  assert.equal(a.compareNR7(nr7([40, 40, 40, 40, 40, 40, 40]), nr7([40, 40, 40, 40, 40, 40, 40])).status, 'out_of_scope');
});

test('BSA 2018 regra 2: VO sem mascaramento melhor que a VA de qualquer orelha, inclusive a melhor', () => {
  // OD VA 40, OE VA 50, VO sem mascaramento 10: as duas orelhas têm diferença ≥ 10.
  const alerts = a.checkMaskingNecessity({ 1000: { va: 40, vo: 10 } }, { 1000: { va: 50 } }, 'supra', 'BSA_2018');
  assert.ok(alerts.some(x => x.type === 'VO' && x.ear === 'right'));
  assert.ok(alerts.some(x => x.type === 'VO' && x.ear === 'left'));
  // diferença de 5 dB: sem alerta de VO.
  assert.equal(a.checkMaskingNecessity({ 1000: { va: 15, vo: 10 } }, { 1000: { va: 10 } }, 'supra', 'BSA_2018').filter(x => x.type === 'VO').length, 0);
});

test('SBFa 2025: Metz só com convenção de orelha registrada; 60 dB é o limite inclusivo', () => {
  const right = { 1000: { contra: 100 } }, tonalRight = { 1000: { va: 40 } }, tonalLeft = { 1000: { va: 10 } };
  assert.equal(a.analyzeStapedialReflexes(right, tonalRight, 'right')[0].metzCriterion, 'not_assessable');
  // orelha estimulada = coluna: 100 − 40 = 60 → atingido.
  assert.equal(a.analyzeStapedialReflexes(right, tonalRight, 'right', { convention: 'stimulated' })[0].metzCriterion, 'met');
  assert.equal(a.analyzeStapedialReflexes({ 1000: { contra: 105 } }, tonalRight, 'right', { convention: 'stimulated' })[0].metzCriterion, 'not_met');
  // coluna = orelha da sonda: estímulo na OE (VA 10): 100 − 10 = 90 → não atingido.
  const probe = a.analyzeStapedialReflexes(right, tonalRight, 'right', { convention: 'probe', otherEarTonal: tonalLeft })[0];
  assert.equal(probe.stimulatedEar, 'left');
  assert.equal(probe.contraDifference, 90);
  assert.equal(probe.metzCriterion, 'not_met');
});

test('Timpanometria: Jerger apenas em 226 Hz; 1000 Hz normal/alterada', () => {
  const base = { probeFrequency: '1000', admittanceUnit: 'mmho', normativeReference: 'Referência sintética', curveShape: 'peaked', peak: 0, compliance200: 1 };
  assert.equal(a.classifyTympanometry({ ...base, recordedType: 'A' }).type, 'Inconclusivo');
  assert.equal(a.classifyTympanometry({ ...base, recordedType: 'Normal' }).type, 'Normal');
  const exam = fixture();
  exam.tympanometry = { right: { ...base, recordedType: 'B' } };
  assert.ok(integrity.getReviewIssues(exam).some(s => /Jerger/.test(s)));
});

test('LRF − média tritonal é mostrada sem veredito numérico não fundamentado', () => {
  const result = a.validateSpeechConcordance(35, 20);
  assert.equal(result.diff, 15);
  assert.equal(result.isConcordant, null);
});

test('Elegibilidade única das tabelas adultas e requisitos ocupacionais da NR-7', () => {
  const header = fixture().header;
  assert.equal(integrity.adultTablesEligibility(header, 40).eligible, true);
  assert.equal(integrity.adultTablesEligibility(header, 17).eligible, false);
  assert.equal(integrity.adultTablesEligibility({ ...header, assessmentMethod: 'vra' }, 40).eligible, false);
  const exam = fixture();
  exam.examCategory = 'ocupacional';
  assert.ok(integrity.getReviewIssues(exam).some(s => /repouso auditivo/.test(s)));
  exam.header.auditoryRest14h = true;
  // tonal() cobre 250, 500, 1000, 2000, 3000, 4000, 6000 e 8000 Hz: atende ao item 3.6.
  assert.equal(integrity.getReviewIssues(exam).filter(s => /NR-7/.test(s)).length, 0);
  // OMS 2021: média quadritonal 20 em uma orelha impede "normalidade bilateral".
  const borderline = fixture();
  borderline.tonalData.left = tonal(20);
  assert.ok(integrity.getReviewIssues(borderline).some(s => /OMS 2021/.test(s)));
});

test('Status do paciente usa a decisão estruturada revisada, não o texto livre', () => {
  const draft = { ...fixture(), opinion: { clinical: 'normal' } };
  assert.equal(overview.examStatus(draft), 'draft');
  assert.equal(overview.examStatus(review({ ...fixture(), opinion: { clinical: 'Não alterado', clinicalStatus: 'altered' } })), 'altered');
});

const retention = load('src/lib/recordRetention.ts');
test('CFFa 777/2025, art. 8º: eliminação só após 20 anos do último registro; antes disso, arquivamento', () => {
  assert.equal(retention.lastRecordDate(['2010-05-01', undefined, '2024-03-10', 'inválida', null]), '2024-03-10');
  assert.equal(retention.lastRecordDate([]), null);
  assert.equal(retention.eliminationAvailableFrom('2006-10-21'), '2026-10-21');
  // 29/02/2004 + 20 anos = 29/02/2024 (bissexto); 29/02/2008 + 20 = 29/02/2028.
  assert.equal(retention.eliminationAvailableFrom('2004-02-29'), '2024-02-29');
  assert.equal(retention.permanentDeletionStatus('2006-10-21', '2026-10-21').allowed, true);
  assert.equal(retention.permanentDeletionStatus('2006-10-22', '2026-10-21').allowed, false);
  assert.equal(retention.permanentDeletionStatus('2025-01-10', '2026-10-21').allowed, false);
  assert.match(retention.permanentDeletionStatus('2025-01-10', '2026-10-21').reason, /10\/01\/2045/);
  assert.equal(retention.permanentDeletionStatus(null, '2026-10-21').allowed, false);
});

// Guia CFFa 2023, Quadros 4, 5, 6 e 14 (números conferidos no PDF em 21/10/2026).
test('Guia CFFa 2023: fronteiras de Kaplan 1993, Davis 1970, BIAP 1996 e Northern e Downs 2005', () => {
  const tri = value => ({ tritonal: value, quadritonal: null }), quad = value => ({ tritonal: null, quadritonal: value });
  // Kaplan, Gladstone e Lloyd: normal −10 a 15; discreto 16–25; leve 26–40; ...; profundo ≥ 91.
  assert.equal(a.classifyDegree(tri(15), 'KAPLAN_1993').code, 'NORMAL');
  assert.equal(a.classifyDegree(tri(16.7), 'KAPLAN_1993').code, 'DISCRETA');
  assert.equal(a.classifyDegree(tri(25), 'KAPLAN_1993').code, 'DISCRETA');
  assert.equal(a.classifyDegree(tri(91.7), 'KAPLAN_1993').code, 'PROFUNDA');
  // Davis: normal ≤ 25; acentuado 56–70.
  assert.equal(a.classifyDegree(tri(25), 'DAVIS_1970').code, 'NORMAL');
  assert.equal(a.classifyDegree(tri(56.7), 'DAVIS_1970').code, 'ACENTUADA');
  assert.equal(a.classifyDegree(tri(70), 'DAVIS_1970').code, 'ACENTUADA');
  // BIAP (média de 4 frequências): normal ≤ 20; leve 21–40; moderado II 56–70; muito severo III 111–120.
  assert.equal(a.classifyDegree(quad(20), 'BIAP_1996').code, 'NORMAL');
  assert.equal(a.classifyDegree(quad(21.25), 'BIAP_1996').code, 'LEVE');
  assert.match(a.classifyDegree(quad(56.25), 'BIAP_1996').degree, /moderada de 2º grau/);
  assert.match(a.classifyDegree(quad(120), 'BIAP_1996').degree, /muito severa de 3º grau/);
  // Northern e Downs (crianças): normal ≤ 15; discreta 16–25; leve 26–30; moderada 31–50; severa 51–70; profunda ≥ 71.
  const nd = value => a.classifyDegree(tri(value), 'NORTHERN_DOWNS_2005', true).code;
  assert.deepEqual([15, 16.7, 25, 26.7, 30, 31.7, 50, 51.7, 70, 71.7].map(nd), ['NORMAL', 'DISCRETA', 'DISCRETA', 'LEVE', 'LEVE', 'MODERADA', 'MODERADA', 'SEVERA', 'SEVERA', 'PROFUNDA']);
  // Normalidade bilateral respeita a tabela: Northern e Downs com média 20 já não é normal.
  const exam = fixture();
  exam.header.degreeStandard = 'NORTHERN_DOWNS_2005';
  exam.tonalData = { right: tonal(20), left: tonal(10) };
  assert.ok(integrity.getReviewIssues(exam).some(s => /fora do padrão de normalidade/.test(s)));
  // Criança com limiares confiáveis recebe sugestão de grau; VRA não.
  assert.equal(integrity.degreeEligibility(fixture().header, 6).eligible, true);
  assert.equal(integrity.degreeEligibility({ ...fixture().header, assessmentMethod: 'vra', responseType: 'minimum_response' }, 1).eligible, false);
});

test('Timpanograma ilustrativo passa exatamente pelo pico registrado; sem pico vira linha plana; sem dados, nada', () => {
  const curve = plot.illustrativeTympanogram({ curveShape: 'peaked', probeFrequency: '226', admittanceUnit: 'ml', peak: -150, compliance200: '0,9' });
  const top = curve.points.reduce((m, p) => p.admittance > m.admittance ? p : m);
  assert.deepEqual(top, { pressure: -150, admittance: 0.9 });
  // 60 daPa do pico: 0,9 × e^(−0,5) = 0,546 (largura ilustrativa fixa).
  assert.ok(curve.points.every(p => p.admittance <= 0.9));
  assert.equal(Math.round(0.9 * Math.exp(-0.5) * 1000) / 1000, 0.546);
  const flat = plot.illustrativeTympanogram({ curveShape: 'flat', probeFrequency: '226', admittanceUnit: 'ml', compliance200: '0,1' });
  assert.equal(flat.kind, 'flat');
  assert.ok(flat.points.every(p => p.admittance === 0.1));
  assert.equal(plot.illustrativeTympanogram({ curveShape: 'peaked', probeFrequency: '226', admittanceUnit: 'ml', peak: '' }), null);
  assert.equal(plot.illustrativeTympanogram({ curveShape: 'peaked', probeFrequency: '1000', admittanceUnit: 'ml', peak: 0, compliance200: 1 }), null);
});

test('Exportações usam o profissional do exame e incluem a classificação registrada no parecer', () => {
  const exam = fixture();
  assert.equal(integrity.examProfessional(exam, { professionalName: 'Outro nome', crfaNumber: '0' }), 'Profissional de teste · CRFa teste');
  assert.equal(integrity.examProfessional({ header: {} }, { professionalName: 'Cadastro', crfaNumber: '123' }), 'Cadastro · CRFa 123');
  exam.opinion = { lossTypeRight: 'Neurossensorial', lossDegreeRight: 'Grau leve (OMS 2021)', configurationLeft: 'Descendente' };
  assert.deepEqual(integrity.professionalClassificationLines(exam), ['OD — tipo: Neurossensorial; grau: Grau leve (OMS 2021)', 'OE — configuração: Descendente']);
  assert.deepEqual(integrity.professionalClassificationLines(fixture()), []);
});

test('painel: motivo da revisão distingue nunca revisado, editado e regras atualizadas', () => {
  assert.equal(overview.reviewState(fixture()), 'never');
  assert.equal(overview.reviewState(review(fixture())), 'current');
  const reviewed = review(fixture());
  assert.equal(overview.reviewState({ ...reviewed, resultAndConduct: 'Texto alterado depois da revisão.' }), 'edited');
  const old = review({ ...fixture(), header: { ...fixture().header, clinicalRulesVersion: '2026-01-01.0' } });
  assert.equal(overview.reviewState(old), 'rules');
  assert.equal(overview.reviewState({ ...old, resultAndConduct: 'Também editado.' }), 'edited');
});

test('painel: períodos e comparação anterior com datas de fronteira', () => {
  assert.deepEqual({ ...overview.periodRange('today', '2026-10-21') }, { from: '2026-10-21', to: '2026-10-21' });
  assert.deepEqual({ ...overview.periodRange('month', '2026-10-21') }, { from: '2026-10-01', to: '2026-10-21' });
  assert.deepEqual({ ...overview.periodRange('30d', '2026-10-21') }, { from: '2026-09-22', to: '2026-10-21' });
  assert.equal(overview.periodRange('all', '2026-10-21'), null);
  const prev = (period, today, custom) => ({ ...overview.previousRange(period, overview.periodRange(period, today, custom), today) });
  assert.deepEqual(prev('today', '2026-03-01'), { from: '2026-02-28', to: '2026-02-28' });
  assert.deepEqual(prev('month', '2026-10-21'), { from: '2026-09-01', to: '2026-09-21' });
  assert.deepEqual(prev('month', '2026-03-31'), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(prev('month', '2026-01-15'), { from: '2025-12-01', to: '2025-12-15' });
  assert.deepEqual(prev('30d', '2026-10-21'), { from: '2026-08-23', to: '2026-09-21' });
  assert.deepEqual(prev('year', '2026-10-21'), { from: '2025-01-01', to: '2025-10-21' });
  assert.deepEqual(prev('custom', '2026-10-21', { from: '2026-10-10', to: '2026-10-19' }), { from: '2026-09-30', to: '2026-10-09' });
  assert.equal(overview.previousRange('all', null, '2026-10-21'), null);
  assert.equal(overview.previousRange('custom', overview.periodRange('custom', '2026-10-21', { from: '2026-10-10' }), '2026-10-21'), null);
  assert.deepEqual({ ...overview.periodRange('custom', '2026-10-21', { from: '2026-10-19', to: '2026-10-10' }) }, { from: '2026-10-10', to: '2026-10-19' });
});

test('painel: arquivados fora dos totais, agenda restante e público por idade no exame', () => {
  const patients = [
    { id: 'adult', birthDate: '1990-01-01' },
    { id: 'child', birthDate: '2018-05-05' },
    { id: 'old', birthDate: '1950-01-01', archivedAt: 1 },
    { id: 'nodate', birthDate: '' }
  ];
  const exam = (id, patientId, examDate, reviewedExam) => { const base = { ...fixture(), id, patientId, examDate }; return reviewedExam ? review(base) : base; };
  const exams = [exam('e1', 'adult', '2026-10-20', true), exam('e2', 'child', '2026-10-15', false), exam('e3', 'old', '2026-10-10', true), exam('e4', 'adult', '2026-09-10', false), exam('e5', 'nodate', '2026-10-12', false)];
  const appt = (id, date, time, status) => ({ id, date, time, status, patientName: `P${id}`, type: 'Audiometria' });
  const appointments = [appt('1', '2026-10-21', '08:00', 'completed'), appt('2', '2026-10-21', '09:00', 'scheduled'), appt('3', '2026-10-21', '14:00', 'scheduled'), appt('4', '2026-10-21', '11:00', 'canceled'), appt('5', '2026-10-22', '09:00', 'scheduled')];
  const now = new Date(2026, 9, 21, 10, 0);
  const all = overview.buildDashboardOverview({ patients, exams, appointments, now, period: 'month', population: 'all', pendingSync: 3 });
  assert.equal(all.activePatients, 3); assert.equal(all.archivedPatients, 1);
  assert.deepEqual(all.filtered.map(e => e.id).sort(), ['e1', 'e2', 'e5']);
  assert.equal(all.counts.normal, 1); assert.equal(all.counts.draft, 2); assert.equal(all.review.never, 2);
  assert.equal(all.previousCount, 1);
  assert.deepEqual({ ...all.agenda }, { total: 3, scheduled: 2, completed: 1, late: 1 });
  assert.equal(all.next.id, '3');
  const ids = all.alerts.map(a => a.id);
  assert.ok(ids.includes('late') && ids.includes('sync') && ids.includes('calibration'));
  assert.match(all.alerts.find(a => a.id === 'calibration').title, /^3 exames/);
  const children = overview.buildDashboardOverview({ patients, exams, appointments, now, period: 'month', population: 'children' });
  assert.deepEqual(children.filtered.map(e => e.id), ['e2']);
  assert.equal(children.excludedNoBirthDate, 1);
  const adults = overview.buildDashboardOverview({ patients, exams, appointments, now, period: 'month', population: 'adults' });
  assert.deepEqual(adults.filtered.map(e => e.id), ['e1']);
});

test('painel: alertas de assinatura e data por extenso em português', () => {
  const now = new Date(2026, 9, 21, 10, 0);
  const base = { patients: [], exams: [], appointments: [], now, period: 'month', population: 'all' };
  assert.equal(overview.buildDashboardOverview({ ...base, subscription: { status: 'past_due' } }).alerts[0].level, 'danger');
  const soon = overview.buildDashboardOverview({ ...base, subscription: { status: 'active', endDate: now.getTime() + 2 * 86400000 } }).alerts[0];
  assert.match(soon.title, /2 dias/);
  assert.equal(overview.buildDashboardOverview({ ...base, subscription: { status: 'active', endDate: now.getTime() + 30 * 86400000 } }).alerts.length, 0);
  assert.equal(load('src/lib/dateLabels.ts').formatLongDatePt(now), 'Quarta-feira, 21 de outubro');
});

test('painel: primeiros passos conferem cadastro, paciente, exame e revisão', () => {
  const none = overview.onboardingSteps({ settings: null, patientCount: 0, examCount: 0, hasReviewedExam: false });
  assert.deepEqual(none.map(s => s.done), [false, false, false, false]);
  const blankCrfa = overview.onboardingSteps({ settings: { professionalName: 'Teste', crfaNumber: '  ', clinicName: 'Clínica' }, patientCount: 2, examCount: 0, hasReviewedExam: false });
  assert.deepEqual(blankCrfa.map(s => s.done), [false, true, false, false]);
  const all = overview.onboardingSteps({ settings: { professionalName: 'Teste', crfaNumber: '1-0000', clinicName: 'Clínica' }, patientCount: 1, examCount: 1, hasReviewedExam: true });
  assert.ok(all.every(s => s.done));
});

const validation = load('src/lib/settingsValidation.ts');
test('configurações: CPF e CNPJ conferem os dígitos verificadores (valores de referência independentes)', () => {
  assert.equal(validation.isValidCPF('529.982.247-25'), true);
  assert.equal(validation.isValidCPF('52998224725'), true);
  assert.equal(validation.isValidCPF('529.982.247-26'), false);
  assert.equal(validation.isValidCPF('111.111.111-11'), false);
  assert.equal(validation.isValidCPF('123'), false);
  assert.equal(validation.isValidCNPJ('11.222.333/0001-81'), true);
  assert.equal(validation.isValidCNPJ('11.222.333/0001-82'), false);
  assert.equal(validation.isValidCNPJ('00000000000000'), false);
});
test('configurações: máscaras progressivas e limites', () => {
  assert.equal(validation.formatCPF('52998224725'), '529.982.247-25');
  assert.equal(validation.formatCPF('5299822'), '529.982.2');
  assert.equal(validation.formatCPF('529'), '529');
  assert.equal(validation.formatCNPJ('11222333000181'), '11.222.333/0001-81');
  assert.equal(validation.formatCNPJ('11222333'), '11.222.333');
  assert.equal(validation.formatCEP('01310100'), '01310-100');
  assert.equal(validation.formatCEP('0131'), '0131');
  assert.equal(validation.formatPhone('11987654321'), '(11) 98765-4321');
  assert.equal(validation.formatPhone('1134567890'), '(11) 3456-7890');
  assert.equal(validation.formatPhone('11'), '(11');
  assert.equal(validation.formatPhone(''), '');
});
test('configurações: só campos preenchidos e inválidos geram erro', () => {
  assert.deepEqual({ ...validation.validateSettings({}) }, {});
  assert.deepEqual({ ...validation.validateSettings({ cpf: '', email: '  ', state: '' }) }, {});
  const errors = validation.validateSettings({ cpf: '123', cnpj: '1', zipCode: '123', state: 'XX', email: 'a@b', phone: '1234', instagram: 'com espaço' });
  assert.deepEqual(Object.keys(errors).sort(), ['cnpj', 'cpf', 'email', 'instagram', 'phone', 'state', 'zipCode']);
  assert.deepEqual({ ...validation.validateSettings({ cpf: '529.982.247-25', cnpj: '11.222.333/0001-81', zipCode: '01310-100', state: 'sp', email: 'contato@clinica.com.br', phone: '(11) 98765-4321', instagram: '@suaclinica' }) }, {});
});

test('backup: arquivo inválido é recusado antes de qualquer alteração', () => {
  const backup = load('src/lib/backup.ts', { '@/db/db': { db: {} } });
  const bad = text => assert.throws(() => backup.parseBackup(text), error => error instanceof backup.BackupError);
  bad('não é json');
  bad('[]');
  bad('{"patients":[]}');
  bad('{"patients":[],"audiometries":{}}');
  bad('{"patients":[{"name":"sem id"}],"audiometries":[]}');
  bad('{"patients":[{"id":"a"},{"id":"a"}],"audiometries":[]}');
  bad('{"patients":[],"audiometries":[],"appointments":"x"}');
  const ok = backup.parseBackup(JSON.stringify({ exportedAt: '2026-10-21T12:00:00.000Z', patients: [{ id: 'p1' }], audiometries: [{ id: 'e1', patientId: 'p1' }, { id: 'e2', patientId: 'ausente' }] }));
  assert.deepEqual({ ...ok.counts }, { patients: 1, audiometries: 2, settings: 0, appointments: 0, anamneses: 0 });
  assert.equal(ok.orphanExams, 1);
  assert.equal(ok.exportedAt, '2026-10-21T12:00:00.000Z');
});

test('backup: restauração marca tudo como pendente e substitui todas as tabelas em uma transação', async () => {
  const calls = [];
  const table = name => ({ clear: async () => { calls.push(`clear:${name}`); }, bulkAdd: async rows => { calls.push(`add:${name}:${rows.map(r => r.syncStatus).join(',')}`); } });
  const db = Object.fromEntries(['patients', 'audiometries', 'settings', 'appointments', 'anamneses'].map(n => [n, table(n)]));
  db.transaction = async (_mode, ...args) => { calls.push('begin'); await args[args.length - 1](); calls.push('commit'); };
  const backup = load('src/lib/backup.ts', { '@/db/db': { db } });
  const { rows } = backup.parseBackup(JSON.stringify({ patients: [{ id: 'p1', syncStatus: 'synced' }], audiometries: [] }));
  await backup.restoreBackup(rows);
  assert.equal(calls[0], 'begin'); assert.equal(calls[calls.length - 1], 'commit');
  assert.ok(['patients', 'audiometries', 'settings', 'appointments', 'anamneses'].every(n => calls.includes(`clear:${n}`)));
  assert.ok(calls.includes('add:patients:pending'));
  assert.ok(!calls.some(c => c.startsWith('add:audiometries')));
});

test('configurações: telefone com código do país, contagens no singular e textos de estado', () => {
  assert.equal(validation.formatPhone('+55 11 98765-4321'), '(11) 98765-4321');
  assert.equal(validation.isValidPhone('+55 (11) 3456-7890'), true);
  assert.equal(validation.isValidPhone('(55) 99999-9999'), true); // DDD 55 não é código do país
  assert.equal(validation.isValidPhone('123456789012'), false);
  const backup = load('src/lib/backup.ts', { '@/db/db': { db: {} } });
  assert.equal(backup.describeCounts({ patients: 1, audiometries: 2, appointments: 1, anamneses: 0, settings: 1 }), '1 paciente, 2 exames, 1 agendamento, 0 anamneses');
  const status = load('src/lib/settingsStatus.ts');
  const now = new Date(2026, 9, 21, 12).getTime(), day = 86400000;
  assert.equal(status.subscriptionSummary('active', now + 10 * day, now).label, 'Assinatura ativa');
  assert.equal(status.subscriptionSummary('active', now - day, now).label, 'Assinatura vencida');
  assert.equal(status.subscriptionSummary('active', now - day, now).tone, 'danger');
  assert.equal(status.subscriptionSummary('active', null, now).endLabel, 'Data de validade não informada');
  assert.match(status.subscriptionSummary('canceled', now + 5 * day, now).detail, /acesso continua até/);
  assert.match(status.subscriptionSummary('canceled', now - day, now).detail, /acesso foi encerrado/);
  assert.equal(status.subscriptionSummary('past_due', null, now).tone, 'danger');
  assert.equal(status.subscriptionSummary(null, undefined, now).label, 'Sem assinatura ativa');
  assert.equal(status.hasPaidAccess('active', now + day, now), true);
  assert.equal(status.hasPaidAccess('canceled', now + day, now), true);
  assert.equal(status.hasPaidAccess('active', now, now), false);
  assert.equal(status.hasPaidAccess('active', null, now), false);
  assert.equal(status.hasPaidAccess('past_due', now + day, now), false);
  const link = new URL(status.checkoutUrl('https://test.checkout.dodopayments.com/buy/pdt_x', { id: 'u-1', email: 'a+b@teste.com' }, 'http://localhost:3000'));
  assert.equal(link.searchParams.get('email'), 'a+b@teste.com');
  assert.equal(link.searchParams.get('disableEmail'), 'true');
  assert.equal(link.searchParams.get('metadata_user_id'), 'u-1');
  assert.equal(link.searchParams.get('redirect_url'), 'http://localhost:3000/planos');
  assert.equal(status.subscriptionSummary('active', NaN, now).endLabel, 'Data de validade não informada');
  assert.equal(status.saveOutcome(true, 'success').tone, 'ok');
  assert.match(status.saveOutcome(false, 'offline').message, /Sem conexão/);
  assert.match(status.saveOutcome(false, 'error').message, /falhou/);
  assert.match(status.saveOutcome(false, 'syncing').message, /em andamento/);
  assert.equal(status.saveOutcome(false, 'unconfigured').tone, 'ok');
});

test('configurações: site aceita domínio com ou sem esquema e recusa esquemas perigosos', () => {
  for (const ok of ['www.clinica.com.br', 'clinica.com.br', 'https://clinica.com.br/contato', 'http://clinica.com.br:8080']) assert.equal(validation.isValidWebsite(ok), true, ok);
  for (const bad of ['javascript:alert(1)', 'clinica', 'ftp://clinica.com.br', 'clinica com br', 'data:text/html,x']) assert.equal(validation.isValidWebsite(bad), false, bad);
  assert.equal(validation.validateSettings({ website: 'javascript:alert(1)' }).website !== undefined, true);
  assert.deepEqual({ ...validation.validateSettings({ website: '' }) }, {});
});

test('laudo: cabeçalho institucional imprime razão social, CNPJ, endereço completo e contato, sem site nem Instagram', () => {
  const { letterheadLines } = load('src/lib/letterhead.ts');
  const full = letterheadLines({ corporateName: 'Abu Chain Fonoaudiologia Ltda', cnpj: '11222333000181', address: 'Rua das Flores, 100', neighborhood: 'Centro', city: 'Campinas', state: 'sp', zipCode: '13010000', phone: '(19) 99999-0000', email: 'contato@clinica.com.br', website: 'www.clinica.com.br', instagram: '@clinica' });
  assert.equal(full.legal, 'Abu Chain Fonoaudiologia Ltda • CNPJ 11.222.333/0001-81');
  assert.equal(full.address, 'Rua das Flores, 100, Centro, Campinas/SP, CEP 13010-000');
  assert.equal(full.contact, '(19) 99999-0000 | contato@clinica.com.br');
  assert.ok(!JSON.stringify(full).includes('www.') && !JSON.stringify(full).includes('Instagram'));
  assert.deepEqual(letterheadLines({ cnpj: '11222333000181' }), { legal: 'CNPJ 11.222.333/0001-81', address: '', contact: '' });
  assert.deepEqual(letterheadLines({ city: 'Santos' }), { legal: '', address: 'Santos', contact: '' });
  assert.deepEqual(letterheadLines(null), { legal: '', address: '', contact: '' });
});

test('exames: entrada por toque com "Campo Livre" grava no campo livre, nunca na orelha esquerda', () => {
  const form = load('src/lib/examForm.ts');
  assert.deepEqual(form.quickEntryTarget('FREE_FIELD'), { kind: 'freeField' });
  assert.deepEqual(form.quickEntryTarget('OE_VO'), { kind: 'ear', ear: 'left', via: 'vo' });
  assert.deepEqual(form.quickEntryTarget('OD_VA'), { kind: 'ear', ear: 'right', via: 'va' });
  assert.equal(form.quickEntryTarget(null), null);
  const ff = form.setFreeFieldValue({}, '1000', '40');
  assert.equal(ff['1000'].va, 40);
  // NR guarda o último valor numérico como nível apresentado; apagar remove o valor.
  const nr = form.setFreeFieldValue(ff, '1000', 'NR');
  assert.equal(nr['1000'].va, 'NR');
  assert.equal(nr['1000'].nrLevelVa, 40);
  assert.equal(form.setFreeFieldValue(nr, '1000', '')['1000'].va, undefined);
  assert.equal(form.setFreeFieldValue({}, '500', '4,5')['500'].va, undefined);
});

test('exames: "Gerar resumo" não apaga síntese, situação clínica nem classificações digitadas', () => {
  const form = load('src/lib/examForm.ts');
  const current = { clinicalStatus: 'altered', clinical: 'Síntese da fono', lossTypeRight: 'Condutiva (digitado)', lossDegreeRight: '', workflowStatus: 'reviewed' };
  const merged = form.mergeSuggestedOpinion(current, { lossTypeRight: 'Neurossensorial', lossDegreeRight: 'Grau leve (OMS 2021)', configurationLeft: 'Variação…', workflowStatus: 'draft' });
  assert.equal(merged.clinicalStatus, 'altered');
  assert.equal(merged.clinical, 'Síntese da fono');
  assert.equal(merged.lossTypeRight, 'Condutiva (digitado)');
  assert.equal(merged.lossDegreeRight, 'Grau leve (OMS 2021)');
  assert.equal(merged.configurationLeft, 'Variação…');
  assert.equal(merged.workflowStatus, 'draft');
});

test('exames: meatoscopia em português nos documentos e encaminhamento ao otorrino no resumo', () => {
  const form = load('src/lib/examForm.ts');
  assert.equal(form.meatoscopyText({ right: 'cerumen', left: '' }, 'right'), 'Presença de cerúmen');
  assert.equal(form.meatoscopyText({ right: 'perforation', rightDescription: 'Perfuração central' }, 'right'), 'Perfuração da membrana timpânica. Perfuração central');
  assert.equal(form.meatoscopyText({ left: '', leftDescription: 'Descrição livre' }, 'left'), 'Descrição livre');
  assert.equal(form.meatoscopyText(undefined, 'left'), 'Não registrado');
  const exam = { ...fixture(), meatoscopy: { right: 'foreign_body', left: 'normal', referToENT: true } };
  const text = reports.generateLocalClinicalReport(exam, 40).fullLaudo;
  assert.match(text, /Inspeção: Presença de corpo estranho\./);
  assert.match(text, /otorrinolaringologista/);
  assert.ok(!/cerumen|foreign_body|perforation/.test(text));
});

test('exames: pacientes arquivados fora da lista e busca por data no formato brasileiro', () => {
  const form = load('src/lib/examForm.ts');
  const { visible, hiddenArchived } = form.visibleExams([{ id: 'e1', patientId: 'a' }, { id: 'e2', patientId: 'b' }, { id: 'e3', patientId: 'b' }], [{ id: 'a' }, { id: 'b', archivedAt: 5 }]);
  assert.deepEqual(visible.map(e => e.id), ['e1']);
  assert.equal(hiddenArchived, 2);
  const row = { patientName: 'Paciente Sintético', patientCpf: '123.456.789-09', examDate: '2026-10-23', synthesis: 'Perda condutiva' };
  for (const term of ['23/10', '23/10/2026', '2026-10', 'sintético', '12345678909', '456.789', 'condutiva', '']) assert.equal(form.matchesExamSearch(row, term), true, term);
  for (const term of ['24/10', '2025', 'outro nome']) assert.equal(form.matchesExamSearch(row, term), false, term);
});

test('exames: Weber preserva texto digitado e reflexos informam a convenção das colunas', () => {
  const form = load('src/lib/examForm.ts');
  const auto = form.updateWeber({}, '500', 'od');
  assert.equal(auto.weber, '500Hz: Lateralizado para OD');
  assert.equal(form.updateWeber(auto, '1000', 'indiferente').weber, '500Hz: Lateralizado para OD | 1000Hz: Indiferente');
  const typed = { weber: 'Lateraliza para OD em graves', weberFreqs: { 500: 'od' } };
  assert.equal(form.updateWeber(typed, '1000', 'oe').weber, 'Lateraliza para OD em graves');
  assert.deepEqual(form.updateWeber(typed, '1000', 'oe').weberFreqs, { 500: 'od', 1000: 'oe' });
  assert.match(form.reflexConventionText('probe'), /orelha da sonda/);
  assert.match(form.reflexConventionText('stimulated'), /orelha estimulada/);
  assert.match(form.reflexConventionText(''), /não informada/);
});
