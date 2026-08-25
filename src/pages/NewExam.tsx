import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, Audiometry, TonalFrequency } from '@/db/db';
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
  Eye,
  Activity,
  MessageSquare,
  Sparkles,
  Zap,
  Layers,
  ClipboardList
} from 'lucide-react';
import { syncManager } from '@/lib/syncManager';
import { customAlert, customConfirm } from '@/lib/dialogs';
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
import { DegreeStandard } from '@/lib/audiologyCalculations';

export default function NewExam() {
  const { user } = useAuth();
  const { patientId, examId } = useParams();
  const navigate = useNavigate();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '');
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'all' | 'meatoscopy' | 'tonal' | 'logo' | 'tymp' | 'reflex' | 'complementary' | 'opinion'>('all');
  const [standard, setStandard] = useState<DegreeStandard>('OMS_2021');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const selectedPatient = patients?.find(p => p.id === selectedPatientId);

  // Idade do paciente
  const patientAge = selectedPatient?.birthDate
    ? Math.floor((new Date().getTime() - new Date(selectedPatient.birthDate).getTime()) / 3.15576e+10)
    : '';

  // Estado Principal do Exame
  const [exam, setExam] = useState<Partial<Audiometry>>({
    header: { audiometer: '', impedanciometer: '', requestingPhysician: '', speechTherapist: '' },
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
    meatoscopy: { right: 'normal', left: 'normal', rightDescription: 'Conduto livre, membrana timpânica íntegra.', leftDescription: 'Conduto livre, membrana timpânica íntegra.' },
    complementary: { weber: '', toneDecay: '' },
    opinion: {}
  });

  useEffect(() => {
    if (examId) {
      db.audiometries.get(examId).then(existingExam => {
        if (existingExam) {
          setSelectedPatientId(existingExam.patientId);
          setExamDate(existingExam.examDate || new Date().toISOString().split('T')[0]);
          setExam(existingExam);
        }
      });
    } else {
      setSelectedPatientId(patientId || '');
      setExamDate(new Date().toISOString().split('T')[0]);
    }
  }, [examId, patientId]);

  const getExamData = (): Audiometry | null => {
    if (!selectedPatientId) {
      customAlert('Selecione um paciente!');
      return null;
    }
    return {
      ...exam,
      id: examId || exam.id || crypto.randomUUID(),
      patientId: selectedPatientId,
      examDate,
      createdAt: exam.createdAt || Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
      user_id: user?.id
    } as Audiometry;
  };

  const handleSave = async () => {
    const essentialFreqs: TonalFrequency[] = ['500', '1000', '2000', '4000'];
    let missingSBFa = false;
    for (const ear of ['right', 'left'] as const) {
      for (const freq of essentialFreqs) {
        if (exam.tonalData?.[ear]?.[freq]?.va === undefined) {
          missingSBFa = true;
        }
      }
    }

    if (missingSBFa) {
      const proceed = await customConfirm(
        'Atenção: O Guia de Orientações da SBFa recomenda registrar os limiares de 500, 1000, 2000 e 4000Hz em ambas as orelhas. Faltam alguns dados. Deseja salvar mesmo assim?'
      );
      if (!proceed) return;
    }

    const examData = getExamData();
    if (!examData) return;
    setSaveStatus('saving');
    try {
      await db.audiometries.put(examData);
      syncManager.sync(); // Cloud sync

      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        if (!examId) {
          navigate(`/exame/${examData.id}`, { replace: true });
        }
      }, 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
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
        disabled={saveStatus === 'saving'}
        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm h-10 px-5 font-bold"
      >
        <Save className="w-4 h-4" /> {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Exame'}
      </Button>
      <Button
        variant="outline"
        onClick={() => handleExport('pdf')}
        className="gap-2 rounded-xl border-slate-200 hover:bg-slate-50 h-10 font-semibold"
      >
        <FileText className="w-4 h-4 text-red-500" /> PDF Oficial
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
              Protocolo completo de audiologia clínica e ocupacional conforme diretrizes CFFa/SBFa.
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
                {patients?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.cpf ? `(${p.cpf})` : ''}
                  </option>
                ))}
              </select>
              {selectedPatient && (
                <div className="text-[11px] text-slate-500 mt-1.5 flex gap-4 font-medium">
                  {patientAge !== '' && <span>Idade: <strong>{patientAge} anos</strong></span>}
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
                  onChange={e => setExam({ ...exam, examPurpose: e.target.value as any })}
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
                  onChange={e => setExam({ ...exam, examCategory: e.target.value as any })}
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
                  onChange={e => setExam({ ...exam, header: { ...exam.header, audiometer: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Impedanciômetro</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: Interacoustics AT235"
                  value={exam.header?.impedanciometer || ''}
                  onChange={e => setExam({ ...exam, header: { ...exam.header, impedanciometer: e.target.value } })}
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
                  onChange={e => setExam({ ...exam, header: { ...exam.header, requestingPhysician: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Fonoaudiólogo(a)</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: Dra. Mariana Costa (CRFa 2-9876)"
                  value={exam.header?.speechTherapist || ''}
                  onChange={e => setExam({ ...exam, header: { ...exam.header, speechTherapist: e.target.value } })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
        >
          <Eye className="w-3.5 h-3.5" /> 1. Meatoscopia
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tonal')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tonal'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> 2. Audiometria Tonal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logo')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'logo'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> 3. Logoaudiometria
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tymp')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tymp'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> 4. Timpanometria
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reflex')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'reflex'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" /> 5. Reflexos Estapedianos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('complementary')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'complementary'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> 6. Testes Especiais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('opinion')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'opinion'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" /> 7. Parecer e Laudo
        </button>
      </div>

      {/* Componentes Modulares de Exame */}
      <div className="space-y-8">
        {/* 1. Meatoscopia */}
        {(activeTab === 'all' || activeTab === 'meatoscopy') && (
          <section id="sec-meatoscopy">
            <MeatoscopyExam
              meatoscopy={exam.meatoscopy}
              onChange={data => setExam({ ...exam, meatoscopy: data })}
            />
          </section>
        )}

        {/* 2. Audiometria Tonal Liminar */}
        {(activeTab === 'all' || activeTab === 'tonal') && (
          <section id="sec-tonal">
            <TonalAudiometryExam
              tonalData={exam.tonalData || { right: {}, left: {} }}
              tonalMasking={exam.tonalMasking}
              freeField={exam.freeField}
              category={exam.examCategory}
              standard={standard}
              onChangeTonal={data => setExam({ ...exam, tonalData: data })}
              onChangeMasking={data => setExam({ ...exam, tonalMasking: data })}
              onChangeFreeField={data => setExam({ ...exam, freeField: data })}
            />
          </section>
        )}

        {/* 3. Logoaudiometria */}
        {(activeTab === 'all' || activeTab === 'logo') && (
          <section id="sec-logo">
            <LogoAudiometryExam
              logoData={
                exam.logoAudiometry || {
                  right: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} },
                  left: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} }
                }
              }
              tonalData={exam.tonalData}
              onChange={data => setExam({ ...exam, logoAudiometry: data })}
            />
          </section>
        )}

        {/* 4. Timpanometria */}
        {(activeTab === 'all' || activeTab === 'tymp') && (
          <section id="sec-tymp">
            <TympanometryExam
              tympanometry={exam.tympanometry || { right: {}, left: {} }}
              onChange={data => setExam({ ...exam, tympanometry: data })}
            />
          </section>
        )}

        {/* 5. Reflexos Estapedianos */}
        {(activeTab === 'all' || activeTab === 'reflex') && (
          <section id="sec-reflex">
            <StapedialReflexExam
              reflexes={exam.reflexes || { right: {}, left: {}, sondaOD: '', sondaOE: '' }}
              tonalData={exam.tonalData}
              onChange={data => setExam({ ...exam, reflexes: data })}
            />
          </section>
        )}

        {/* 6. Testes Complementares */}
        {(activeTab === 'all' || activeTab === 'complementary') && (
          <section id="sec-complementary">
            <ComplementaryTestsExam
              complementary={exam.complementary}
              tonalData={exam.tonalData}
              onChange={data => setExam({ ...exam, complementary: data })}
            />
          </section>
        )}

        {/* 7. Parecer Fonoaudiológico & Laudo */}
        {(activeTab === 'all' || activeTab === 'opinion') && (
          <section id="sec-opinion">
            <AudiologicalOpinionSummary
              opinion={exam.opinion}
              resultAndConduct={exam.resultAndConduct || ''}
              standard={standard}
              onStandardChange={std => setStandard(std)}
              onChangeOpinion={op => setExam({ ...exam, opinion: op })}
              onChangeConduct={text => setExam({ ...exam, resultAndConduct: text })}
              examData={{
                tonalData: exam.tonalData || { right: {}, left: {} },
                logoAudiometry: exam.logoAudiometry || {
                  right: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} },
                  left: { srt: {}, irf: { mono: {}, dis: {}, tris: {} }, voiceDetection: {} }
                },
                tympanometry: exam.tympanometry || { right: {}, left: {} },
                meatoscopy: exam.meatoscopy,
                complementary: exam.complementary,
                examCategory: exam.examCategory
              }}
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
          onClick={() => setIsPdfModalOpen(true)}
          className="flex-1 gap-1.5 rounded-xl border-red-200 bg-red-50/50 text-red-700 font-bold h-10 text-xs shadow-xs"
        >
          <FileText className="w-4 h-4 text-red-500" /> PDF Oficial
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 rounded-xl h-10 text-xs shadow-md shadow-emerald-500/20"
        >
          <Save className="w-4 h-4" /> Salvar
        </Button>
      </div>

      {/* Modal de Personalização e Auto-detecção de Exames para PDF */}
      {selectedPatient && getExamData() && (
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
