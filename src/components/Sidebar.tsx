import { Link, useLocation } from 'react-router-dom';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle2, 
  Activity,
  LogOut,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { LogoAD } from './LogoAD';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { navItems } from '@/lib/constants';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useMemo } from 'react';
import { MILLISECONDS_IN_A_DAY } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const { isOnline, syncStatus, lastError } = useSyncStatus();

  const professionalName = settings?.professionalName || 'Profissional não cadastrado';
  const clinicName = settings?.clinicName || 'Complete o cadastro em Configurações';

  const daysLeft = useMemo(() => {
    if (!user?.subscriptionEndDate) return null;
    return Math.max(0, Math.ceil((user.subscriptionEndDate - Date.now()) / MILLISECONDS_IN_A_DAY));
  }, [user?.subscriptionEndDate]);

  const initials = useMemo(() => {
    if (!settings?.professionalName) return '?';
    return professionalName
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .slice(0, 2)
      .join('');
  }, [professionalName, settings?.professionalName]);

  const getSyncBadge = () => {
    if (!isOnline) {
      return (
        <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200/60 font-medium">
          <WifiOff className="h-3 w-3" />
          Offline
        </div>
      );
    }

    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200/60 font-medium animate-pulse">
            <Activity className="h-3 w-3" />
            Sincronizando...
          </div>
        );
      case 'error':
        return (
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 font-medium" title={lastError || ''}>
            <AlertCircle className="h-3 w-3" />
            Erro Sync
          </div>
        );
      case 'unconfigured':
        return (
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200/60 font-medium">
            <WifiOff className="h-3 w-3" />
            Modo Local
          </div>
        );
      case 'success':
        return (
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Sincronizado
          </div>
        );
      default:
        return (
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
            <Wifi className="h-3 w-3 text-emerald-600" />
            Online
          </div>
        );
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-72 border-r border-slate-200/80 bg-white sticky top-0 h-screen z-40 shrink-0">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-xl bg-[#0071e3] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <LogoAD className="h-7 w-auto text-white" />
        </div>
        <div>
          <Link to="/painel" className="text-xl font-bold text-slate-900 tracking-tight block leading-none">
            Audio<span className="text-[#0071e3]">Dash</span>
          </Link>
          <span className="text-xs text-slate-500 font-medium mt-1 block">Fonoaudiologia & Saúde</span>
        </div>
      </div>

      <div className="mx-4 my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
        <div className="h-10 w-10 rounded-full bg-blue-100 text-[#0071e3] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{professionalName}</p>
          <p className="text-xs text-slate-500 truncate">{clinicName}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 pt-3 pb-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
          Menu Principal
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/painel' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                isActive 
                  ? "bg-[#0071e3] text-white shadow-sm shadow-blue-500/20 font-semibold"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/80"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-500")} />
              <span className="flex-1 text-sm">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 text-white/80 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-3.5">
        {daysLeft !== null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Assinatura</span>
            <span className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded-full",
              daysLeft > 5 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} restante{daysLeft === 1 ? '' : 's'}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">Status da Conexão</span>
          {getSyncBadge()}
        </div>
        
        <a 
          href="/manual"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200/80"
        >
          <BookOpen className="h-4 w-4" />
          Manual do Sistema
        </a>

        <button 
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200/80"
        >
          <LogOut className="h-4 w-4" />
          <span className="truncate">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
