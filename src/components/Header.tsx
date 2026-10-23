import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsModal } from './NotificationsModal';
import { LogoAD } from './LogoAD';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { formatLongDatePt } from '@/lib/dateLabels';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle2, 
  Activity 
} from 'lucide-react';

export function Header() {
  const { isOnline, syncStatus, lastError } = useSyncStatus();

  const currentDateFormatted = formatLongDatePt();

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
          </div>
        );
      case 'error':
        return (
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 font-medium" title={lastError || ''}>
            <AlertCircle className="h-3 w-3" />
          </div>
        );
      case 'unconfigured':
        return (
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200/60 font-medium">
            <WifiOff className="h-3 w-3" />
          </div>
        );
      case 'success':
        return (
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          </div>
        );
      default:
        return (
          <div className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
            <Wifi className="h-3 w-3 text-emerald-600" />
          </div>
        );
    }
  };

  return (
    <>
      {/* Top Header Bar Desktop */}
      <header className="hidden md:flex h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 items-center justify-between sticky top-0 z-30">
        
        {/* Left: Quick Search */}
        <div className="flex-1 max-w-md">
          <GlobalSearch />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-5">
          <span className="text-sm text-slate-600 font-medium">
            {currentDateFormatted}
          </span>

          <NotificationsModal />

          <Link
            to="/exame/novo"
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
    </>
  );
}
