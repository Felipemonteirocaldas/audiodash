import { Outlet, Link } from 'react-router-dom';
import { Activity, Users, Settings, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { syncManager } from '@/lib/syncManager';

export default function Layout() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Let the syncManager handle its own online event, but we can also trigger it explicitly just in case
      syncManager.sync();
    };
    const handleOffline = () => setIsOnline(false);
    
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncComplete = () => setIsSyncing(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-started', handleSyncStart);
    window.addEventListener('sync-completed', handleSyncComplete);

    // Trigger initial sync on load if online
    if (navigator.onLine) {
      syncManager.sync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-started', handleSyncStart);
      window.removeEventListener('sync-completed', handleSyncComplete);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <Link to="/" className="text-xl font-bold text-foreground">
              AudioDash
            </Link>
            <div className={`ml-4 px-2 py-1 rounded-full text-xs flex items-center gap-1 ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {isSyncing && (
              <div className="ml-2 px-2 py-1 rounded-full text-xs flex items-center gap-1 bg-blue-100 text-blue-700 animate-pulse">
                <Activity className="h-3 w-3" />
                Sincronizando...
              </div>
            )}
          </div>
          
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/exam/new" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <Activity className="h-4 w-4" /> Novo Exame
            </Link>
            <Link to="/patients" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <Users className="h-4 w-4" /> Pacientes
            </Link>
            <Link to="/settings" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configs
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 pt-8 pb-24 md:py-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden border-t bg-card fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          <Link to="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
            <Activity className="h-5 w-5" />
            <span className="text-[10px]">Início</span>
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
        </div>
      </nav>
    </div>
  );
}
