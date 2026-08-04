import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, PlusCircle, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { label: 'Início', path: '/painel', icon: LayoutDashboard },
  { label: 'Agenda', path: '/agenda', icon: Calendar },
  { label: 'Novo', path: '/exame/novo', icon: PlusCircle, isPrimary: true },
  { label: 'Pacientes', path: '/pacientes', icon: Users },
  { label: 'Ajustes', path: '/configuracoes', icon: Settings },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden border-t border-slate-200/80 bg-white/90 backdrop-blur-md fixed bottom-0 left-0 right-0 z-50 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      <div className="flex justify-around items-center h-16 px-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          if (item.isPrimary) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="bg-indigo-600 text-white rounded-full p-3 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-colors active:scale-95">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-medium text-slate-500 mt-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[60px]",
                isActive ? "text-indigo-600 font-semibold" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
