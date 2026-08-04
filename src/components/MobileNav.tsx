import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { navItems } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="md:hidden border-t border-slate-200 bg-white fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1",
                isActive ? "text-[#0071e3] font-semibold" : "text-slate-500 hover:text-slate-900"
              )}
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
  );
}
