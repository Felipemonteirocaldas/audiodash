import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Patient } from '@/db/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
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

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
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
                  <Input value={newPatient.cpf} onChange={e => setNewPatient({...newPatient, cpf: e.target.value})} />
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
                  <Input type="tel" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
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
            {patients?.map(p => (
              <div key={p.id} className="py-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    CPF: {p.cpf || 'Não informado'} • Idade: {calculateAge(p.birthDate)} anos
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/exam/new/${p.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" /> Novo Exame
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {patients?.length === 0 && (
              <div className="text-center text-muted-foreground py-8">Nenhum paciente encontrado.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
