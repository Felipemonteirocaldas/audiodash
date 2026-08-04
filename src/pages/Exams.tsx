import { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Fuse from 'fuse.js';
import { Search, Plus, FileText, Activity, Users, CheckCircle2, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { exportToPdf } from '@/lib/exportPdf';

export default function Exams() {
  const navigate = useNavigate();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const allExams = useLiveQuery(() => db.audiometries.orderBy('examDate').reverse().toArray(), []);
  const allPatients = useLiveQuery(() => db.patients.orderBy('name').toArray(), []);

  const patientExams = useMemo(() => {
    if (!allExams || !selectedPatientId) return [];
    return allExams.filter(exam => exam.patientId === selectedPatientId);
  }, [allExams, selectedPatientId]);

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedExams([]); // reset comparison selection
    setSearchOpen(false);
  };

  const fuse = useMemo(() => new Fuse(allPatients || [], {
    keys: ['name', 'cpf'],
    threshold: 0.3
  }), [allPatients]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return allPatients || [];
    return fuse.search(searchTerm).map(result => result.item);
  }, [searchTerm, fuse, allPatients]);

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
    setSelectedExams(prev => {
      if (prev.includes(examId)) return prev.filter(id => id !== examId);
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
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Exames</h1>
          <p className="text-slate-500 mt-1">Gerencie e compare audiometrias dos seus pacientes.</p>
        </div>
        {selectedPatientId && (
          <Link to={`/exame/novo/${selectedPatientId}`}>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm h-11 px-6">
              <Plus className="h-4 w-4" /> Novo Exame para este Paciente
            </Button>
          </Link>
        )}
      </div>

      <Card className="border-slate-200/60 shadow-sm overflow-visible">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            1. Selecione o Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-xl relative" ref={searchRef}>
            <div 
              className="flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-base text-slate-800 shadow-sm cursor-pointer items-center justify-between"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <span>
                {selectedPatientId 
                  ? (allPatients?.find(p => p.id === selectedPatientId)?.name || 'Paciente selecionado')
                  : '-- Escolha ou pesquise um paciente --'}
              </span>
              <Search className="w-5 h-5 text-slate-400" />
            </div>

            {searchOpen && (
              <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="p-2 border-b border-slate-100 bg-slate-50">
                  <Input 
                    autoFocus
                    placeholder="Buscar nome ou CPF..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="border-slate-300 h-10"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto p-2">
                  {searchResults.map(p => (
                    <div 
                      key={p.id}
                      className="px-4 py-2 hover:bg-indigo-50 cursor-pointer rounded-lg text-slate-800"
                      onClick={() => handlePatientSelect(p.id)}
                    >
                      <div className="font-semibold">{p.name}</div>
                      {p.cpf && <div className="text-xs text-slate-500">CPF: {p.cpf}</div>}
                    </div>
                  ))}
                  {searchResults.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-sm">Nenhum paciente encontrado.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedPatientId && (
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              2. Exames do Paciente
            </CardTitle>
            
            {/* Comparison Action Area */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 font-medium">
                {selectedExams.length} de 2 selecionados para comparar
              </span>
              <Button 
                onClick={handleCompare} 
                disabled={selectedExams.length !== 2}
                className="gap-2 rounded-lg"
                variant={selectedExams.length === 2 ? 'default' : 'secondary'}
              >
                <Activity className="w-4 h-4" /> Comparar Selecionados
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {patientExams.map(exam => {
                const isSelected = selectedExams.includes(exam.id);
                return (
                  <div 
                    key={exam.id} 
                    className={`p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox / Selector */}
                      <button 
                        onClick={() => toggleExamSelection(exam.id)}
                        className={`mt-1 shrink-0 w-6 h-6 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-400 text-transparent'}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg text-slate-800">{exam.examDate.split('-').reverse().join('/')}</h3>
                          {exam.examCategory === 'ocupacional' && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Ocupacional (ASO)</span>
                          )}
                          {exam.examCategory === 'clinico' && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Clínico</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          <span>Propósito: <strong className="capitalize font-medium text-slate-700">{exam.examPurpose || 'Referencial'}</strong></span>
                          <span>Fono: <strong className="font-medium text-slate-700">{exam.header?.speechTherapist || '--'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-10 md:ml-0 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={async () => {
                          const patient = allPatients?.find(p => p.id === selectedPatientId);
                          if (patient) {
                            await exportToPdf(exam, patient);
                          }
                        }}
                        className="gap-2 bg-white text-red-600 hover:bg-red-50 border-red-200"
                      >
                        <Download className="h-4 w-4" /> Gerar PDF
                      </Button>
                      <Link to={`/exame/${exam.id}`}>
                        <Button variant="outline" size="sm" className="gap-2 bg-white text-slate-700 hover:bg-slate-50">
                          <FileText className="h-4 w-4" /> Abrir / Editar Exame
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
              
              {patientExams.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-700">Nenhum exame encontrado</h3>
                  <p className="text-slate-500 mt-1 mb-6">Este paciente ainda não possui audiometrias cadastradas.</p>
                  <Link to={`/exame/novo/${selectedPatientId}`}>
                    <Button className="gap-2">
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
  );
}
