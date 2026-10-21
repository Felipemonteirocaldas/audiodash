import { assessRetest1000 } from '@/lib/clinicalProtocol';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, Audiometry } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { exportToDocx } from '@/lib/exportWord';
import { exportToExcelJs } from '@/lib/exportExcel';
import {
  FileText,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { syncManager } from '@/lib/syncManager';
import { customAlert } from '@/lib/dialogs';
import { useAuth } from '@/contexts/AuthContext';

// Importação dos Componentes Modulares Especializados de Exame
import MeatoscopyExam from '@/components/exams/MeatoscopyExam';
import TonalAudiometryExam from '@/components/exams/TonalAudiometryExam';
import LogoAudiometryExam from '@/components/exams/LogoAudiometryExam';
import TympanometryExam from '@/components/exams/TympanometryExam';
import StapedialReflexExam from '@/components/exams/StapedialReflexExam';
import ComplementaryTestsExam from '@/components/exams/ComplementaryTestsExam';
import AudiologicalOpinionSummary from '@/components/exams/AudiologicalOpinionSummary';
import ExportPdfModal from '@/components/ExportPdfModal';
import { ageAtExam, localDate, CLINICAL_RULES_VERSION, isReviewCurrent, adultTablesEligibility, degreeEligibility } from '@/lib/examIntegrity';
import { DEGREE_STANDARD_LABELS } from '@/lib/audiologyCalculations';

const createEmptyExam = (): Partial<Audiometry> => ({
    header: { audiometer: '', impedanciometer: '', requestingPhysician: '', speechTherapist: '', degreeStandard: 'OMS_2021', transducer: 'supra', assessmentMethod: '', responseType: '', reliability: '', clinicalRulesVersion: CLINICAL_RULES_VERSION },
    tonalData: { right: {}, left: {} },
    tonalMasking: { right: {}, left: {} },
    logoAudiometry: {
      right: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} },
      left: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} }
    },
    tympanometry: { right: {}, left: {} },
    reflexes: { right: {}, left: {}, sondaOD: '', sondaOE: '' },
    resultAndConduct: '',
    examPurpose: 'referencial',
    examCategory: 'clinico',
    freeField: {},
    meatoscopy: { right: '', left: '', rightDescription: '', leftDescription: '' },
    complementary: { weber: '', toneDecay: '' },
    opinion: {}
  });

export default function NewExam() {
  const { user } = useAuth();
  const { patientId, examId } = useParams();
  const navigate = useNavigate();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '');
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const [examDate, setExamDate] = useState(localDate());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'all' | 'meatoscopy' | 'tonal' | 'logo' | 'tymp' | 'reflex' | 'complementary' | 'opinion'>('meatoscopy');
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const saving = useRef(false);
  const [loadError, setLoadError] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const selectedPatient = patients?.find(p => p.id === selectedPatientId);

  const age = ageAtExam(selectedPatient?.birthDate, examDate);
  const patientAge = age?.years;
  // Estado Principal do Exame
  const [exam, setExam] = useState<Partial<Audiometry>>(createEmptyExam);

  useEffect(() => {
    let cancelled = false;
    setLoadError('');
    if (examId) {
      db.audiometries.get(examId).then(existingExam => {
        if (cancelled) return;
        if (existingExam) {
          setSelectedPatientId(existingExam.patientId);
          setExamDate(existingExam.examDate || localDate());
          setExam(existingExam);
        } else { setLoadError('Exame não encontrado. Abra um novo exame ou volte à lista.'); }
      }).catch(() => { if (!cancelled) setLoadError('Não foi possível carregar este exame. Tente novamente.'); });
    } else {
      setExam(createEmptyExam());
      // Preenche o profissional responsável com o cadastro de Configurações (editável no exame).
      db.settings.toCollection().first().then(settings => {
        if (cancelled || !settings?.professionalName) return;
        const professional = `${settings.professionalName}${settings.crfaNumber ? ` · CRFa ${settings.crfaNumber}` : ''}`;
        setExam(previous => previous.header?.speechTherapist ? previous : { ...previous, header: { ...previous.header, speechTherapist: professional } });
      }).catch(() => undefined);
      setDraftId(crypto.randomUUID());
      setLoadError('');
      setSelectedPatientId(patientId || '');
      setExamDate(localDate());
    }
    return () => { cancelled = true; };
  }, [examId, patientId]);

  const updateExam = (patch: Partial<Audiometry>) => {
    setExam(previous => ({ ...previous, ...patch }));
    setSaveStatus('idle');
  };
  const updateHeader = (patch: Partial<Audiometry['header']>) => {
    setExam(previous => ({ ...previous, header: { ...previous.header, ...patch, clinicalRulesVersion: CLINICAL_RULES_VERSION } }));
    setSaveStatus('idle');
  };
  const reviewExam = { ...exam, patientId: selectedPatientId, examDate };
  const eligibility = adultTablesEligibility(exam.header, patientAge);
  const degreeCheck = degreeEligibility(exam.header, patientAge);
  const reviewed = isReviewCurrent(reviewExam);

  const getExamData = (): Audiometry | null => {
    if (!selectedPatientId || !selectedPatient || loadError) return null;
    return {
      ...exam,
      id: examId || exam.id || draftId,
      patientId: selectedPatientId,
      examDate,
      createdAt: exam.createdAt || Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
      user_id: user?.id
    } as Audiometry;
  };

  const handleSave = async () => {
    const examData = getExamData();
    if (!examData) { await customAlert(loadError || 'Selecione um paciente antes de salvar.'); return; }
    if (!ageAtExam(examDate, examDate) || examDate > localDate()) { await customAlert('Informe uma data de exame válida, até hoje.'); return; }
    if (saving.current) return;
    saving.current = true;
    setSaveStatus('saving');
    try {
      await db.audiometries.put(examData);
      syncManager.sync(); // Cloud sync

      setSaveStatus('success');
      setExam(examData);
      if (!examId) navigate(`/exame/${examData.id}`, { replace: true });
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    } finally { saving.current = false; }
  };

  const handleExport = async (type: 'pdf' | 'docx' | 'xlsx') => {
    const examData = getExamData();
    if (!examData || !selectedPatient) {
      await customAlert('Selecione um paciente antes de exportar.');
      return;
    }
    if (type === 'pdf') {
      setIsPdfModalOpen(true);
    } else if (type === 'docx') {
      await exportToDocx(examData, selectedPatient);
    } else if (type === 'xlsx') {
      await exportToExcelJs(examData, selectedPatient);
    }
  };

  const ActionButtons = () => (
    <div className="flex gap-2 items-center flex-wrap">
      {saveStatus === 'success' && (
        <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Salvo com sucesso!
        </span>
      )}
      {saveStatus === 'error' && (
        <span className="text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600" /> Erro ao salvar
        </span>
      )}
      <Button
        onClick={handleSave}
        disabled={saveStatus === 'saving' || !!loadError}
        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm h-10 px-5 font-bold"
      >
        <Save className="w-4 h-4" /> {saveStatus === 'saving' ? 'Salvando...' : reviewed ? 'Salvar exame revisado' : 'Salvar rascunho'}
      </Button>
      <Button
        variant="outline"
        onClick={() => handleExport('pdf')}
        className="gap-2 rounded-xl border-slate-200 hover:bg-slate-50 h-10 font-semibold"
      >
        <FileText className="w-4 h-4 text-red-500" /> Exportar PDF
      </Button>
      <Button
        variant="outline"
        onClick={() => handleExport('xlsx')}
        className="gap-2 rounded-xl border-slate-200 hover:bg-slate-50 h-10 font-semibold"
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 pb-16">
      {loadError && <p role="alert" className="p-4 bg-red-50 text-red-800 border rounded-xl">{loadError}</p>}
      <div className={`p-3 rounded-xl text-sm ${reviewed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{reviewed ? 'Exame revisado — salve para guardar esta versão.' : 'Rascunho — complete os procedimentos e revise o parecer antes de finalizar.'}</div>
      {/* Cabeçalho Superior */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link to="/exames">
            <Button variant="outline" size="sm" className="gap-2 h-9 rounded-xl border-slate-200">
              <ArrowLeft className="w-4 h-4" /> Exames
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
              {examId ? 'Editar Exame Audiológico' : 'Novo Exame Audiológico'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Avaliação clínica de adultos e crianças · registro, interpretação e revisão profissional.
            </p>
          </div>
        </div>
        <ActionButtons />
      </div>

      {/* Dados Básicos, Paciente e Equipamentos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold text-slate-800">Identificação e Protocolo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Paciente *</label>
              <select
                className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
              >
                <option value="">-- Selecione o paciente cadastrado --</option>
                {patients?.filter(p => !p.archivedAt || p.id === selectedPatientId).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.cpf ? `(${p.cpf})` : ''}
                  </option>
                ))}
              </select>
              {selectedPatient && (
                <div className="text-[11px] text-slate-500 mt-1.5 flex gap-4 font-medium">
                  {age && <span>Idade no exame: <strong>{age.label}</strong></span>}
                  {selectedPatient.gender && <span>Sexo: <strong>{selectedPatient.gender}</strong></span>}
                  {selectedPatient.rg && <span>RG: {selectedPatient.rg} {selectedPatient.ssp}</span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Data do Exame</label>
                <Input
                  type="date"
                  className="h-8 text-xs bg-white"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Propósito</label>
                <select
                  className="flex h-8 w-full rounded-lg border border-slate-300 bg-white px-2 py-0 text-xs font-medium text-slate-800"
                  value={exam.examPurpose || 'referencial'}
                  onChange={e => updateExam({ examPurpose: e.target.value as any })}
                >
                  <option value="referencial">Referencial</option>
                  <option value="sequencial">Sequencial</option>
                  <option value="admissional">Admissional</option>
                  <option value="demissional">Demissional</option>
                  <option value="periodico">Periódico</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Categoria</label>
                <select
                  className="flex h-8 w-full rounded-lg border border-slate-300 bg-white px-2 py-0 text-xs font-medium text-slate-800"
                  value={exam.examCategory || 'clinico'}
                  onChange={e => updateExam({ examCategory: e.target.value as any })}
                >
                  <option value="clinico">Clínico</option>
                  <option value="ocupacional">Ocupacional (NR-7)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold text-slate-800">Equipamentos e Profissionais</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Audiômetro</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: Interacoustics AD629 / AC40"
                  value={exam.header?.audiometer || ''}
                  onChange={e => updateExam({ header: { ...exam.header, audiometer: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Impedanciômetro</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: Interacoustics AT235"
                  value={exam.header?.impedanciometer || ''}
                  onChange={e => updateExam({ header: { ...exam.header, impedanciometer: e.target.value } })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Médico Solicitante</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: Dr. Carlos Eduardo (CRM 12345)"
                  value={exam.header?.requestingPhysician || ''}
                  onChange={e => updateExam({ header: { ...exam.header, requestingPhysician: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Fonoaudiólogo(a)</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: Dra. Mariana Costa (CRFa 2-9876)"
                  value={exam.header?.speechTherapist || ''}
                  onChange={e => updateExam({ header: { ...exam.header, speechTherapist: e.target.value } })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card><CardHeader><CardTitle>Condições da avaliação</CardTitle></CardHeader><CardContent className="grid md:grid-cols-3 gap-4">
        <label className="text-xs font-semibold">Método<select aria-label="Método de avaliação" className="mt-1 block w-full border rounded-lg bg-white p-2" value={exam.header?.assessmentMethod || ''} onChange={e => updateHeader({ assessmentMethod: e.target.value as Audiometry['header']['assessmentMethod'] })}><option value="">Selecione o método utilizado</option><option value="conventional">Audiometria convencional</option><option value="play">Audiometria lúdica condicionada</option><option value="vra">Reforço visual (VRA)</option><option value="observation">Observação comportamental</option></select></label>
        <label className="text-xs font-semibold">Tipo de resposta<select aria-label="Tipo de resposta" className="mt-1 block w-full border rounded-lg bg-white p-2" value={exam.header?.responseType || ''} onChange={e => updateHeader({ responseType: e.target.value as Audiometry['header']['responseType'] })}><option value="">Selecione</option><option value="threshold">Limiar auditivo</option><option value="minimum_response">Nível mínimo de resposta</option></select></label>
        <label className="text-xs font-semibold">Confiabilidade<select aria-label="Confiabilidade" className="mt-1 block w-full border rounded-lg bg-white p-2" value={exam.header?.reliability || ''} onChange={e => updateHeader({ reliability: e.target.value as Audiometry['header']['reliability'] })}><option value="">Selecione</option><option value="good">Boa</option><option value="limited">Limitada</option><option value="inconclusive">Inconclusiva</option></select></label>
        <label className="text-xs font-semibold">Referência de grau<select aria-label="Referência de grau" className="mt-1 block w-full border rounded-lg bg-white p-2" value={exam.header?.degreeStandard || ''} onChange={e => updateHeader({ degreeStandard: e.target.value as Audiometry['header']['degreeStandard'] })}><option value="">Não registrada — selecione</option><optgroup label="Indicadas pelo Guia CFFa para crianças (Quadros 14–15)">{(['OMS_2021', 'NORTHERN_DOWNS_2005'] as const).map(key => <option key={key} value={key}>{DEGREE_STANDARD_LABELS[key]}</option>)}</optgroup><optgroup label="Demais classificações do Guia CFFa (Quadros 3–6)">{(['LLOYD_KAPLAN', 'KAPLAN_1993', 'DAVIS_1970', 'BIAP_1996'] as const).map(key => <option key={key} value={key}>{DEGREE_STANDARD_LABELS[key]}</option>)}</optgroup><optgroup label="Histórica"><option value="OMS_2014">{DEGREE_STANDARD_LABELS.OMS_2014}</option></optgroup></select><span className="block mt-1 font-normal text-slate-500">A escolha é do profissional e deve ser citada no laudo (Guia CFFa, 2023).</span></label>
        <label className="text-xs font-semibold">Condição do campo livre<Input aria-label="Condição do campo livre" placeholder="Estímulo, com/sem AASI ou implante" value={exam.header?.freeFieldCondition || ''} onChange={e => updateHeader({ freeFieldCondition: e.target.value })} /></label>
        <label className="text-xs font-semibold">Data de calibração do audiômetro<Input aria-label="Data de calibração" type="date" value={exam.header?.calibrationDate || ''} onChange={e => updateHeader({ calibrationDate: e.target.value })} /></label>
        <label className="text-xs font-semibold">Referência do procedimento tonal<select aria-label="Protocolo tonal" className="mt-1 block w-full border rounded-lg bg-white p-2" value={exam.header?.audiometryProtocol || ''} onChange={e => updateHeader({ audiometryProtocol: e.target.value as Audiometry['header']['audiometryProtocol'] })}><option value="">Sem protocolo selecionado</option><option value="BSA_2018">BSA 2018 · audiometria com/sem mascaramento</option></select></label>
        {(['right', 'left'] as const).map(ear => <label key={ear} className="text-xs font-semibold">Reteste de 1 kHz · {ear === 'right' ? 'OD' : 'OE'} (dB NA)<Input aria-label={`Reteste 1 kHz ${ear}`} inputMode="numeric" value={exam.header?.retest1000?.[ear] || ''} onChange={e => updateHeader({ retest1000: { ...exam.header?.retest1000, [ear]: e.target.value, [ear === 'right' ? 'initialRight' : 'initialLeft']: exam.header?.retest1000?.[ear === 'right' ? 'initialRight' : 'initialLeft'] ?? (typeof exam.tonalData?.[ear]?.['1000']?.va === 'number' ? exam.tonalData[ear]!['1000']!.va : undefined) } })} /><span className="block mt-1 text-slate-500 font-normal">{exam.header?.audiometryProtocol === 'BSA_2018' && assessRetest1000(exam.header?.retest1000?.[ear === 'right' ? 'initialRight' : 'initialLeft'] ?? exam.tonalData?.[ear]?.['1000']?.unmaskedVa ?? exam.tonalData?.[ear]?.['1000']?.va, exam.header?.retest1000?.[ear]).message}</span></label>)}
        <label className="md:col-span-3 text-xs font-semibold">Observações sobre o reteste e limiar final<Input aria-label="Observações do reteste" value={exam.header?.retest1000?.notes || ''} onChange={e => updateHeader({ retest1000: { ...exam.header?.retest1000, notes: e.target.value } })} /></label>
        {exam.examCategory === 'ocupacional' && <label className="md:col-span-3 text-xs font-semibold flex items-center gap-2"><input type="checkbox" checked={!!exam.header?.auditoryRest14h} onChange={e => updateHeader({ auditoryRest14h: e.target.checked })} /> Repouso auditivo mínimo de 14 horas informado (NR-7, Anexo II, item 3.4)</label>}
        <p className="md:col-span-3 text-xs text-slate-500">A interpretação pediátrica considera idade e desenvolvimento. Campo livre não identifica limiares de cada orelha. Níveis mínimos de resposta são registrados sem classificação automática de grau.</p>
      </CardContent></Card>

      {/* Navegação de Abas Rápidas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Visão Completa (Todos)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('meatoscopy')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'meatoscopy'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        > 1. Meatoscopia
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tonal')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tonal'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        > 2. Audiometria Tonal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logo')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'logo'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        > 3. Logoaudiometria
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tymp')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tymp'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        > 4. Timpanometria
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reflex')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'reflex'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        > 5. Reflexos Estapedianos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('complementary')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'complementary'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        > 6. Testes Especiais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('opinion')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'opinion'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        > 7. Parecer e Laudo
        </button>
      </div>

      {/* Componentes Modulares de Exame */}
      <div className="space-y-8">
        {/* 1. Meatoscopia */}
        {(activeTab === 'all' || activeTab === 'meatoscopy') && (
          <section id="sec-meatoscopy">
            <MeatoscopyExam
              meatoscopy={exam.meatoscopy}
              onChange={data => updateExam({ meatoscopy: data })}
            />
          </section>
        )}

        {/* 2. Audiometria Tonal Liminar */}
        {(activeTab === 'all' || activeTab === 'tonal') && (
          <section id="sec-tonal">
            <TonalAudiometryExam
              responseType={exam.header?.responseType}
              tonalData={exam.tonalData || { right: {}, left: {} }}
              tonalMasking={exam.tonalMasking}
              freeField={exam.freeField}
              category={exam.examCategory}
              standard={exam.header?.degreeStandard || 'OMS_2021'}
              transducer={exam.header?.transducer || 'supra'}
              onTransducerChange={transducer => updateHeader({ transducer })}
              protocol={exam.header?.audiometryProtocol || undefined}
              showAverages={exam.header?.responseType === 'threshold'}
              allowInterpretation={eligibility.eligible}
              allowDegree={degreeCheck.eligible}
              isChild={degreeCheck.isChild}
              interpretationBlockedReason={eligibility.reason}
              onChangeTonal={data => updateExam({ tonalData: data })}
              onChangeMasking={data => updateExam({ tonalMasking: data })}
              onChangeFreeField={data => updateExam({ freeField: data })}
            />
          </section>
        )}

        {/* 3. Logoaudiometria */}
        {(activeTab === 'all' || activeTab === 'logo') && (
          <section id="sec-logo">
            <LogoAudiometryExam
              allowConcordance={exam.header?.responseType === 'threshold' && exam.header?.reliability === 'good'}
              logoData={
                exam.logoAudiometry || {
                  right: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} },
                  left: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} }
                }
              }
              tonalData={exam.tonalData}
              onChange={data => updateExam({ logoAudiometry: data })}
            />
          </section>
        )}

        {/* 4. Timpanometria */}
        {(activeTab === 'all' || activeTab === 'tymp') && (
          <section id="sec-tymp">
            <TympanometryExam
              ageMonths={age?.months}
              adultProtocol={patientAge !== undefined && patientAge >= 18}
              tympanometry={exam.tympanometry || { right: {}, left: {} }}
              onChange={data => updateExam({ tympanometry: data })}
            />
          </section>
        )}

        {/* 5. Reflexos Estapedianos */}
        {(activeTab === 'all' || activeTab === 'reflex') && (
          <section id="sec-reflex">
            <StapedialReflexExam
              reflexes={exam.reflexes || { right: {}, left: {}, sondaOD: '', sondaOE: '' }}
              tonalData={exam.tonalData}
              onChange={data => updateExam({ reflexes: data })}
            />
          </section>
        )}

        {/* 6. Testes Complementares */}
        {(activeTab === 'all' || activeTab === 'complementary') && (
          <section id="sec-complementary">
            <ComplementaryTestsExam
              complementary={exam.complementary}
              tonalData={exam.tonalData}
              onChange={data => updateExam({ complementary: data })}
            />
          </section>
        )}

        {/* 7. Parecer Fonoaudiológico & Laudo */}
        {(activeTab === 'all' || activeTab === 'opinion') && (
          <section id="sec-opinion">
            <AudiologicalOpinionSummary
              exam={reviewExam}
              patientAge={patientAge}
              onChange={updateExam}
            />
          </section>
        )}
      </div>

      {/* Botões de Ação Inferiores (Desktop) */}
      <div className="hidden lg:flex justify-end pt-4 border-t border-slate-200">
        <ActionButtons />
      </div>

      {/* Barra Flutuante de Ação no Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-30 flex lg:hidden items-center justify-between gap-2">
        <Link to="/exames" className="shrink-0">
          <Button variant="outline" size="sm" className="h-10 px-3 rounded-xl border-slate-300">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={() => handleExport('pdf')}
          className="flex-1 gap-1.5 rounded-xl border-red-200 bg-red-50/50 text-red-700 font-bold h-10 text-xs shadow-xs"
        >
          <FileText className="w-4 h-4 text-red-500" /> Exportar PDF
        </Button>
        <Button
          onClick={handleSave}
          disabled={saveStatus === 'saving' || !!loadError}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 rounded-xl h-10 text-xs shadow-md shadow-emerald-500/20"
        >
          <Save className="w-4 h-4" /> Salvar
        </Button>
      </div>

      {/* Modal de Personalização e Auto-detecção de Exames para PDF */}
      {selectedPatient && isPdfModalOpen && getExamData() && (
        <ExportPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          exam={getExamData()!}
          patient={selectedPatient}
        />
      )}
    </div>
  );
}
