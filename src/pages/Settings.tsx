import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db, Settings as SettingsType } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Download, Upload, CheckCircle2, AlertCircle, Trash2, AlertTriangle, ShieldCheck, ExternalLink, Loader2, CreditCard } from 'lucide-react';
import { syncManager } from '@/lib/syncManager';
import { customAlert } from '@/lib/dialogs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isConfigured as isSupabaseConfigured } from '@/lib/supabase';
import { downloadFullBackup } from '@/lib/backup';
import { customConfirm } from '@/lib/dialogs';

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

  const [activeTab, setActiveTab] = useState<'profissional' | 'clinica' | 'contato' | 'endereco' | 'assinatura'>('profissional');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  // Res. CFFa 777/2025, arts. 7º e 8º: a guarda do prontuário é do profissional. Antes de apagar a conta, exige-se
  // a cópia completa exportada nesta sessão e a declaração de que o profissional mantém a guarda.
  const [backupExported, setBackupExported] = useState(false);
  const [custodyAcknowledged, setCustodyAcknowledged] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { user, logout } = useAuth();

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
        syncStatus: 'pending' as const,
        user_id: user?.id
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
      await downloadFullBackup();
      setBackupExported(true);
    } catch(e) {
      console.error("Export error", e);
      await customAlert('Não foi possível gerar a cópia completa. Tente novamente.');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!await customConfirm('Importar este backup substitui todos os pacientes, exames, anamneses, agenda e configurações deste dispositivo. Os registros importados serão enviados para a nuvem. Continuar?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImportStatus('loading');
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.patients || !data.audiometries) {
        throw new Error("Arquivo de backup inválido.");
      }

      await db.transaction('rw', db.patients, db.audiometries, db.settings, db.appointments, db.anamneses, async () => {
        await db.patients.clear();
        await db.audiometries.clear();
        await db.settings.clear();
        await db.appointments.clear();
        await db.anamneses.clear();

        // Marca tudo como pendente: registros importados como "synced" seriam apagados na próxima
        // reconciliação com a nuvem (pullFromSupabase remove locais sincronizados que não existem lá).
        const pending = (rows: any[] | undefined) => (rows || []).map(row => ({ ...row, syncStatus: 'pending' as const }));
        if (data.patients?.length) await db.patients.bulkAdd(pending(data.patients));
        if (data.audiometries?.length) await db.audiometries.bulkAdd(pending(data.audiometries));
        if (data.settings?.length) await db.settings.bulkAdd(pending(data.settings));
        if (data.appointments?.length) await db.appointments.bulkAdd(pending(data.appointments));
        if (data.anamneses?.length) await db.anamneses.bulkAdd(pending(data.anamneses));
      });

      setImportStatus('success');
      syncManager.sync();
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
      <div className="flex flex-wrap gap-2 mb-4">
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
        <button 
          onClick={() => setActiveTab('assinatura')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'assinatura' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          Assinatura
        </button>
      </div>

      <Card className="rounded-[2rem] border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <CardTitle className="text-xl">
            {activeTab === 'profissional' && 'Dados do Profissional'}
            {activeTab === 'clinica' && 'Dados da Clínica'}
            {activeTab === 'contato' && 'Contato e Redes Sociais'}
            {activeTab === 'endereco' && 'Endereço Completo'}
            {activeTab === 'assinatura' && 'Gestão de Assinatura'}
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

          {activeTab === 'assinatura' && (
            <div className="space-y-6">
              <div className={`rounded-2xl p-6 text-white shadow-md relative overflow-hidden ${
                user?.subscriptionStatus === 'active' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' :
                user?.subscriptionStatus === 'canceled' ? 'bg-gradient-to-r from-amber-500 to-yellow-600' :
                user?.subscriptionStatus === 'past_due' ? 'bg-gradient-to-r from-red-600 to-rose-600' :
                'bg-gradient-to-r from-slate-600 to-slate-800'
              }`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CreditCard className="w-32 h-32" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-3 backdrop-blur-sm">
                      {user?.subscriptionStatus === 'active' ? <><CheckCircle2 className="w-3.5 h-3.5" /> Assinatura Ativa</> :
                       user?.subscriptionStatus === 'canceled' ? <><AlertTriangle className="w-3.5 h-3.5" /> Assinatura Cancelada</> :
                       user?.subscriptionStatus === 'past_due' ? <><AlertCircle className="w-3.5 h-3.5" /> Pagamento Atrasado</> :
                       <><AlertCircle className="w-3.5 h-3.5" /> Sem Assinatura</>}
                    </div>
                    <h3 className="text-2xl font-bold">AudioDash Pro</h3>
                    <p className="text-white/80 mt-1">
                      {user?.subscriptionStatus === 'active' ? 'Acesso ilimitado a todos os recursos da plataforma.' :
                       user?.subscriptionStatus === 'canceled' ? 'Sua assinatura foi cancelada, mas você ainda tem acesso até o fim do período.' :
                       user?.subscriptionStatus === 'past_due' ? 'Há um problema com seu último pagamento. Regularize para não perder o acesso.' :
                       'Assine para liberar os recursos da plataforma.'}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-3xl font-bold">R$ 50,00<span className="text-lg font-normal text-white/70">/mês</span></div>
                    <p className="text-sm text-white/80 mt-1">
                      {user?.subscriptionEndDate 
                        ? `Válida até: ${new Date(user.subscriptionEndDate).toLocaleDateString('pt-BR')}` 
                        : 'Não informada'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h4 className="font-semibold text-slate-900">Portal do Cliente</h4>
                  <p className="text-sm text-slate-500 mt-1 max-w-md">
                    Acesse o portal do Dodo Payments para alterar seu plano, atualizar a forma de pagamento, visualizar o histórico de faturas ou cancelar sua assinatura.
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    const portal = import.meta.env.VITE_DODO_CUSTOMER_PORTAL_URL;
                    if (portal) window.open(portal, '_blank', 'noopener');
                    else window.location.href = `mailto:contato@audiodash.com.br?subject=${encodeURIComponent('Gerenciar/cancelar assinatura AudioDash')}&body=${encodeURIComponent(`Conta: ${user?.email || ''}`)}`;
                  }}
                  className="w-full md:w-auto bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Gerenciar Assinatura
                </Button>
              </div>
            </div>
          )}

          {activeTab !== 'assinatura' && (
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
          )}
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

      {/* LGPD — Exclusão de Dados */}
      <Card className="rounded-[2rem] border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Privacidade e Dados (LGPD)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode excluir sua conta e os dados
              armazenados no AudioDash. Como responsável pelo prontuário, você deve manter a guarda dos registros dos pacientes
              (Res. CFFa 777/2025, arts. 7º e 8º): por isso, a exclusão exige antes a exportação da cópia completa (backup).
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/termos"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              Termos de Uso
            </Link>
            <Link
              to="/privacidade"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              Política de Privacidade
            </Link>
          </div>

          {!showDeleteSection ? (
            <button
              onClick={() => setShowDeleteSection(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Solicitar exclusão dos meus dados
            </button>
          ) : (
            <div className="border border-red-200 bg-red-50/50 rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-red-900 text-sm">Zona de Perigo</h4>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    Essa ação é <strong>irreversível</strong>. Todos os dados do seu consultório, pacientes, exames 
                    e laudos serão permanentemente excluídos do nosso sistema. 
                    O prontuário fonoaudiológico deve ser guardado pelo profissional (Res. CFFa 777/2025, art. 8º — prontuário eletrônico de guarda permanente, com eliminação possível após 20 anos do último registro). Exporte a cópia completa e guarde-a em local seguro antes de prosseguir.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-red-900">
                <Button variant="outline" onClick={handleExport} className="rounded-xl border-red-200 gap-2">
                  <Download className="w-4 h-4" /> {backupExported ? 'Cópia completa exportada — exportar novamente' : '1. Exportar cópia completa (JSON)'}
                </Button>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={custodyAcknowledged} disabled={!backupExported} onChange={e => setCustodyAcknowledged(e.target.checked)} className="mt-0.5" />
                  <span>2. Declaro que mantenho a guarda da cópia exportada dos prontuários pelo prazo exigido (Res. CFFa 777/2025, art. 8º) e que posso fornecê-la aos pacientes quando solicitado (art. 11).</span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteSection(false)}
                  className="rounded-xl border-slate-200"
                >
                  Cancelar
                </Button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={!backupExported || !custodyAcknowledged}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  3. Excluir conta e dados
                </button>
              </div>
            </div>
          )}

          {deleteStatus === 'success' && (
            <div className="flex items-center justify-center text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span className="font-medium text-sm">Dados excluídos deste dispositivo e da nuvem. Você será desconectado em instantes.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirmar exclusão de dados</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Digite <strong className="text-red-600">EXCLUIR</strong> abaixo para confirmar.
                </p>
              </div>
            </div>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Digite EXCLUIR"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all mb-4 text-sm font-mono"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmText !== 'EXCLUIR' || !backupExported || !custodyAcknowledged) return;
                  setIsDeleting(true);
                  try {
                    // Clear all local data
                    await Promise.all([
                      db.patients.clear(),
                      db.audiometries.clear(),
                      db.anamneses.clear(),
                      db.appointments.clear(),
                      db.settings.clear()
                    ]);

                    // If Supabase is configured, delete server-side data
                    if (isSupabaseConfigured && supabase && user) {
                      // Delete user data from all tables
                      await supabase.from('patients').delete().eq('user_id', user.id);
                      await supabase.from('audiometries').delete().eq('user_id', user.id);
                      await supabase.from('anamneses').delete().eq('user_id', user.id);
                      await supabase.from('appointments').delete().eq('user_id', user.id);
                      await supabase.from('settings').delete().eq('user_id', user.id);
                    }

                    setDeleteStatus('success');
                    setShowDeleteModal(false);
                    setShowDeleteSection(false);
                    setDeleteConfirmText('');

                    // Log the user out after a brief delay so they can see the success message
                    setTimeout(() => {
                      logout(true);
                    }, 3000);
                  } catch (err) {
                    console.error('Data deletion error:', err);
                    setDeleteStatus('error');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={deleteConfirmText !== 'EXCLUIR' || isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Excluir tudo</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
