import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Patient } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, FileText, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

function calculateAge(birthDate: string) {
  if (!birthDate) return '';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    name: '', cpf: '', birthDate: '', gender: '', occupation: '', phone: '', notes: ''
  });

  const patients = useLiveQuery(
    () => db.patients
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.cpf.includes(searchTerm))
            .reverse()
            .toArray(),
    [searchTerm]
  );

  const allExams = useLiveQuery(() => db.audiometries.toArray(), []);
  const allAnamneses = useLiveQuery(() => db.anamneses.toArray(), []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      await db.patients.add({ 
        ...newPatient, 
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending'
      } as Patient);
      setIsCreating(false);
      setNewPatient({ name: '', cpf: '', birthDate: '', gender: '', occupation: '', phone: '', notes: '' });
    } catch (err) {
      alert("Erro ao cadastrar paciente.");
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
        <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Paciente
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar Novo Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
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
                      {newPatient.birthDate ? `${calculateAge(newPatient.birthDate)} anos` : '--'}
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
                  <label className="text-sm font-medium">Telefone</label>
                  <Input maxLength={15} type="tel" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: formatPhone(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Profissão</label>
                  <Input value={newPatient.occupation} onChange={e => setNewPatient({...newPatient, occupation: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                <Button type="submit">Salvar Paciente</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
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
          <div className="divide-y">
            {patients?.map(p => {
              const patientExams = allExams?.filter(e => e.patientId === p.id).sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime()) || [];
              const patientAnamneses = allAnamneses?.filter(a => a.patientId === p.id).sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime()) || [];
              return (
              <div key={p.id} className="py-4 flex flex-col gap-2">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      CPF: {p.cpf || 'Não informado'} • Idade: {calculateAge(p.birthDate)} anos
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/evolution/${p.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800">
                        <Activity className="h-4 w-4" /> PCA
                      </Button>
                    </Link>
                    <Link to={`/anamnesis/new/${p.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800">
                        <FileText className="h-4 w-4" /> Nova Anamnese
                      </Button>
                    </Link>
                    <Link to={`/exam/new/${p.id}`}>
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
                          to={`/anamnesis/${anam.id}`}
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
                        <Link to={`/compare/${selectedForComparison[0]}/${selectedForComparison[1]}`}>
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
                            to={`/exam/${exam.id}`}
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
    </div>
  );
}
