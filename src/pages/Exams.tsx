import { isReviewCurrent } from '@/lib/examIntegrity';
import { examStatus } from '@/lib/clinicalOverview';
import { customAlert } from '@/lib/dialogs';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Fuse from 'fuse.js';
import {
  Search,
  Plus,
  FileText,
  Activity,
  Users,
  CheckCircle2,
  Download,
  ListFilter,
  UserCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Audiometry, Patient } from '@/db/db';
import ExportPdfModal from '@/components/ExportPdfModal';

export default function Exams() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all_exams' | 'by_patient'>('all_exams');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'todos' | 'clinico' | 'ocupacional'>('todos');
  const [pdfModalData, setPdfModalData] = useState<{ exam: Audiometry; patient: Patient } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const allExams = useLiveQuery(() => db.audiometries.orderBy('examDate').reverse().toArray(), []);
  const allPatients = useLiveQuery(() => db.patients.orderBy('name').toArray(), []);

  // Map patient names and phones to all exams for unified listing
  const enrichedExams = useMemo(() => {
    if (!allExams || !allPatients) return [];
    return allExams.map((exam) => {
      const patient = allPatients.find((p) => p.id === exam.patientId);
      return {
        ...exam,
        patientName: patient?.name || 'Paciente não informado',
        patientCpf: patient?.cpf || '',
        patientPhone: patient?.phone || '',
        patient
      };
    });
  }, [allExams, allPatients]);

  // Filtered all exams list
  const filteredAllExams = useMemo(() => {
    return enrichedExams.filter((exam) => {
      const matchesCategory =
        categoryFilter === 'todos' || exam.examCategory === categoryFilter;
      const matchesSearch =
        searchTerm === '' ||
        exam.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.patientCpf.includes(searchTerm) ||
        (exam.examDate && exam.examDate.includes(searchTerm)) ||
        (exam.opinion?.clinical && exam.opinion.clinical.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [enrichedExams, categoryFilter, searchTerm]);

  // Patient exams for 'by_patient' mode
  const patientExams = useMemo(() => {
    if (!allExams || !selectedPatientId) return [];
    return allExams.filter((exam) => exam.patientId === selectedPatientId);
  }, [allExams, selectedPatientId]);

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedExams([]);
    setSearchOpen(false);
  };

  const fusePatients = useMemo(
    () =>
      new Fuse(allPatients || [], {
        keys: ['name', 'cpf'],
        threshold: 0.3
      }),
    [allPatients]
  );

  const searchPatientResults = useMemo(() => {
    if (!patientSearchTerm) return allPatients || [];
    return fusePatients.search(patientSearchTerm).map((result) => result.item);
  }, [patientSearchTerm, fusePatients, allPatients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExamSelection = (examId: string) => {
    // Comparação só faz sentido entre exames do mesmo paciente.
    const patientOf = (id: string) => allExams?.find(e => e.id === id)?.patientId;
    if (!selectedExams.includes(examId) && selectedExams.length && patientOf(selectedExams[selectedExams.length - 1]) !== patientOf(examId)) {
      setSelectedExams([examId]);
      customAlert('A comparação é feita entre exames do mesmo paciente. A seleção anterior foi substituída.');
      return;
    }
    setSelectedExams((prev) => {
      if (prev.includes(examId)) return prev.filter((id) => id !== examId);
      if (prev.length >= 2) return [prev[1], examId]; // Keep only the last 2 selected
      return [...prev, examId];
    });
  };

  const handleCompare = () => {
    if (selectedExams.length === 2) {
      navigate(`/comparar/${selectedExams[0]}/${selectedExams[1]}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Exames Audiométricos</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Gerencie laudos, gere relatórios em PDF e compare a evolução auditiva dos pacientes.
          </p>
        </div>
        <Link to="/exame/novo">
          <Button className="gap-2 bg-[#0071e3] hover:bg-blue-600 text-white rounded-xl shadow-xs h-11 px-5 font-semibold">
            <Plus className="h-4 w-4" /> Iniciar Novo Exame
          </Button>
        </Link>
      </div>

      {/* Tabs: "Todos os Exames" vs "Por Paciente" */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all_exams')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'all_exams'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Todos os Exames ({allExams?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('by_patient')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'by_patient'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Filtrar por Paciente</span>
          </button>
        </div>

        {/* Global Compare CTA */}
        {selectedExams.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              {selectedExams.length} de 2 para comparar
            </span>
            <Button
              onClick={handleCompare}
              disabled={selectedExams.length !== 2}
              className="gap-1.5 h-9 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Comparar (2)</span>
            </Button>
          </div>
        )}
      </div>

      {/* TAB 1: TODOS OS EXAMES RECENTES */}
      {activeTab === 'all_exams' && (
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="space-y-3 pb-4 border-b border-slate-100 bg-slate-50/50">
            {/* Category Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCategoryFilter('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    categoryFilter === 'todos'
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todos os Tipos
                </button>
                <button
                  onClick={() => setCategoryFilter('clinico')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    categoryFilter === 'clinico'
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Clínicos
                </button>
                <button
                  onClick={() => setCategoryFilter('ocupacional')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    categoryFilter === 'ocupacional'
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Ocupacionais (NR-7)
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Buscar paciente, data, CPF..."
                  className="pl-9 bg-white border-slate-300 h-9.5 text-xs rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {filteredAllExams.map((exam) => {
                const isSelected = selectedExams.includes(exam.id);
                return (
                  <div
                    key={exam.id}
                    className={`p-4 sm:p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-colors ${
                      isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Comparison Checkbox */}
                      <button
                        onClick={() => toggleExamSelection(exam.id)}
                        className={`mt-1 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 hover:border-indigo-400 text-transparent'
                        }`}
                        title="Marcar para comparar"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Link
                            to={`/exame/${exam.id}`}
                            className="font-bold text-base text-slate-900 hover:text-[#0071e3] transition truncate"
                          >
                            {exam.patientName}
                          </Link>
                          {exam.examCategory === 'ocupacional' ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase font-bold tracking-wide">
                              Ocupacional
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase font-bold tracking-wide">
                              Clínico
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isReviewCurrent(exam) ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{isReviewCurrent(exam) ? 'Revisado' : 'Aguardando revisão'}</span>
                          {exam.opinion?.clinical && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                { normal: 'bg-emerald-50 text-emerald-700 border-emerald-200', altered: 'bg-rose-50 text-rose-700 border-rose-200', inconclusive: 'bg-amber-50 text-amber-800 border-amber-200', draft: 'bg-slate-50 text-slate-600 border-slate-200' }[examStatus(exam)]
                              }`}
                            >
                              {exam.opinion.clinical}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                          <span>
                            Data: <strong className="text-slate-700 font-semibold">{exam.examDate.split('-').reverse().join('/')}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Finalidade: <strong className="capitalize text-slate-700 font-semibold">{exam.examPurpose || 'não informada'}</strong>
                          </span>
                          {exam.header?.speechTherapist && (
                            <>
                              <span>•</span>
                              <span>Fono: <strong className="text-slate-700">{exam.header.speechTherapist}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-8 md:ml-0 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (exam.patient) {
                            setPdfModalData({ exam, patient: exam.patient });
                          }
                        }}
                        className="gap-1.5 bg-white text-rose-700 hover:bg-rose-50 border-rose-200 text-xs rounded-xl h-9 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-rose-600" />
                        <span>Gerar PDF</span>
                      </Button>
                      <Link to={`/exame/${exam.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 bg-white text-slate-700 hover:bg-slate-100 text-xs rounded-xl h-9"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                          <span>Abrir Laudo</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}

              {filteredAllExams.length === 0 && (
                <div className="text-center py-16 space-y-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                    <FileText className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Nenhum exame encontrado</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Não encontramos exames com os filtros atuais. Tente buscar por outro termo ou inicie um novo exame.
                  </p>
                  <Link to="/exame/novo">
                    <Button className="mt-2 gap-2 bg-[#0071e3] hover:bg-blue-600 text-xs font-semibold rounded-xl">
                      <Plus className="w-4 h-4" /> Iniciar Exame
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: POR PACIENTE */}
      {activeTab === 'by_patient' && (
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Users className="w-4.5 h-4.5 text-[#0071e3]" />
                1. Selecione o Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-w-xl relative" ref={searchRef}>
                <div
                  className="flex h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 shadow-xs cursor-pointer items-center justify-between"
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <span className="font-medium">
                    {selectedPatientId
                      ? allPatients?.find((p) => p.id === selectedPatientId)?.name || 'Paciente selecionado'
                      : '-- Escolha ou pesquise um paciente --'}
                  </span>
                  <Search className="w-4.5 h-4.5 text-slate-400" />
                </div>

                {searchOpen && (
                  <div className="absolute z-20 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50">
                      <Input
                        autoFocus
                        placeholder="Buscar por nome ou CPF..."
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        className="border-slate-300 h-9.5 text-xs rounded-xl"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {searchPatientResults.map((p) => (
                        <div
                          key={p.id}
                          className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer rounded-xl text-slate-800 transition"
                          onClick={() => handlePatientSelect(p.id)}
                        >
                          <div className="font-semibold text-xs sm:text-sm">{p.name}</div>
                          {p.cpf && <div className="text-[11px] text-slate-400">CPF: {p.cpf}</div>}
                        </div>
                      ))}
                      {searchPatientResults.length === 0 && (
                        <div className="p-4 text-center text-slate-500 text-xs">Nenhum paciente encontrado.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedPatientId && (
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  <Activity className="w-4.5 h-4.5 text-indigo-600" />
                  2. Histórico de Exames deste Paciente ({patientExams.length})
                </CardTitle>

                <div className="flex items-center gap-3">
                  <Link to={`/exame/novo/${selectedPatientId}`}>
                    <Button size="sm" className="gap-1.5 bg-[#0071e3] hover:bg-blue-600 text-xs rounded-xl h-9">
                      <Plus className="w-3.5 h-3.5" /> Novo Exame
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {patientExams.map((exam) => {
                    const isSelected = selectedExams.includes(exam.id);
                    return (
                      <div
                        key={exam.id}
                        className={`p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-colors ${
                          isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <button
                            onClick={() => toggleExamSelection(exam.id)}
                            className={`mt-1 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 hover:border-indigo-400 text-transparent'
                            }`}
                            title="Selecionar para comparação"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>

                          <div>
                            <div className="flex items-center gap-2.5">
                              <h3 className="font-bold text-base text-slate-900">
                                {exam.examDate.split('-').reverse().join('/')}
                              </h3>
                              {exam.examCategory === 'ocupacional' && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                                  Ocupacional
                                </span>
                              )}
                              {exam.examCategory === 'clinico' && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                                  Clínico
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                              <span>
                                Propósito: <strong className="capitalize text-slate-700">{exam.examPurpose || 'não informado'}</strong>
                              </span>
                              <span>
                                Fonoaudiólogo(a): <strong className="text-slate-700">{exam.header?.speechTherapist || '--'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-8 md:ml-0 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const patient = allPatients?.find((p) => p.id === selectedPatientId);
                              if (patient) {
                                setPdfModalData({ exam, patient });
                              }
                            }}
                            className="gap-1.5 bg-white text-rose-700 hover:bg-rose-50 border-rose-200 text-xs rounded-xl h-9 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" /> Gerar PDF
                          </Button>
                          <Link to={`/exame/${exam.id}`}>
                            <Button variant="outline" size="sm" className="gap-1.5 bg-white text-slate-700 hover:bg-slate-100 text-xs rounded-xl h-9">
                              <FileText className="h-3.5 w-3.5 text-slate-500" /> Abrir Laudo
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {patientExams.length === 0 && (
                    <div className="text-center py-14 space-y-3">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                        <FileText className="w-7 h-7 text-slate-300" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">Nenhum exame encontrado</h3>
                      <p className="text-xs text-slate-500">Este paciente ainda não possui audiometrias cadastradas.</p>
                      <Link to={`/exame/novo/${selectedPatientId}`}>
                        <Button className="mt-2 gap-2 bg-[#0071e3] hover:bg-blue-600 text-xs rounded-xl">
                          <Plus className="w-4 h-4" /> Criar Primeiro Exame
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal de Personalização e Auto-detecção de Exames para PDF */}
      {pdfModalData && (
        <ExportPdfModal
          isOpen={!!pdfModalData}
          onClose={() => setPdfModalData(null)}
          exam={pdfModalData.exam}
          patient={pdfModalData.patient}
        />
      )}
    </div>
  );
}
