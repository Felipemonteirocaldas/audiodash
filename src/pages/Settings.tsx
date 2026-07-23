import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db, Settings as SettingsType } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<Partial<SettingsType>>({
    clinicName: '',
    professionalName: '',
    crfaNumber: '',
    phone: '',
    address: '',
    logoUrl: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const savedSettings = useLiveQuery(() => db.settings.get('settings_1'));

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const now = Date.now();
      const newSettings = {
        ...settings,
        updatedAt: now,
        syncStatus: 'pending' as const
      };
      
      if (savedSettings?.id) {
        await db.settings.update('settings_1', newSettings);
      } else {
        await db.settings.add({ ...newSettings, id: 'settings_1', createdAt: now } as SettingsType & { createdAt: number });
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = {
        patients: await db.patients.toArray(),
        audiometries: await db.audiometries.toArray(),
        settings: await db.settings.toArray()
      };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audiodash_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) {
      console.error("Export error", e);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.patients || !data.audiometries) {
        throw new Error("Arquivo de backup inválido.");
      }

      await db.transaction('rw', db.patients, db.audiometries, db.settings, async () => {
        await db.patients.clear();
        await db.audiometries.clear();
        await db.settings.clear();

        if (data.patients.length > 0) await db.patients.bulkAdd(data.patients);
        if (data.audiometries.length > 0) await db.audiometries.bulkAdd(data.audiometries);
        if (data.settings.length > 0) await db.settings.bulkAdd(data.settings);
      });

      setImportStatus('success');
      setTimeout(() => setImportStatus('idle'), 3000);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (e) {
      console.error(e);
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 4000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações do Consultório</h1>
        <p className="text-slate-500 mt-1">Gerencie os dados da clínica e o armazenamento do sistema.</p>
      </div>
      
      <Card className="rounded-[2rem] border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <CardTitle className="text-xl">Dados do Profissional e Clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Clínica</label>
            <Input 
              value={settings.clinicName} 
              onChange={e => setSettings({...settings, clinicName: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Profissional</label>
            <Input 
              value={settings.professionalName} 
              onChange={e => setSettings({...settings, professionalName: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nº CRFa</label>
            <Input 
              value={settings.crfaNumber} 
              onChange={e => setSettings({...settings, crfaNumber: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone</label>
            <Input 
              value={settings.phone} 
              onChange={e => setSettings({...settings, phone: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Endereço Completo</label>
            <Input 
              value={settings.address} 
              onChange={e => setSettings({...settings, address: e.target.value})} 
            />
          </div>
          <div className="pt-4 flex items-center justify-between">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-8 py-6 h-auto text-base"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
            
            {saveStatus === 'success' && (
              <div className="flex items-center text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span className="font-medium text-sm">Salvo com sucesso!</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-medium text-sm">Erro ao salvar</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <CardTitle className="text-xl">Backup de Dados (Offline)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
            <p className="text-sm font-medium text-indigo-900/80 leading-relaxed">
              Como o AudioDash é 100% offline, todos os seus pacientes e laudos ficam salvos apenas na memória <b>deste navegador</b>. 
              Para não perder seus dados, recomendamos que você exporte um Backup JSON regularmente e guarde na nuvem (Google Drive, iCloud, etc).
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={handleExport} 
              className="rounded-xl h-auto py-4 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            >
              <Download className="w-5 h-5 mr-2 text-slate-500" />
              <div className="text-left">
                <div className="font-semibold">Exportar Backup</div>
                <div className="text-xs text-slate-500 font-normal">Baixar arquivo .json</div>
              </div>
            </Button>

            <div>
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleImport} 
                className="hidden" 
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={importStatus === 'loading'}
                className="w-full rounded-xl h-auto py-4 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              >
                <Upload className="w-5 h-5 mr-2 text-slate-500" />
                <div className="text-left">
                  <div className="font-semibold">Importar Backup</div>
                  <div className="text-xs text-slate-500 font-normal">Restaurar dados</div>
                </div>
              </Button>
            </div>
          </div>

          {importStatus === 'success' && (
            <div className="mt-4 flex items-center justify-center text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span className="font-medium">Backup restaurado com sucesso!</span>
            </div>
          )}
          {importStatus === 'error' && (
            <div className="mt-4 flex items-center justify-center text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Erro ao ler arquivo. Verifique se é um backup válido.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
