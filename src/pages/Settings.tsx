import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db, type Settings as SettingsType } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Download, Upload, CheckCircle2, AlertCircle, Trash2, AlertTriangle, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import { syncManager } from '@/lib/syncManager';
import { customAlert, customConfirm } from '@/lib/dialogs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isConfigured as isSupabaseConfigured } from '@/lib/supabase';
import {
  BACKUP_TABLE_LABELS,
  BackupError,
  countLocalRecords,
  describeCounts,
  downloadFullBackup,
  getLastBackupAt,
  parseBackup,
  restoreBackup,
  type BackupCounts
} from '@/lib/backup';
import { formatCEP, formatCNPJ, formatCPF, formatPhone, validateSettings } from '@/lib/settingsValidation';
import { PLAN_PRICE_LABEL, saveOutcome, subscriptionSummary } from '@/lib/settingsStatus';

type TabId = 'profissional' | 'clinica' | 'contato' | 'endereco' | 'assinatura';

const FIELD_KEYS = ['professionalName', 'specialty', 'crfaNumber', 'cpf', 'clinicName', 'corporateName', 'cnpj', 'logoUrl', 'phone', 'email', 'website', 'instagram', 'zipCode', 'address', 'neighborhood', 'city', 'state'] as const;
type FieldKey = (typeof FIELD_KEYS)[number];
type Form = Record<FieldKey, string>;

const EMPTY_FORM = Object.fromEntries(FIELD_KEYS.map(key => [key, ''])) as Form;
const pickForm = (source: Partial<SettingsType> | undefined): Form => Object.fromEntries(FIELD_KEYS.map(key => [key, (source?.[key] as string | undefined) ?? ''])) as Form;
const trimForm = (form: Form): Form => Object.fromEntries(FIELD_KEYS.map(key => [key, key === 'logoUrl' ? form[key] : form[key].trim()])) as Form;
const serialize = (form: Form) => JSON.stringify(FIELD_KEYS.map(key => form[key]));

const TABS: Array<{ id: TabId; label: string; title: string; fields: FieldKey[] }> = [
  { id: 'profissional', label: 'Profissional', title: 'Dados do profissional', fields: ['professionalName', 'specialty', 'crfaNumber', 'cpf'] },
  { id: 'clinica', label: 'Clínica', title: 'Dados da clínica', fields: ['clinicName', 'corporateName', 'cnpj', 'logoUrl'] },
  { id: 'contato', label: 'Contato e redes', title: 'Contato e redes sociais', fields: ['phone', 'email', 'website', 'instagram'] },
  { id: 'endereco', label: 'Endereço', title: 'Endereço completo', fields: ['zipCode', 'address', 'neighborhood', 'city', 'state'] },
  { id: 'assinatura', label: 'Assinatura', title: 'Assinatura', fields: [] }
];

const LOGO_MAX_SIDE = 600;
const LOGO_MAX_FILE_BYTES = 8 * 1024 * 1024;
const LOGO_MAX_DATA_URL_CHARS = 450_000;
const IMPORT_MAX_BYTES = 200 * 1024 * 1024;

/** Reduz a logo a no máximo 600 px (ela é guardada no aparelho, enviada à nuvem e usada nos PDFs). */
async function prepareLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem (PNG ou JPG).');
  if (file.size > LOGO_MAX_FILE_BYTES) throw new Error('A imagem é muito grande. Use um arquivo de até 8 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
      img.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Não foi possível ler as dimensões da imagem.');
    const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível processar a imagem neste navegador.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const keepsTransparency = ['image/png', 'image/webp', 'image/svg+xml', 'image/gif'].includes(file.type);
    const png = keepsTransparency ? canvas.toDataURL('image/png') : '';
    if (png && png.length <= LOGO_MAX_DATA_URL_CHARS) return png;
    // Foto sem transparência útil, ou PNG pesado demais: JPEG sobre fundo branco.
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const formatDate = (ms: number) => new Date(ms).toLocaleDateString('pt-BR');
const formatDateTime = (ms: number) => new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const countsText = describeCounts;

type FieldProps = { id: string; label: string; error?: string; hint?: string; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;
function Field({ id, label, error, hint, className, ...input }: FieldProps) {
  const noteId = error || hint ? `${id}-note` : undefined;
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <label htmlFor={id} className="text-sm font-medium text-slate-800">{label}</label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={noteId} className={error ? 'border-red-500' : ''} {...input} />
      {error ? <p id={noteId} className="text-xs text-red-700">{error}</p> : hint ? <p id={noteId} className="text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}

type SaveStatus = 'idle' | 'saved' | 'invalid' | 'error';
const CLOUD_TABLES = ['patients', 'audiometries', 'anamneses', 'appointments', 'settings'] as const;

export default function Settings() {
  const { user, logout } = useAuth();
  // Mesma regra do resto do app (menu, painel, exportações): a linha de configurações é a primeira da tabela.
  // undefined = ainda carregando; null = ainda não existe.
  const savedSettings = useLiveQuery(async () => (await db.settings.toCollection().first()) ?? null);

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [baseline, setBaseline] = useState(() => serialize(EMPTY_FORM));
  const baselineFormRef = useRef<Form>(EMPTY_FORM);

  const [activeTab, setActiveTab] = useState<TabId>('profissional');
  const [touched, setTouched] = useState<Set<FieldKey>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveNote, setSaveNote] = useState<{ tone: 'ok' | 'warn'; message: string } | null>(null);
  const [logoError, setLogoError] = useState('');

  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [localCounts, setLocalCounts] = useState<BackupCounts | null>(null);
  const [countsFailed, setCountsFailed] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(() => getLastBackupAt());

  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'success'>('idle');
  const [deleteError, setDeleteError] = useState('');
  // Res. CFFa 777/2025, arts. 7º e 8º: a guarda do prontuário é do profissional. Antes de apagar os dados, exige-se
  // a cópia completa exportada nesta sessão e a declaração de que o profissional mantém a guarda.
  const [backupExported, setBackupExported] = useState(false);
  const [exportedCounts, setExportedCounts] = useState<BackupCounts | null>(null);
  const [custodyAcknowledged, setCustodyAcknowledged] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteModalWasOpen = useRef(false);

  // Dados vindos do banco (inclusive de uma sincronização) entram campo a campo: o que a pessoa já alterou é mantido,
  // o que ela não tocou acompanha o banco. Assim uma atualização remota não é perdida nem apaga o que está sendo digitado.
  useEffect(() => {
    if (savedSettings === undefined) return;
    const incoming = pickForm(savedSettings ?? undefined);
    const previousBaseline = baselineFormRef.current;
    baselineFormRef.current = incoming;
    setBaseline(serialize(incoming));
    setForm(current => Object.fromEntries(FIELD_KEYS.map(key => [key, current[key] === previousBaseline[key] ? incoming[key] : current[key]])) as Form);
  }, [savedSettings]);

  const dirty = serialize(form) !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const refreshLocalCounts = () => { countLocalRecords().then(counts => { setLocalCounts(counts); setCountsFailed(false); }).catch(() => setCountsFailed(true)); };
  useEffect(refreshLocalCounts, []);

  const errors = useMemo(() => validateSettings(form), [form]);
  const visibleError = (key: FieldKey) => (submitted || touched.has(key) ? errors[key] : undefined);
  const tabErrorCount = (tab: (typeof TABS)[number]) => (submitted ? tab.fields.filter(key => errors[key]).length : 0);

  const setField = (key: FieldKey, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
    setSaveNote(null);
  };
  const textField = (key: FieldKey, label: string, extra: Partial<FieldProps> & { format?: (value: string) => string } = {}) => {
    const { format, ...props } = extra;
    return (
      <Field
        key={key}
        id={`settings-${key}`}
        label={label}
        value={form[key]}
        error={visibleError(key)}
        onChange={event => setField(key, format ? format(event.target.value) : event.target.value)}
        onBlur={() => setTouched(prev => new Set(prev).add(key))}
        {...props}
      />
    );
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogoError('');
    try {
      setField('logoUrl', await prepareLogo(file));
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'Não foi possível usar esta imagem.');
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSubmitted(true);
    const invalidTab = TABS.find(tab => tab.fields.some(key => errors[key]));
    if (invalidTab) {
      setActiveTab(invalidTab.id);
      setSaveStatus('invalid');
      return;
    }
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveNote(null);
    const clean = trimForm(form);
    let rowId = 'settings_1';
    try {
      // Leitura e gravação juntas: não depende de a consulta da tela já ter terminado e preserva campos que o formulário não edita.
      await db.transaction('rw', db.settings, async () => {
        const existing = await db.settings.toCollection().first();
        rowId = existing?.id ?? 'settings_1';
        await db.settings.put({ ...existing, ...clean, id: rowId, updatedAt: Date.now(), syncStatus: 'pending', user_id: user?.id ?? existing?.user_id } as SettingsType);
      });
      baselineFormRef.current = clean;
      setBaseline(serialize(clean));
      setForm(clean);
    } catch (error) {
      console.error('Settings save error', error);
      setSaveStatus('error');
      setIsSaving(false);
      return;
    }
    // Os dados já estão salvos no aparelho; a nuvem é uma segunda etapa. O que se informa vem da própria linha salva.
    try {
      await syncManager.sync();
    } catch (error) {
      console.warn('Settings sync error:', error);
    }
    let rowSynced = false;
    try { rowSynced = (await db.settings.get(rowId))?.syncStatus === 'synced'; } catch { /* mantém a mensagem de pendência */ }
    setSaveStatus('saved');
    setSaveNote(saveOutcome(rowSynced, syncManager.status));
    setIsSaving(false);
  };

  const handleDiscard = () => {
    setForm(pickForm(savedSettings ?? undefined));
    setSubmitted(false);
    setTouched(new Set());
    setLogoError('');
    setSaveStatus('idle');
    setSaveNote(null);
  };

  const handleExport = async () => {
    try {
      setExportedCounts(await downloadFullBackup());
      setBackupExported(true);
      setLastBackupAt(getLastBackupAt());
    } catch (error) {
      console.error('Export error', error);
      await customAlert('Não foi possível gerar a cópia completa. Tente novamente.');
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportStatus('loading');
    setImportMessage('');
    try {
      if (file.size > IMPORT_MAX_BYTES) throw new BackupError('O arquivo é grande demais para ser um backup do AudioDash (limite de 200 MB).');
      const parsed = parseBackup(await file.text());
      const current = await countLocalRecords();
      const generated = parsed.exportedAt && !Number.isNaN(Date.parse(parsed.exportedAt)) ? ` (gerado em ${formatDate(Date.parse(parsed.exportedAt))})` : '';
      const orphan = parsed.orphanExams ? ` Atenção: ${parsed.orphanExams} ${parsed.orphanExams === 1 ? 'exame não tem' : 'exames não têm'} o paciente no arquivo.` : '';
      const confirmed = await customConfirm(
        `O arquivo${generated} contém ${countsText(parsed.counts)}. Este aparelho tem hoje ${countsText(current)}. ` +
        `Importar SUBSTITUI tudo o que está neste aparelho. Uma cópia dos dados atuais será baixada antes da troca. Os registros importados serão enviados para a nuvem, que não é esvaziada: o que existir só na nuvem pode voltar para este aparelho no próximo login.${orphan} Continuar?`
      );
      if (!confirmed) {
        setImportStatus('idle');
        return;
      }
      await downloadFullBackup();
      setLastBackupAt(getLastBackupAt());
      await restoreBackup(parsed.rows);
      refreshLocalCounts();
      setImportStatus('success');
      setImportMessage(`Backup restaurado: ${countsText(parsed.counts)}.`);
      syncManager.sync();
    } catch (error) {
      if (!(error instanceof BackupError)) console.error('Import error', error);
      setImportStatus('error');
      setImportMessage(error instanceof BackupError ? `${error.message} Nenhum dado foi alterado.` : 'Não foi possível restaurar o backup. Nenhum dado foi alterado.');
    }
  };

  const deleteAllData = async () => {
    if (isDeleting || deleteConfirmText !== 'EXCLUIR' || !backupExported || !custodyAcknowledged) return;
    setIsDeleting(true);
    setDeleteError('');
    let removedInCloud = 0;
    let stage: 'check' | 'cloud' | 'local' = 'check';
    try {
      if (isSupabaseConfigured && supabase && user) {
        if (!navigator.onLine) throw new Error('offline');
        // A cópia exportada vem do aparelho. Se a nuvem tem registros que a cópia não tem (por exemplo, sincronização
        // incompleta em um aparelho novo), a exclusão apagaria dados sem cópia: bloqueia antes de apagar qualquer coisa.
        const missing: string[] = [];
        for (const table of CLOUD_TABLES) {
          const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', user.id);
          if (error) throw new Error(`${table}: ${error.message}`);
          if ((count ?? 0) > (exportedCounts?.[table] ?? 0)) missing.push(`${BACKUP_TABLE_LABELS[table]}: ${count} na nuvem, ${exportedCounts?.[table] ?? 0} na cópia`);
        }
        if (missing.length) throw new Error(`incomplete:${missing.join('; ')}`);
        // Nuvem primeiro: se ela falhar, os dados do aparelho continuam intactos.
        stage = 'cloud';
        for (const table of CLOUD_TABLES) {
          const { error } = await supabase.from(table).delete().eq('user_id', user.id);
          if (error) throw new Error(`${table}: ${error.message}`);
          removedInCloud++;
        }
      }
      stage = 'local';
      await Promise.all([db.patients.clear(), db.audiometries.clear(), db.anamneses.clear(), db.appointments.clear(), db.settings.clear()]);
      setDeleteStatus('success');
      setShowDeleteModal(false);
      setShowDeleteSection(false);
      setDeleteConfirmText('');
      setTimeout(() => logout(true), 3000);
    } catch (error) {
      console.error('Data deletion error:', error);
      const message = error instanceof Error ? error.message : '';
      setDeleteError(
        message === 'offline' ? 'Sem conexão com a internet. Nada foi apagado. Conecte-se e tente de novo.'
        : message.startsWith('incomplete:') ? `Nada foi apagado. A nuvem tem mais registros do que a cópia exportada (${message.slice('incomplete:'.length)}). Aguarde a sincronização terminar, exporte a cópia de novo e tente outra vez.`
        : stage === 'local' ? 'Os dados da nuvem foram excluídos, mas não foi possível limpar este aparelho. Recarregue a página e tente de novo; a cópia exportada continua válida.'
        : stage === 'check' || removedInCloud === 0 ? 'Não foi possível confirmar ou excluir os dados na nuvem. Nada foi apagado. Tente de novo.'
        : 'A exclusão na nuvem parou no meio. Parte dos dados pode já ter sido removida da nuvem; os dados deste aparelho foram mantidos. Exporte a cópia completa de novo e tente outra vez.'
      );
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    // Ao fechar o modal, o foco volta ao botão que o abriu (e não se perde no corpo da página).
    if (!showDeleteModal && deleteModalWasOpen.current) deleteTriggerRef.current?.focus();
    deleteModalWasOpen.current = showDeleteModal;
    if (!showDeleteModal) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape' && !isDeleting) { setShowDeleteModal(false); setDeleteConfirmText(''); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDeleteModal, isDeleting]);

  // Mantém o Tab dentro do modal de exclusão: do último campo volta ao primeiro e vice-versa.
  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setActiveTab(next.id);
    document.getElementById(`settings-tab-${next.id}`)?.focus();
  };

  const currentTab = TABS.find(tab => tab.id === activeTab)!;

  // Assinatura: o texto depende da data de fim, não só do status.
  const subscription = subscriptionSummary(user?.subscriptionStatus, user?.subscriptionEndDate);
  const subscriptionTone = { ok: 'border-emerald-300 bg-emerald-50 text-emerald-900', warn: 'border-amber-300 bg-amber-50 text-amber-900', danger: 'border-red-300 bg-red-50 text-red-900', neutral: 'border-slate-300 bg-slate-50 text-slate-900' }[subscription.tone];

  return (
    <>
    <div className="max-w-4xl mx-auto space-y-8 pb-12" inert={showDeleteModal}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações do consultório</h1>
        <p className="text-slate-600 mt-1">Dados do profissional e da clínica, assinatura, cópia de segurança e privacidade.</p>
      </div>

      <div role="tablist" aria-label="Seções das configurações" className="flex flex-wrap gap-2">
        {TABS.map((tab, index) => {
          const selected = tab.id === activeTab;
          const count = tabErrorCount(tab);
          return (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls="settings-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={event => onTabKeyDown(event, index)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selected ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
            >
              {tab.label}
              {count > 0 && <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{count}<span className="sr-only"> {count === 1 ? 'campo com erro' : 'campos com erro'}</span></span>}
            </button>
          );
        })}
      </div>

      <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <h2 className="text-xl font-semibold leading-none tracking-tight">{currentTab.title}</h2>
        </CardHeader>
        <CardContent id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${activeTab}`} className="pt-6">
          <form noValidate className="space-y-6" onSubmit={event => { event.preventDefault(); if (activeTab !== 'assinatura') void handleSave(); }}>
          {activeTab === 'profissional' && (
            <div className="space-y-6">
              {(!form.professionalName.trim() || !form.crfaNumber.trim()) && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Nome e número do CRFa identificam o responsável nos laudos exportados. Sem eles, o laudo mostra “Fonoaudiólogo(a) responsável não identificado(a)”, a menos que o próprio exame informe o responsável.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {textField('professionalName', 'Nome do profissional', { autoComplete: 'name' })}
                {textField('specialty', 'Especialidade', { placeholder: 'Ex.: Fonoaudiólogo(a) clínico(a)' })}
                {textField('crfaNumber', 'Nº CRFa')}
                {textField('cpf', 'CPF do profissional', { placeholder: '000.000.000-00', inputMode: 'numeric', format: formatCPF })}
              </div>
            </div>
          )}

          {activeTab === 'clinica' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {textField('clinicName', 'Nome fantasia (clínica)')}
                {textField('corporateName', 'Razão social')}
                {textField('cnpj', 'CNPJ', { placeholder: '00.000.000/0001-00', inputMode: 'numeric', format: formatCNPJ })}
              </div>
              <div className="space-y-3 border-t border-slate-100 pt-6">
                <p className="text-sm font-medium text-slate-800" id="settings-logo-label">Logo da clínica</p>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                    {form.logoUrl ? <img src={form.logoUrl} alt="Logo da clínica" className="w-full h-full object-contain p-2" /> : <span className="text-xs text-slate-600 text-center px-2">Sem logo</span>}
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <input type="file" accept="image/*" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" aria-labelledby="settings-logo-label" tabIndex={-1} />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => logoInputRef.current?.click()} className="rounded-xl border-slate-300 bg-white" type="button">
                        <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                        {form.logoUrl ? 'Trocar logo' : 'Anexar logo'}
                      </Button>
                      {form.logoUrl && <Button variant="ghost" onClick={() => setField('logoUrl', '')} className="rounded-xl text-red-700 hover:bg-red-50" type="button">Remover</Button>}
                    </div>
                    <p className="text-xs text-slate-600">PNG ou JPG, até 8 MB. A imagem é reduzida para no máximo {LOGO_MAX_SIDE} px.</p>
                    {logoError && <p role="alert" className="text-xs text-red-700">{logoError}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contato' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {textField('phone', 'Telefone / WhatsApp', { placeholder: '(00) 00000-0000', type: 'tel', inputMode: 'tel', format: formatPhone })}
              {textField('email', 'E-mail comercial', { placeholder: 'contato@clinica.com.br', type: 'email', autoComplete: 'email' })}
              {textField('website', 'Site', { placeholder: 'www.clinica.com.br' })}
              {textField('instagram', 'Instagram', { placeholder: '@suaclinica' })}
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {textField('zipCode', 'CEP', { placeholder: '00000-000', inputMode: 'numeric', format: formatCEP, autoComplete: 'postal-code' })}
                {textField('address', 'Endereço (rua, número, complemento)', { className: 'sm:col-span-2', autoComplete: 'street-address' })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {textField('neighborhood', 'Bairro')}
                {textField('city', 'Cidade')}
                {textField('state', 'Estado (UF)', { placeholder: 'SP', maxLength: 2, format: value => value.toUpperCase().replace(/[^A-Z]/g, '') })}
              </div>
            </div>
          )}

          {activeTab === 'assinatura' && (
            <div className="space-y-6">
              <div className={`rounded-xl border p-5 ${subscriptionTone}`}>
                <p className="text-xs font-semibold uppercase tracking-wide">AudioDash Pro · {PLAN_PRICE_LABEL}/mês</p>
                <h3 className="mt-1 text-xl font-bold">{subscription.label}</h3>
                <p className="mt-1 text-sm">{subscription.detail}</p>
                <p className="mt-3 text-sm font-semibold">{subscription.endLabel}</p>
              </div>
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h3 className="font-semibold text-slate-900">Portal do cliente</h3>
                  <p className="text-sm text-slate-600 mt-1 max-w-md">Acesse o portal do Dodo Payments para alterar o plano, atualizar a forma de pagamento, ver faturas ou cancelar a assinatura.</p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const portal = import.meta.env.VITE_DODO_CUSTOMER_PORTAL_URL;
                    if (portal) window.open(portal, '_blank', 'noopener');
                    else window.location.href = `mailto:contato@audiodash.com.br?subject=${encodeURIComponent('Gerenciar/cancelar assinatura AudioDash')}&body=${encodeURIComponent(`Conta: ${user?.email || ''}`)}`;
                  }}
                  className="w-full md:w-auto bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6"
                >
                  <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                  Gerenciar assinatura
                </Button>
              </div>
            </div>
          )}

          {activeTab !== 'assinatura' && (
            <div className="pt-6 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSaving || !dirty} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-8 h-11">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4 mr-2" aria-hidden="true" />}
                {isSaving ? 'Salvando…' : 'Salvar configurações'}
              </Button>
              {dirty && !isSaving && <Button variant="ghost" type="button" onClick={handleDiscard} className="rounded-xl">Descartar alterações</Button>}
              {dirty && <span className="text-sm text-amber-800">Alterações não salvas</span>}
              <div role="status" aria-live="polite" className="text-sm">
                {saveStatus === 'saved' && saveNote && (saveNote.tone === 'ok'
                  ? <span className="flex items-center text-emerald-800"><CheckCircle2 className="w-4 h-4 mr-1.5 shrink-0" aria-hidden="true" />{saveNote.message}</span>
                  : <span className="flex items-center text-amber-900"><AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" aria-hidden="true" />{saveNote.message}</span>)}
                {saveStatus === 'invalid' && <span className="flex items-center text-red-800"><AlertCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />Corrija os campos marcados antes de salvar.</span>}
                {saveStatus === 'error' && <span className="flex items-center text-red-800"><AlertCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />Não foi possível salvar neste aparelho. Tente novamente.</span>}
              </div>
            </div>
          )}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <h2 className="text-xl font-semibold leading-none tracking-tight">Cópia de segurança dos dados</h2>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            O AudioDash sincroniza seus dados com a nuvem quando há conexão. Para ter uma cópia sua, ou para usar offline, exporte um arquivo (.json) com todos os pacientes, exames, anamneses, agenda e configurações.
          </p>
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
            O arquivo contém dados pessoais e de saúde dos pacientes e não é criptografado. Guarde-o em local protegido e não o envie por canais abertos.
          </p>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 p-3"><dt className="text-xs text-slate-600">Neste aparelho agora</dt><dd className="font-semibold mt-1">{localCounts ? countsText(localCounts) : countsFailed ? 'Indisponível' : 'Contando…'}</dd></div>
            <div className="rounded-xl border border-slate-200 p-3"><dt className="text-xs text-slate-600">Última cópia exportada deste aparelho</dt><dd className="font-semibold mt-1">{lastBackupAt ? formatDateTime(lastBackupAt) : 'Nenhuma registrada'}</dd></div>
          </dl>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" onClick={handleExport} className="rounded-xl h-auto py-4 border-slate-300">
              <Download className="w-5 h-5 mr-2" aria-hidden="true" />
              <span className="text-left"><span className="block font-semibold">Exportar backup</span><span className="block text-xs font-normal text-slate-600">Baixar arquivo .json</span></span>
            </Button>
            <div>
              <input type="file" accept=".json,application/json" ref={fileInputRef} onChange={handleImport} className="hidden" aria-label="Arquivo de backup para importar" tabIndex={-1} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importStatus === 'loading'} className="w-full rounded-xl h-auto py-4 border-slate-300">
                {importStatus === 'loading' ? <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" /> : <Upload className="w-5 h-5 mr-2" aria-hidden="true" />}
                <span className="text-left"><span className="block font-semibold">Importar backup</span><span className="block text-xs font-normal text-slate-600">Substitui os dados deste aparelho</span></span>
              </Button>
            </div>
          </div>
          <div role="status" aria-live="polite">
            {importStatus === 'success' && <p className="flex items-center text-emerald-800 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200 text-sm"><CheckCircle2 className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />{importMessage}</p>}
            {importStatus === 'error' && <p className="flex items-center text-red-800 bg-red-50 px-4 py-3 rounded-xl border border-red-200 text-sm"><AlertCircle className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />{importMessage}</p>}
          </div>
        </CardContent>
      </Card>

      {/* LGPD — exclusão de dados */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <h2 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-700" aria-hidden="true" />Privacidade e dados (LGPD)</h2>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-5">
            Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode excluir os dados armazenados no AudioDash. Como responsável pelo prontuário, você deve manter a guarda dos registros dos pacientes (Res. CFFa 777/2025, arts. 7º e 8º): por isso, a exclusão exige antes a exportação da cópia completa.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/termos" target="_blank" className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"><ExternalLink className="w-4 h-4" aria-hidden="true" />Termos de uso</Link>
            <Link to="/privacidade" target="_blank" className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"><ExternalLink className="w-4 h-4" aria-hidden="true" />Política de privacidade</Link>
          </div>

          {!showDeleteSection ? (
            <button type="button" onClick={() => setShowDeleteSection(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-300 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-50">
              <Trash2 className="w-4 h-4" aria-hidden="true" />Solicitar exclusão dos meus dados
            </button>
          ) : (
            <div className="border border-red-200 bg-red-50/50 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-red-900 text-sm">Ação irreversível</h3>
                  <p className="text-xs text-red-800 mt-1 leading-relaxed">
                    Todos os dados do consultório (pacientes, exames e laudos) serão excluídos permanentemente. O prontuário fonoaudiológico deve ser guardado pelo profissional (Res. CFFa 777/2025, art. 8º: prontuário eletrônico de guarda permanente, com eliminação possível após 20 anos do último registro). Exporte a cópia completa e guarde-a em local seguro antes de prosseguir.
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-xs text-red-900">
                <Button variant="outline" onClick={handleExport} className="rounded-xl border-red-300 gap-2"><Download className="w-4 h-4" aria-hidden="true" />{backupExported ? 'Cópia completa exportada — exportar novamente' : '1. Exportar cópia completa (JSON)'}</Button>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={custodyAcknowledged} disabled={!backupExported} onChange={event => setCustodyAcknowledged(event.target.checked)} className="mt-0.5" />
                  <span>2. Declaro que mantenho a guarda da cópia exportada dos prontuários pelo prazo exigido (Res. CFFa 777/2025, art. 8º) e que posso fornecê-la aos pacientes quando solicitado (art. 11).</span>
                </label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowDeleteSection(false)} className="rounded-xl border-slate-300">Cancelar</Button>
                <button ref={deleteTriggerRef} type="button" onClick={() => setShowDeleteModal(true)} disabled={!backupExported || !custodyAcknowledged} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-700 text-white rounded-xl text-sm font-semibold hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />3. Excluir dados do consultório
                </button>
              </div>
            </div>
          )}

          <div role="status" aria-live="polite">
            {deleteStatus === 'success' && <p className="flex items-center text-emerald-800 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200 text-sm"><CheckCircle2 className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />Dados excluídos. Você será desconectado em instantes.</p>}
            {deleteError && <p role="alert" className="flex items-start text-red-800 bg-red-50 px-4 py-3 rounded-xl border border-red-200 text-sm"><AlertCircle className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />{deleteError}</p>}
          </div>
        </CardContent>
      </Card>

    </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-title" onKeyDown={trapFocus} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-start gap-3 mb-5">
              <AlertTriangle className="w-6 h-6 text-red-700 shrink-0" aria-hidden="true" />
              <div>
                <h2 id="delete-title" className="text-lg font-bold text-slate-900">Confirmar exclusão de dados</h2>
                <p className="text-sm text-slate-600 mt-1">Digite <strong className="text-red-700">EXCLUIR</strong> para confirmar. {isSupabaseConfigured && user ? 'Os dados serão removidos da nuvem e deste aparelho.' : 'Os dados serão removidos deste aparelho.'}</p>
              </div>
            </div>
            <label htmlFor="delete-confirm" className="sr-only">Digite EXCLUIR para confirmar</label>
            <input
              id="delete-confirm"
              type="text"
              autoFocus
              autoComplete="off"
              value={deleteConfirmText}
              onChange={event => setDeleteConfirmText(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') deleteAllData(); }}
              placeholder="Digite EXCLUIR"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-600 mb-4 text-sm font-mono"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} disabled={isDeleting} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 text-sm disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={deleteAllData} disabled={deleteConfirmText !== 'EXCLUIR' || isDeleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-700 text-white font-semibold hover:bg-red-800 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />Excluindo…</> : <><Trash2 className="w-4 h-4" aria-hidden="true" />Excluir tudo</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
