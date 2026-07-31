import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db, Settings as SettingsType } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Download, Upload, CheckCircle2, AlertCircle, Database, RefreshCw, Cloud } from 'lucide-react';
import { syncManager } from '@/lib/syncManager';
import { isConfigured as supabaseConfigured } from '@/lib/supabase';

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
  const logoInputRef = useRef<HTMLInputElement>(null);

  const savedSettings = useLiveQuery(() => db.settings.get('settings_1'));

  useEffect(() => {
    if (savedSettings) {
      setSettings(prev => ({...prev, ...savedSettings}));
    }
  }, [savedSettings]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings({ ...settings, logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

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
          <div className="space-y-3 pb-2 border-b border-slate-100 mb-4">
            <label className="text-sm font-medium">Logo da Empresa</label>
            <div className="flex items-center gap-5">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-slate-400 font-medium text-center px-2">Sem logo</span>
                )}
              </div>
              <div className="flex flex-col items-start gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={logoInputRef} 
                  onChange={handleLogoUpload} 
                  className="hidden" 
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => logoInputRef.current?.click()}
                    className="rounded-xl border-slate-200 shadow-sm bg-white"
                    type="button"
                  >
                    <Upload className="w-4 h-4 mr-2 text-slate-500" />
                    Anexar Logo
                  </Button>
                  {settings.logoUrl && (
                    <Button 
                      variant="ghost" 
                      onClick={() => setSettings({ ...settings, logoUrl: '' })}
                      className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                      type="button"
                    >
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">Recomendado: PNG ou JPG com fundo transparente.</p>
              </div>
            </div>
          </div>

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

      {/* Supabase Connection Diagnostics */}
      <Card className="rounded-[2rem] border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <CardTitle className="text-xl flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-500" />
            Banco de Dados Online (Supabase)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <SupabaseDiagnostics />
        </CardContent>
      </Card>
    </div>
  );
}

function SupabaseDiagnostics() {
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [syncState, setSyncState] = useState({ status: syncManager.status, error: syncManager.lastError });

  useEffect(() => {
    const handleSyncStatusChange = () => {
      setSyncState({ status: syncManager.status, error: syncManager.lastError });
    };
    window.addEventListener('sync-status-change', handleSyncStatusChange);
    return () => window.removeEventListener('sync-status-change', handleSyncStatusChange);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await syncManager.testConnection();
      setTestResult(result);
    } catch {
      setTestResult({ ok: false, error: 'Falha inesperada ao testar conexão.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleForceSync = async () => {
    await syncManager.sync();
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '(não definido)';

  return (
    <>
      {/* Status atual */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${supabaseConfigured ? 'bg-green-100' : 'bg-amber-100'}`}>
          <Database className={`w-5 h-5 ${supabaseConfigured ? 'text-green-600' : 'text-amber-600'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm text-slate-900">
              {supabaseConfigured ? 'Supabase Configurado' : 'Supabase Não Configurado'}
            </h4>
            <span className={`w-2 h-2 rounded-full ${supabaseConfigured ? 'bg-green-500' : 'bg-amber-500'}`}></span>
          </div>
          <p className="text-xs text-slate-500 break-all">
            URL: <code className="bg-slate-200/60 px-1.5 py-0.5 rounded text-[11px]">{supabaseUrl}</code>
          </p>
        </div>
      </div>

      {/* Resultado do teste */}
      {testResult && (
        <div className={`p-4 rounded-xl border ${testResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-3">
            {testResult.ok ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className={`font-semibold text-sm ${testResult.ok ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.ok ? 'Conexão OK!' : 'Falha na conexão'}
              </h4>
              <p className={`text-xs mt-1 ${testResult.ok ? 'text-green-700' : 'text-red-700'}`}>
                {testResult.ok 
                  ? 'O Supabase está acessível e as tabelas foram encontradas.' 
                  : testResult.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={isTesting}
          className="rounded-xl h-auto py-4 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        >
          <RefreshCw className={`w-5 h-5 mr-2 text-slate-500 ${isTesting ? 'animate-spin' : ''}`} />
          <div className="text-left">
            <div className="font-semibold">{isTesting ? 'Testando...' : 'Testar Conexão'}</div>
            <div className="text-xs text-slate-500 font-normal">Verificar acesso ao Supabase</div>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={handleForceSync}
          className="rounded-xl h-auto py-4 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        >
          <Cloud className="w-5 h-5 mr-2 text-slate-500" />
          <div className="text-left">
            <div className="font-semibold">Forçar Sincronização</div>
            <div className="text-xs text-slate-500 font-normal">Enviar dados pendentes</div>
          </div>
        </Button>
      </div>

      {/* Sync Error Display */}
      {syncState.status === 'error' && syncState.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <h4 className="font-semibold text-sm text-red-800 mb-1">Detalhes do erro de Sincronização:</h4>
          <code className="text-xs text-red-700 block whitespace-pre-wrap">{syncState.error}</code>
        </div>
      )}

      {/* Info box */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <p className="text-sm font-medium text-indigo-900/80 leading-relaxed">
          O Supabase é usado como backup na nuvem. Seus dados são salvos primeiro <b>localmente</b> (IndexedDB) e depois sincronizados automaticamente quando há internet. 
          Mesmo sem Supabase, o app funciona 100% offline.
        </p>
      </div>
    </>
  );
}
