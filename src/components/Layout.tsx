import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Users, 
  Settings, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  LayoutDashboard,
  LogOut,
  PlusCircle, 
  ChevronRight,
  FileText
} from 'lucide-react';
import { LogoAD } from './LogoAD';
import { NotificationsModal } from './NotificationsModal';
import { useState, useEffect } from 'react';
import { syncManager, type SyncStatus } from '@/lib/syncManager';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { GlobalSearch } from './GlobalSearch';

export default function Layout() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const { logout, user } = useAuth();
  const location = useLocation();

  const settings = useLiveQuery(() => db.settings.toCollection().first(), []);
  const professionalName = settings?.professionalName || 'Dra. Fonoaudióloga';
  const clinicName = settings?.clinicName || 'Clínica Auditiva';
  
  // Calcula os dias restantes de assinatura
  const daysLeft = user?.subscriptionEndDate 
    ? Math.max(0, Math.ceil((user.subscriptionEndDate - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Extract initials for the avatar (e.g. "Dra. Maria" -> "DM")
  const initials = professionalName
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0].toUpperCase())
    .slice(0, 2)
    .join('');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncManager.sync();
    };
    const handleOffline = () => setIsOnline(false);
    
    const handleSyncStatusChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSyncStatus(detail.status);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-status-change', handleSyncStatusChange);

    if (navigator.onLine) {
      syncManager.sync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-status-change', handleSyncStatusChange);
    };
  }, []);

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
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 font-medium" title={syncManager.lastError || ''}>
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

  const navItems = [
    { label: 'Dashboard (Início)', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Agenda', path: '/agenda', icon: Calendar },
    { label: 'Pacientes', path: '/patients', icon: Users },
    { label: 'Exames', path: '/exams', icon: FileText },
    { label: 'Novo Exame', path: '/exam/new', icon: PlusCircle },
    { label: 'Configurações', path: '/settings', icon: Settings },
  ];

  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row antialiased">
      
      {/* Sidebar Lateral Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r border-slate-200/80 bg-white sticky top-0 h-screen z-40 shrink-0">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-[#0071e3] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <LogoAD className="h-7 w-auto text-white" />
          </div>
          <div>
            <Link to="/dashboard" className="text-xl font-bold text-slate-900 tracking-tight block leading-none">
              Audio<span className="text-[#0071e3]">Dash</span>
            </Link>
            <span className="text-xs text-slate-500 font-medium mt-1 block">Fonoaudiologia & Saúde</span>
          </div>
        </div>

        {/* User Card */}
        <div className="mx-4 my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-full bg-blue-100 text-[#0071e3] flex items-center justify-center font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{professionalName}</p>
            <p className="text-xs text-slate-500 truncate">{clinicName}</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 pt-3 pb-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Menu Principal
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0071e3] text-white shadow-sm shadow-blue-500/20 font-semibold'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="flex-1 text-sm">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 text-white/80 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3.5">
          {daysLeft !== null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Assinatura</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${daysLeft > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} restante{daysLeft === 1 ? '' : 's'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Status da Conexão</span>
            {getSyncBadge()}
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200/80"
          >
            <LogOut className="h-4 w-4" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar Desktop */}
        <header className="hidden md:flex h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 items-center justify-between sticky top-0 z-30">
          
          {/* Left: Quick Search */}
          <div className="flex-1 max-w-md">
            <GlobalSearch />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-5">
            <span className="text-sm text-slate-600 font-medium capitalize">
              {currentDateFormatted}
            </span>

            <NotificationsModal />

            <Link
              to="/exam/new"
              className="flex items-center gap-2 px-4.5 py-2 rounded-xl bg-[#0071e3] hover:bg-blue-600 text-white text-sm font-semibold tracking-normal shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
            >
              <PlusCircle className="h-4.5 w-4.5 shrink-0 text-white/90" />
              <span>Novo Exame</span>
            </Link>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden border-b border-slate-200 bg-white px-4 h-14 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <LogoAD className="h-7 w-auto text-[#0071e3]" />
            <span className="text-base font-bold text-slate-900">AudioDash</span>
          </div>
          <div className="flex items-center gap-3">
            {getSyncBadge()}
            <NotificationsModal />
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden border-t border-slate-200 bg-white fixed bottom-0 left-0 right-0 z-50 pb-safe">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 ${
                    isActive ? 'text-[#0071e3] font-semibold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              );
            })}
            <button onClick={logout} className="flex flex-col items-center gap-1 text-slate-500 hover:text-red-500">
              <LogOut className="h-5 w-5" />
              <span className="text-[10px]">Sair</span>
            </button>
          </div>
        </nav>
      </div>

    </div>
  );
}
