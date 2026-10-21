import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Patient } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, FileText, Activity, Edit, Trash2, Calendar, X, MessageCircle, Archive, ArchiveRestore } from 'lucide-react';
import { Link } from 'react-router-dom';
import { customAlert } from '@/lib/dialogs';
import { syncManager } from '@/lib/syncManager';
import { useAuth } from '@/contexts/AuthContext';
import { examStatus } from '@/lib/clinicalOverview';
import { lastRecordDate, permanentDeletionStatus, timestampToLocalDate } from '@/lib/recordRetention';
import { localDate, ageAtExam } from '@/lib/examIntegrity';

// "AAAA-MM-DD" interpretado como data local (new Date('AAAA-MM-DD') é UTC e, no Brasil, recua um dia).
function calculateAge(birthDate: string) {
  return ageAtExam(birthDate, localDate())?.label || 'não informada';
}

const formatCPF = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
};

const formatPhone = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  
  if (v.length > 10) {
    return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (v.length > 6) {
    return v.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
  } else if (v.length > 2) {
    return v.replace(/(\d{2})(\d{1,5})/, '($1) $2');
  }
  return v;
};

export default function Patients() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    name: '', cpf: '', birthDate: '', gender: '', occupation: '', phone: '', notes: ''
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [viewingAppointmentsFor, setViewingAppointmentsFor] = useState<Patient | null>(null);
  const [patientFilter, setPatientFilter] = useState<'all' | 'with_exams' | 'no_exams' | 'archived'>('all');

  const patients = useLiveQuery(
    () =>
      db.patients
        .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.cpf.includes(searchTerm))
        .reverse()
        .toArray(),
    [searchTerm]
  );

  const allExams = useLiveQuery(() => db.audiometries.toArray(), []);
  const allAnamneses = useLiveQuery(() => db.anamneses.toArray(), []);
  const allAppointments = useLiveQuery(() => db.appointments.toArray(), []);

  const activePatients = useMemo(() => (patients || []).filter(p => !p.archivedAt), [patients]);
  const archivedCount = (patients?.length || 0) - activePatients.length;
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    if (patientFilter === 'archived') return patients.filter(p => !!p.archivedAt);
    if (patientFilter === 'with_exams') {
      return activePatients.filter((p) => allExams?.some((e) => e.patientId === p.id));
    }
    if (patientFilter === 'no_exams') {
      return activePatients.filter((p) => !allExams?.some((e) => e.patientId === p.id));
    }
    return activePatients;
  }, [patients, activePatients, patientFilter, allExams]);

  // Res. CFFa 777/2025, art. 8º: eliminação só após 20 anos do último registro; antes disso, arquivamento.
  const deletionStatus = useMemo(() => {
    if (!editingPatientId) return null;
    const patient = patients?.find(p => p.id === editingPatientId);
    const dates = [
      ...(allExams || []).filter(e => e.patientId === editingPatientId).map(e => e.examDate),
      ...(allAnamneses || []).filter(a => a.patientId === editingPatientId).map(a => a.examDate),
      timestampToLocalDate(patient?.createdAt)
    ];
    return permanentDeletionStatus(lastRecordDate(dates), localDate());
  }, [editingPatientId, patients, allExams, allAnamneses]);

  const setArchived = async (patientId: string, archived: boolean) => {
    try {
      await db.patients.update(patientId, { archivedAt: archived ? Date.now() : null, updatedAt: Date.now(), syncStatus: 'pending' });
      syncManager.sync();
      if (archived) {
        setIsDeleteDialogOpen(false);
        setIsFormOpen(false);
        setEditingPatientId(null);
        await customAlert('Paciente arquivado. O prontuário foi preservado e pode ser consultado no filtro "Arquivados".');
      }
    } catch {
      await customAlert('Não foi possível atualizar o arquivamento do paciente.');
    }
  };

  const getPatientStatusBadge = (exams: any[]) => {
    if (!exams || exams.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
          Sem Exames
        </span>
      );
    }
    const latest = exams[0];
    const status = examStatus(latest);
    const occupational = latest.examCategory === 'ocupacional' ? ' · Ocupacional (NR-7)' : '';
    const styles = { draft: 'text-slate-600 bg-slate-50 border-slate-200', normal: 'text-emerald-700 bg-emerald-50 border-emerald-200', altered: 'text-rose-700 bg-rose-50 border-rose-200', inconclusive: 'text-amber-700 bg-amber-50 border-amber-200' }[status];
    const label = { draft: 'Último exame em rascunho', normal: 'Normalidade bilateral (revisado)', altered: 'Alteração audiológica (revisado)', inconclusive: 'Inconclusivo (revisado)' }[status];
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-full ${styles}`}>
        ● {label}{occupational}
      </span>
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      if (editingPatientId) {
        await db.patients.update(editingPatientId, {
          ...newPatient,
          updatedAt: now,
          syncStatus: 'pending'
        });
      } else {
        await db.patients.add({ 
          ...newPatient, 
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
          user_id: user?.id
        } as Patient);
      }
      setIsFormOpen(false);
      setEditingPatientId(null);
      setNewPatient({ name: '', cpf: '', birthDate: '', gender: '', occupation: '', phone: '', notes: '' });
      syncManager.sync();
    } catch (err) {
      await customAlert("Erro ao salvar paciente.");
    }
  };

  const handleDelete = async () => {
    if (!editingPatientId) return;
    if (!deletionStatus?.allowed) {
      await customAlert(deletionStatus?.reason || 'Exclusão definitiva indisponível.');
      return;
    }
    if (deleteConfirmationText !== 'DELETAR') {
      await customAlert("A palavra não confere. Exclusão cancelada.");
      return;
    }
    try {
      const exams = await db.audiometries.where('patientId').equals(editingPatientId).toArray();
      for (const exam of exams) {
        await syncManager.deleteRecord('audiometries', exam.id);
      }
      
      const anamneses = await db.anamneses.where('patientId').equals(editingPatientId).toArray();
      for (const anam of anamneses) {
        await syncManager.deleteRecord('anamneses', anam.id);
      }

      const appointments = await db.appointments.where('patientId').equals(editingPatientId).toArray();
      for (const app of appointments) {
        await syncManager.deleteRecord('appointments', app.id);
      }

      await syncManager.deleteRecord('patients', editingPatientId);
      
      setIsDeleteDialogOpen(false);
      setDeleteConfirmationText('');
      setIsFormOpen(false);
      setEditingPatientId(null);
      setNewPatient({ name: '', cpf: '', birthDate: '', gender: '', occupation: '', phone: '', notes: '' });
      await customAlert("Paciente e todos os seus registros foram excluídos com sucesso.");
    } catch (err) {
      await customAlert("Erro ao excluir paciente.");
    }
  };

  const handleSelectForComparison = (examId: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(examId)) return prev.filter(id => id !== examId);
      if (prev.length >= 2) return [prev[1], examId];
      return [...prev, examId];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
        <Button 
          onClick={() => {
            setIsFormOpen(!isFormOpen);
            if (!isFormOpen) {
              setEditingPatientId(null);
              setNewPatient({ name: '', cpf: '', birthDate: '', gender: '', occupation: '', phone: '', notes: '' });
            }
          }} 
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Novo Paciente
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPatientId ? 'Editar Paciente' : 'Cadastrar Novo Paciente'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Completo *</label>
                  <Input required value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CPF</label>
                  <Input maxLength={14} value={newPatient.cpf} onChange={e => setNewPatient({...newPatient, cpf: formatCPF(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data de Nascimento</label>
                  <div className="flex gap-2">
                    <Input type="date" value={newPatient.birthDate} onChange={e => setNewPatient({...newPatient, birthDate: e.target.value})} />
                    <div className="flex items-center justify-center bg-muted px-4 rounded-md border text-sm font-medium min-w-[80px]">
                      {newPatient.birthDate ? calculateAge(newPatient.birthDate) : '--'}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sexo</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newPatient.gender} 
                    onChange={e => setNewPatient({...newPatient, gender: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone / WhatsApp (com DDD)</label>
                  <Input maxLength={15} type="tel" placeholder="(00) 00000-0000" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: formatPhone(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Profissão</label>
                  <Input value={newPatient.occupation} onChange={e => setNewPatient({...newPatient, occupation: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div>
                  {editingPatientId && (
                    <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="gap-2">
                      <Archive className="w-4 h-4" /> Arquivar / excluir
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setEditingPatientId(null); }}>Cancelar</Button>
                  <Button type="submit">{editingPatientId ? 'Salvar Alterações' : 'Salvar Paciente'}</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-3">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setPatientFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                patientFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({activePatients.length})
            </button>
            <button
              onClick={() => setPatientFilter('with_exams')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                patientFilter === 'with_exams'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Com Exames
            </button>
            <button
              onClick={() => setPatientFilter('no_exams')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                patientFilter === 'no_exams'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sem Exames Cadastrados
            </button>
            <button
              onClick={() => setPatientFilter('archived')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                patientFilter === 'archived'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Arquivados ({archivedCount})
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou CPF..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {filteredPatients?.map((p: Patient) => {
              const patientExams = allExams?.filter(e => e.patientId === p.id).sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime()) || [];
              const patientAnamneses = allAnamneses?.filter(a => a.patientId === p.id).sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime()) || [];
              return (
              <div key={p.id} className="py-4 flex flex-col gap-2">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-semibold text-lg text-slate-900">{p.name}</h3>
                      {getPatientStatusBadge(patientExams)}
                      {p.archivedAt && <span className="inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-full text-slate-600 bg-slate-100 border-slate-300">Arquivado</span>}
                      {p.archivedAt && <button type="button" onClick={() => setArchived(p.id, false)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"><ArchiveRestore className="w-3.5 h-3.5" /> Restaurar</button>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>CPF: <strong className="text-slate-700">{p.cpf || 'Não informado'}</strong></span>
                      <span>•</span>
                      <span>Idade: <strong className="text-slate-700">{calculateAge(p.birthDate)}</strong></span>
                      {p.phone && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://wa.me/55${p.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá ${p.name}! Entramos em contato a respeito do seu atendimento na clínica.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md font-semibold transition border border-emerald-200/60"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>{p.phone}</span>
                          </a>
                        </>
                      )}
                      {p.occupation && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">Função: {p.occupation}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 text-slate-600 hover:text-indigo-600"
                      onClick={() => {
                        setEditingPatientId(p.id);
                        setNewPatient({...p});
                        setIsFormOpen(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <Edit className="h-4 w-4" /> Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => setViewingAppointmentsFor(p)}
                    >
                      <Calendar className="h-4 w-4" /> Agendamentos
                    </Button>
                    <Link to={`/evolucao/${p.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800">
                        <Activity className="h-4 w-4" /> PCA
                      </Button>
                    </Link>
                    <Link to={`/anamnese/novo/${p.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800">
                        <FileText className="h-4 w-4" /> Nova Anamnese
                      </Button>
                    </Link>
                    <Link to={`/exame/novo/${p.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800">
                        <Plus className="h-4 w-4" /> Novo Exame
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Anamneses */}
                {(patientAnamneses.length > 0) && (
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 mt-3">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" /> Anamneses Registradas ({patientAnamneses.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {patientAnamneses.map(anam => (
                        <Link 
                          key={anam.id} 
                          to={`/anamnese/${anam.id}`}
                          className="bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all p-3 rounded-lg flex items-center justify-between group"
                        >
                          <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 transition-colors">
                            {anam.examDate.split('-').reverse().join('/')}
                          </span>
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full group-hover:bg-emerald-100 transition-colors">
                            Ver Ficha
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {patientExams.length > 0 && (
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 mt-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" /> Laudos Registrados ({patientExams.length})
                      </h4>
                      {selectedForComparison.length === 2 && (
                        <Link to={`/comparar/${selectedForComparison[0]}/${selectedForComparison[1]}`}>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs px-3">Comparar Selecionados</Button>
                        </Link>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {patientExams.map(exam => (
                        <div key={exam.id} className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={selectedForComparison.includes(exam.id)}
                            onChange={() => handleSelectForComparison(exam.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            title="Selecionar para comparação"
                          />
                          <Link 
                            to={`/exame/${exam.id}`}
                            className="flex-1 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-3 rounded-lg flex items-center justify-between group"
                          >
                            <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">
                              {exam.examDate.split('-').reverse().join('/')}
                              {exam.examCategory === 'ocupacional' && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">ASO</span>}
                            </span>
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full group-hover:bg-indigo-100 transition-colors">
                              Ver Laudo
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )})}
            {patients?.length === 0 && (
              <div className="text-center text-muted-foreground py-8">Nenhum paciente encontrado.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Exclusão */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">Arquivar ou excluir paciente</h2>
            </div>

            <p className="text-slate-600 mb-3 text-sm">
              Arquivar oculta o paciente das listas e de novos exames e agendamentos, mantendo exames, anamneses e laudos guardados e sincronizados. O arquivamento pode ser desfeito.
            </p>
            <p className={`mb-4 text-sm rounded-xl p-3 border ${deletionStatus?.allowed ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{deletionStatus?.reason}</p>
            <Button type="button" onClick={() => editingPatientId && setArchived(editingPatientId, true)} className="w-full mb-4 gap-2 bg-slate-800 hover:bg-slate-900 text-white">
              <Archive className="w-4 h-4" /> Arquivar paciente (recomendado)
            </Button>

            {deletionStatus?.allowed && <>
            <p className="text-slate-600 mb-4 font-medium text-sm">
              Exclusão definitiva: <strong className="text-slate-900">todos</strong> os dados, laudos e exames vinculados serão apagados e não poderão ser recuperados. Exporte os documentos antes, se precisar deles.
            </p>
            <div className="space-y-2 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-semibold text-slate-700 block">
                Para confirmar, digite a palavra <span className="font-mono bg-white px-1 border rounded text-red-600">DELETAR</span> abaixo:
              </label>
              <Input 
                value={deleteConfirmationText} 
                onChange={(e) => setDeleteConfirmationText(e.target.value.toUpperCase())}
                placeholder="DELETAR"
                className="font-mono text-center tracking-widest uppercase border-red-200 focus-visible:ring-red-500"
                autoFocus
              />
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteConfirmationText('');
              }}>
                Desistir de deletar
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleteConfirmationText !== 'DELETAR'}
                className="bg-red-600 hover:bg-red-700"
              >
                Sim, excluir tudo
              </Button>
            </div>
            </>}
            {!deletionStatus?.allowed && <div className="flex justify-end"><Button type="button" variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setDeleteConfirmationText(''); }}>Cancelar</Button></div>}
          </div>
        </div>
      )}

      {/* Modal de Agendamentos */}
      {viewingAppointmentsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Agendamentos</h2>
                  <p className="text-xs text-slate-500">{viewingAppointmentsFor.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingAppointmentsFor(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {(() => {
                const patientAppointments = allAppointments?.filter(a => a.patientId === viewingAppointmentsFor.id || (a.patientName && a.patientName === viewingAppointmentsFor.name))
                  .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

                if (!patientAppointments || patientAppointments.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-400" />
                      <p>Nenhum agendamento encontrado para este paciente.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {patientAppointments.map(app => (
                      <div key={app.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-white hover:border-blue-200 transition-colors flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-800">
                            {app.date.split('-').reverse().join('/')} às {app.time}
                          </div>
                          <div>
                            {app.status === 'completed' && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Concluído</span>}
                            {app.status === 'canceled' && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Cancelado</span>}
                            {app.status === 'scheduled' && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Agendado</span>}
                          </div>
                        </div>
                        <div className="text-sm text-slate-500 font-medium">{app.type}</div>
                        {app.notes && <div className="text-xs text-slate-400 mt-1 italic">{app.notes}</div>}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button variant="outline" onClick={() => setViewingAppointmentsFor(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
