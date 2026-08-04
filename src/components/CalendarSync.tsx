import { useState, useRef, useEffect } from 'react';
import { Appointment } from '@/db/db';
import {
  generateGoogleCalendarURL,
  generateOutlookURL,
  downloadICS,
  downloadMultiICS,
} from '@/lib/calendarIntegration';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGoogleConnected,
  isGoogleConfigured,
} from '@/lib/googleCalendar';
import {
  connectMicrosoftCalendar,
  disconnectMicrosoftCalendar,
  isMicrosoftConnected,
  isMicrosoftConfigured,
} from '@/lib/microsoftCalendar';
import {
  Share2,
  Download,
  X,
  Check,
  Link2,
  Unlink,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ─── SVG brand icons (inline for zero dependencies) ─────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

// ─── CalendarSync Dropdown (per-event actions) ──────────────────────────────

interface CalendarSyncProps {
  appointment?: Appointment;
  appointments?: Appointment[];
  exportLabel?: string;
  compact?: boolean;
}

export default function CalendarSync({
  appointment,
  appointments,
  exportLabel = 'agenda',
  compact = false,
}: CalendarSyncProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const flashCopied = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGoogleClick = () => {
    if (appointment) {
      window.open(generateGoogleCalendarURL(appointment), '_blank');
      flashCopied('google');
    }
  };

  const handleOutlookClick = () => {
    if (appointment) {
      window.open(generateOutlookURL(appointment), '_blank');
      flashCopied('outlook');
    }
  };

  const handleAppleClick = () => {
    if (appointment) {
      downloadICS(appointment);
      flashCopied('apple');
    }
  };

  const handleExportAll = () => {
    if (appointments && appointments.length > 0) {
      downloadMultiICS(appointments, exportLabel);
      flashCopied('export');
    }
  };

  const buttonItems = [
    ...(appointment
      ? [
          { key: 'google', icon: <GoogleIcon className="w-5 h-5" />, label: 'Google Calendar', onClick: handleGoogleClick },
          { key: 'outlook', icon: <MicrosoftIcon className="w-5 h-5" />, label: 'Outlook', onClick: handleOutlookClick },
          { key: 'apple', icon: <AppleIcon className="w-5 h-5" />, label: 'Apple Calendar (.ics)', onClick: handleAppleClick },
        ]
      : []),
    ...(appointments && appointments.length > 0
      ? [{ key: 'export', icon: <Download className="w-5 h-5 text-indigo-500" />, label: `Exportar ${appointments.length} evento${appointments.length > 1 ? 's' : ''} (.ics)`, onClick: handleExportAll }]
      : []),
  ];

  if (buttonItems.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      {compact ? (
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200" title="Enviar ao calendário">
          <Share2 className="w-4 h-4" />
        </button>
      ) : (
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm transition-all duration-200">
          <Share2 className="w-4 h-4" />
          Exportar
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Exportar Evento</h4>
              <p className="text-xs text-slate-400 mt-0.5">Enviar avulso ao calendário</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2">
            {buttonItems.map((item) => (
              <button key={item.key} onClick={item.onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                <div className="w-9 h-9 bg-slate-50 group-hover:bg-white rounded-lg flex items-center justify-center border border-slate-100 group-hover:border-slate-200 transition-colors shrink-0">
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 flex-1">{item.label}</span>
                {copied === item.key && <Check className="w-4 h-4 text-emerald-500 animate-in fade-in duration-200" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CalendarConnections Panel ──────────────────────────────────────────────

export function CalendarConnections() {
  const [googleConnected, setGoogleConnected] = useState(isGoogleConnected());
  const [microsoftConnected, setMicrosoftConnected] = useState(isMicrosoftConnected());
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const googleConfigured = isGoogleConfigured();
  const microsoftConfigured = isMicrosoftConfigured();

  const handleConnectGoogle = async () => {
    setLoading('google');
    setError(null);
    try {
      await connectGoogleCalendar();
      setGoogleConnected(true);
      setSuccess('Google Calendar conectado com sucesso!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar Google Calendar');
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnectGoogle = () => {
    disconnectGoogleCalendar();
    setGoogleConnected(false);
    setSuccess('Google Calendar desconectado.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleConnectMicrosoft = async () => {
    setLoading('microsoft');
    setError(null);
    try {
      await connectMicrosoftCalendar();
      setMicrosoftConnected(true);
      setSuccess('Microsoft Outlook conectado com sucesso!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar Outlook');
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnectMicrosoft = () => {
    disconnectMicrosoftCalendar();
    setMicrosoftConnected(false);
    setSuccess('Microsoft Outlook desconectado.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const providers = [
    {
      key: 'google',
      name: 'Google Calendar',
      icon: <GoogleIcon className="w-6 h-6" />,
      configured: googleConfigured,
      connected: googleConnected,
      onConnect: handleConnectGoogle,
      onDisconnect: handleDisconnectGoogle,
      description: 'Conecte seu Google Calendar para sincronizar agendamentos.',
      envVar: 'VITE_GOOGLE_CLIENT_ID',
    },
    {
      key: 'microsoft',
      name: 'Microsoft Outlook',
      icon: <MicrosoftIcon className="w-6 h-6" />,
      configured: microsoftConfigured,
      connected: microsoftConnected,
      onConnect: handleConnectMicrosoft,
      onDisconnect: handleDisconnectMicrosoft,
      description: 'Conecte seu Outlook / Microsoft 365.',
      envVar: 'VITE_MICROSOFT_CLIENT_ID',
    },
    {
      key: 'apple',
      name: 'Apple Calendar',
      icon: <AppleIcon className="w-6 h-6 text-slate-700" />,
      configured: true,
      connected: false,
      onConnect: null,
      onDisconnect: null,
      description: 'Exporte como .ics para importar no Apple Calendar.',
      isExportOnly: true,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Important notice */}
      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700 leading-relaxed">
        <strong className="flex items-center gap-1.5 text-indigo-800 mb-1">
          <RefreshCw className="w-3 h-3" />
          Sincronização Manual
        </strong>
        A sincronização com calendários externos é <strong>opcional</strong>. 
        Seu login no AudioDash é independente — conectar seu calendário aqui não altera sua conta.
        Você decide quando e se quer sincronizar.
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-in fade-in duration-200">
          <WifiOff className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:bg-red-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 animate-in fade-in duration-200">
          <Check className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Provider cards */}
      {providers.map((provider) => (
        <div
          key={provider.key}
          className={`
            relative p-3.5 rounded-xl border transition-all duration-200
            ${provider.connected
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border
              ${provider.connected ? 'bg-white border-emerald-200' : 'bg-slate-50 border-slate-100'}
            `}>
              {provider.icon}
            </div>

            {/* Name + status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-800">{provider.name}</span>
                {provider.connected && (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                    <Wifi className="w-2.5 h-2.5" />
                    ATIVO
                  </span>
                )}
                {(provider as any).isExportOnly && (
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    .ICS
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{provider.description}</p>
            </div>

            {/* Action */}
            <div className="shrink-0">
              {(provider as any).isExportOnly ? (
                <span className="text-[10px] text-slate-400 italic">Botão ↗ na agenda</span>
              ) : provider.connected ? (
                <button
                  onClick={provider.onDisconnect!}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                >
                  <Unlink className="w-3 h-3" />
                  Desconectar
                </button>
              ) : provider.configured ? (
                <button
                  onClick={provider.onConnect!}
                  disabled={loading === provider.key}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading === provider.key ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2 className="w-3 h-3" />
                  )}
                  Conectar
                </button>
              ) : (
                <span className="text-[10px] text-slate-400">Pendente</span>
              )}
            </div>
          </div>

          {/* Connected info */}
          {provider.connected && (
            <div className="mt-2 pt-2 border-t border-emerald-200/50 text-[10px] text-emerald-600 leading-relaxed">
              ✓ Novos agendamentos serão enviados ao seu {provider.name} quando você criar ou editar.
            </div>
          )}

          {/* Not configured hint */}
          {!provider.configured && !(provider as any).isExportOnly && (
            <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              Requer configuração: <code className="bg-amber-100 px-0.5 rounded">{provider.envVar}</code> no .env
            </div>
          )}
        </div>
      ))}

      {/* ─── Mini Manual / Tutorial ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            📖 Como sincronizar meu calendário?
          </span>
          <span className={`text-slate-400 transition-transform duration-200 ${showGuide ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>

        {showGuide && (
          <div className="px-3.5 pb-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Google Guide */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <GoogleIcon className="w-4 h-4" />
                Google Calendar
              </h5>
              <ol className="text-[11px] text-slate-500 space-y-1 pl-4 list-decimal leading-relaxed">
                <li>Clique no botão <strong className="text-indigo-600">"Conectar"</strong> ao lado do Google Calendar acima.</li>
                <li>Uma janela popup abrirá pedindo para você entrar na sua conta Google.</li>
                <li>Autorize o AudioDash a acessar seu Google Calendar.</li>
                <li>Pronto! A partir de agora, ao criar, editar ou excluir um agendamento, ele será enviado automaticamente ao seu Google Calendar.</li>
              </ol>
            </div>

            <div className="border-t border-slate-100" />

            {/* Microsoft Guide */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MicrosoftIcon className="w-4 h-4" />
                Microsoft Outlook
              </h5>
              <ol className="text-[11px] text-slate-500 space-y-1 pl-4 list-decimal leading-relaxed">
                <li>Clique no botão <strong className="text-indigo-600">"Conectar"</strong> ao lado do Microsoft Outlook.</li>
                <li>Faça login com sua conta Microsoft (Outlook, Hotmail ou corporativa).</li>
                <li>Permita o acesso ao seu calendário.</li>
                <li>Seus agendamentos serão sincronizados com o Outlook automaticamente.</li>
              </ol>
            </div>

            <div className="border-t border-slate-100" />

            {/* Apple Guide */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <AppleIcon className="w-4 h-4 text-slate-700" />
                Apple Calendar (iPhone / Mac)
              </h5>
              <ol className="text-[11px] text-slate-500 space-y-1 pl-4 list-decimal leading-relaxed">
                <li>Na lista de agendamentos, clique no ícone <strong className="text-indigo-600">↗ (compartilhar)</strong> de um evento.</li>
                <li>Escolha <strong>"Apple Calendar (.ics)"</strong>.</li>
                <li>Um arquivo <code className="bg-slate-100 px-0.5 rounded">.ics</code> será baixado.</li>
                <li>Abra o arquivo no seu iPhone, iPad ou Mac — ele será adicionado ao Apple Calendar automaticamente.</li>
                <li><em>Dica: você também pode exportar toda a semana de uma vez usando o botão "Exportar" no topo da agenda.</em></li>
              </ol>
            </div>

            <div className="border-t border-slate-100" />

            {/* FAQ */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold text-slate-700">❓ Perguntas frequentes</h5>
              <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
                <div>
                  <strong className="text-slate-600">Meu login do AudioDash é afetado?</strong>
                  <br />
                  Não. Sua conta do AudioDash (via Supabase) é totalmente separada da conexão com o calendário. Conectar o Google Calendar aqui não altera nem substitui seu login.
                </div>
                <div>
                  <strong className="text-slate-600">Posso desconectar a qualquer momento?</strong>
                  <br />
                  Sim! Basta clicar em "Desconectar". Os eventos já criados no seu calendário externo não serão apagados.
                </div>
                <div>
                  <strong className="text-slate-600">Preciso conectar toda vez que logar?</strong>
                  <br />
                  Não. A conexão é salva no seu navegador. Só precisa reconectar se limpar os dados do navegador ou trocar de dispositivo.
                </div>
                <div>
                  <strong className="text-slate-600">Os eventos antigos são sincronizados?</strong>
                  <br />
                  Não. Apenas novos agendamentos criados ou editados após a conexão são sincronizados.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

