import { Outlet, Link } from 'react-router-dom';
import { Activity, Users, Settings, Wifi, WifiOff, AlertCircle, CheckCircle2, Calendar, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { syncManager, type SyncStatus } from '@/lib/syncManager';
import { useAuth } from '@/contexts/AuthContext';

export default function Layout() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const { logout } = useAuth();

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

    // Trigger initial sync on load if online
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
        <div className="ml-4 px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-red-100 text-red-700 font-medium">
          <WifiOff className="h-3 w-3" />
          Offline
        </div>
      );
    }

    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="ml-4 px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-blue-100 text-blue-700 font-medium animate-pulse">
            <Activity className="h-3 w-3" />
            Sincronizando...
          </div>
        );
      case 'error':
        return (
          <div className="ml-4 px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-amber-100 text-amber-700 font-medium" title={syncManager.lastError || ''}>
            <AlertCircle className="h-3 w-3" />
            Erro sync
          </div>
        );
      case 'unconfigured':
        return (
          <div className="ml-4 px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-slate-100 text-slate-600 font-medium">
            <WifiOff className="h-3 w-3" />
            Modo local
          </div>
        );
      case 'success':
        return (
          <div className="ml-4 px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-green-100 text-green-700 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Sincronizado
          </div>
        );
      default:
        return (
          <div className="ml-4 px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-green-100 text-green-700 font-medium">
            <Wifi className="h-3 w-3" />
            Online
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <Link to="/dashboard" className="text-xl font-bold text-foreground">
              AudioDash
            </Link>
            {getSyncBadge()}
          </div>
          
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/agenda" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Agenda
            </Link>
            <Link to="/exam/new" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <Activity className="h-4 w-4" /> Novo Exame
            </Link>
            <Link to="/patients" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <Users className="h-4 w-4" /> Pacientes
            </Link>
            <Link to="/settings" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configs
            </Link>
            <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors flex items-center gap-2 ml-4">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 pt-8 pb-24 md:py-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden border-t bg-card fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          <Link to="/dashboard" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <Activity className="h-5 w-5" />
            <span className="text-[10px]">Início</span>
          </Link>
          <Link to="/agenda" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px]">Agenda</span>
          </Link>
          <Link to="/patients" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <Users className="h-5 w-5" />
            <span className="text-[10px]">Pacientes</span>
          </Link>
          <Link to="/exam/new" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <Activity className="h-5 w-5" />
            <span className="text-[10px]">Exame</span>
          </Link>
          <Link to="/settings" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <Settings className="h-5 w-5" />
            <span className="text-[10px]">Configs</span>
          </Link>
          <button onClick={logout} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-red-500">
            <LogOut className="h-5 w-5" />
            <span className="text-[10px]">Sair</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
