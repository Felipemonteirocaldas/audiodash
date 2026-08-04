import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db, Settings as SettingsType } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { syncManager } from '@/lib/syncManager';
import { customAlert } from '@/lib/dialogs';

export default function Settings() {
  const [settings, setSettings] = useState<Partial<SettingsType>>({
    clinicName: '',
    corporateName: '',
    cnpj: '',
    professionalName: '',
    crfaNumber: '',
    cpf: '',
    specialty: '',
    phone: '',
    email: '',
    website: '',
    instagram: '',
    address: '',
    zipCode: '',
    state: '',
    city: '',
    neighborhood: '',
    logoUrl: ''
  });

  const [activeTab, setActiveTab] = useState<'profissional' | 'clinica' | 'contato' | 'endereco'>('profissional');

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
        await db.settings.add({ ...newSettings, id: 'settings_1' } as SettingsType);
      }
      // Trigger cloud sync immediately and check for errors
      await syncManager.sync();
      
      if (syncManager.lastError) {
        await customAlert("Erro detalhado do Supabase: " + syncManager.lastError);
        setSaveStatus('error');
      } else {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
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
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações do Consultório</h1>
        <p className="text-slate-500 mt-1">Gerencie os dados da clínica e o armazenamento do sistema.</p>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-2 mb-4 scrollbar-hide">
        <button 
          onClick={() => setActiveTab('profissional')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profissional' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          Profissional
        </button>
        <button 
          onClick={() => setActiveTab('clinica')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'clinica' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          Clínica
        </button>
        <button 
          onClick={() => setActiveTab('contato')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'contato' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          Contato & Redes
        </button>
        <button 
          onClick={() => setActiveTab('endereco')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'endereco' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          Endereço
        </button>
      </div>

      <Card className="rounded-[2rem] border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <CardTitle className="text-xl">
            {activeTab === 'profissional' && 'Dados do Profissional'}
            {activeTab === 'clinica' && 'Dados da Clínica'}
            {activeTab === 'contato' && 'Contato e Redes Sociais'}
            {activeTab === 'endereco' && 'Endereço Completo'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          {activeTab === 'profissional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Profissional</label>
                <Input value={settings.professionalName || ''} onChange={e => setSettings({...settings, professionalName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Especialidade</label>
                <Input placeholder="Ex: Fonoaudiólogo(a) Clínico(a)" value={settings.specialty || ''} onChange={e => setSettings({...settings, specialty: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nº CRFa</label>
                <Input value={settings.crfaNumber || ''} onChange={e => setSettings({...settings, crfaNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CPF do Profissional</label>
                <Input placeholder="000.000.000-00" value={settings.cpf || ''} onChange={e => setSettings({...settings, cpf: e.target.value})} />
              </div>
            </div>
          )}

          {activeTab === 'clinica' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Fantasia (Clínica)</label>
                  <Input value={settings.clinicName || ''} onChange={e => setSettings({...settings, clinicName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Razão Social</label>
                  <Input value={settings.corporateName || ''} onChange={e => setSettings({...settings, corporateName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CNPJ</label>
                  <Input placeholder="00.000.000/0001-00" value={settings.cnpj || ''} onChange={e => setSettings({...settings, cnpj: e.target.value})} />
                </div>
              </div>
              
              <div className="space-y-3 pb-2 border-t border-slate-100 pt-6">
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
            </div>
          )}

          {activeTab === 'contato' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone / WhatsApp</label>
                <Input placeholder="(00) 00000-0000" value={settings.phone || ''} onChange={e => setSettings({...settings, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail Comercial</label>
                <Input placeholder="contato@clinica.com.br" value={settings.email || ''} onChange={e => setSettings({...settings, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Website</label>
                <Input placeholder="www.clinica.com.br" value={settings.website || ''} onChange={e => setSettings({...settings, website: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instagram</label>
                <Input placeholder="@suaclinica" value={settings.instagram || ''} onChange={e => setSettings({...settings, instagram: e.target.value})} />
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-sm font-medium">CEP</label>
                  <Input placeholder="00000-000" value={settings.zipCode || ''} onChange={e => setSettings({...settings, zipCode: e.target.value})} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Endereço (Rua, Número, Complemento)</label>
                  <Input value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bairro</label>
                  <Input value={settings.neighborhood || ''} onChange={e => setSettings({...settings, neighborhood: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cidade</label>
                  <Input value={settings.city || ''} onChange={e => setSettings({...settings, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado (UF)</label>
                  <Input placeholder="SP" value={settings.state || ''} onChange={e => setSettings({...settings, state: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 mt-4 border-t border-slate-100 flex items-center justify-between">
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
              O AudioDash sincroniza automaticamente seus dados com a nuvem (Supabase) para mantê-los seguros. No entanto, por segurança extra ou para uso <b>offline</b>, você também pode exportar e importar arquivos de backup manuais (.json) contendo todos os seus pacientes e laudos.
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
