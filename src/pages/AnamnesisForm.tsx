import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Anamnesis } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { syncManager } from '@/lib/syncManager';
import { customAlert } from '@/lib/dialogs';
import { useAuth } from '@/contexts/AuthContext';

export default function AnamnesisForm() {
  const { user } = useAuth();
  const { patientId, anamnesisId } = useParams();
  const navigate = useNavigate();
  
  const patient = useLiveQuery(() => patientId ? db.patients.get(patientId) : undefined, [patientId]);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [anamnesis, setAnamnesis] = useState<Partial<Anamnesis>>({
    examDate: new Date().toISOString().split('T')[0],
    noiseExposure: '', chemicalExposure: '', ppe: '',
    tinnitus: '', dizziness: '', earache: '', hearingDifficulty: '',
    familyHistory: '', diabetes: '', hypertension: ''
  });

  useEffect(() => {
    if (anamnesisId) {
      db.anamneses.get(anamnesisId).then(existing => {
        if (existing) setAnamnesis(existing);
      });
    } else if (patientId) {
      setAnamnesis(prev => ({ ...prev, patientId }));
    }
  }, [anamnesisId, patientId]);

  const handleSave = async () => {
    if (!anamnesis.patientId) {
      await customAlert('Paciente inválido.');
      return;
    }
    
    setSaveStatus('saving');
    
    const dataToSave = {
      ...anamnesis,
      id: anamnesis.id || crypto.randomUUID(),
      createdAt: anamnesis.createdAt || Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
      user_id: user?.id
    } as Anamnesis;

    try {
      await db.anamneses.put(dataToSave);
      syncManager.sync(); // Trigger cloud sync immediately
      
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        if (!anamnesisId) {
          navigate(`/anamnese/${dataToSave.id}`, { replace: true });
        }
      }, 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const YesNoSelect = ({ value, onChange, label }: any) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <select 
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Selecione...</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/pacientes">
          <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Ficha de Anamnese</h1>
          <p className="text-muted-foreground mt-1">
            {patient?.name} {patient?.cpf ? `(${patient.cpf})` : ''}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {saveStatus === 'success' && <span className="text-emerald-600 flex items-center gap-1 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> Salvo!</span>}
          {saveStatus === 'error' && <span className="text-red-600 flex items-center gap-1 text-sm font-medium"><AlertCircle className="w-4 h-4" /> Erro</span>}
          <Button onClick={handleSave} disabled={saveStatus === 'saving'} className="gap-2">
            <Save className="w-4 h-4" /> {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Anamnese'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Dados Ocupacionais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa</label>
                <Input value={anamnesis.company || ''} onChange={e => setAnamnesis({...anamnesis, company: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Função</label>
                <Input value={anamnesis.role || ''} onChange={e => setAnamnesis({...anamnesis, role: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Setor</label>
                <Input value={anamnesis.sector || ''} onChange={e => setAnamnesis({...anamnesis, sector: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tempo na Empresa</label>
                <Input placeholder="Ex: 2 anos" value={anamnesis.timeAtCompany || ''} onChange={e => setAnamnesis({...anamnesis, timeAtCompany: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jornada (Horas diárias)</label>
                <Input placeholder="Ex: 8 horas" value={anamnesis.dailyHours || ''} onChange={e => setAnamnesis({...anamnesis, dailyHours: e.target.value})} />
              </div>
            </div>

            <div className="border-t pt-4 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <YesNoSelect label="Exposição a Ruído?" value={anamnesis.noiseExposure} onChange={(v: string) => setAnamnesis({...anamnesis, noiseExposure: v as any})} />
              <YesNoSelect label="Exposição a Químicos?" value={anamnesis.chemicalExposure} onChange={(v: string) => setAnamnesis({...anamnesis, chemicalExposure: v as any})} />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Uso de EPI (Protetor)</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={anamnesis.ppe || ''}
                  onChange={e => setAnamnesis({...anamnesis, ppe: e.target.value as any})}
                >
                  <option value="">Selecione...</option>
                  <option value="concha">Concha</option>
                  <option value="plug">Plug</option>
                  <option value="outro">Outro</option>
                  <option value="nenhum">Nenhum</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tempo de uso do EPI</label>
                <Input placeholder="Ex: Todo o turno" value={anamnesis.ppeTime || ''} onChange={e => setAnamnesis({...anamnesis, ppeTime: e.target.value})} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Histórico Clínico e Antecedentes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <YesNoSelect label="Dificuldade para ouvir?" value={anamnesis.hearingDifficulty} onChange={(v: string) => setAnamnesis({...anamnesis, hearingDifficulty: v as any})} />
              <YesNoSelect label="Zumbido?" value={anamnesis.tinnitus} onChange={(v: string) => setAnamnesis({...anamnesis, tinnitus: v as any})} />
              <YesNoSelect label="Tontura/Vertigem?" value={anamnesis.dizziness} onChange={(v: string) => setAnamnesis({...anamnesis, dizziness: v as any})} />
              <YesNoSelect label="Dor de ouvido?" value={anamnesis.earache} onChange={(v: string) => setAnamnesis({...anamnesis, earache: v as any})} />
              <YesNoSelect label="Histórico Familiar de Surdez?" value={anamnesis.familyHistory} onChange={(v: string) => setAnamnesis({...anamnesis, familyHistory: v as any})} />
              <YesNoSelect label="Diabetes?" value={anamnesis.diabetes} onChange={(v: string) => setAnamnesis({...anamnesis, diabetes: v as any})} />
              <YesNoSelect label="Hipertensão?" value={anamnesis.hypertension} onChange={(v: string) => setAnamnesis({...anamnesis, hypertension: v as any})} />
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cirurgias (Principalmente ouvido/nariz/garganta)</label>
                <Input placeholder="Qual e quando?" value={anamnesis.surgery || ''} onChange={e => setAnamnesis({...anamnesis, surgery: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Observações Adicionais</label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Anotações extras..."
                  value={anamnesis.notes || ''}
                  onChange={e => setAnamnesis({...anamnesis, notes: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
