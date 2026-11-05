import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { navItems } from '@/lib/constants';

const OTHER_TITLES = [
  { label: 'Exame', path: '/exame/' },
  { label: 'Comparar exames', path: '/comparar/' },
  { label: 'Anamnese', path: '/anamnese/' },
  { label: 'Evolução', path: '/evolucao/' }
];

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    const item = [...navItems, ...OTHER_TITLES].find(i => pathname === i.path || (i.path !== '/painel' && pathname.startsWith(i.path)));
    document.title = item ? `${item.label} · AudioDash` : 'AudioDash';
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row antialiased">
      
      {/* Sidebar Lateral Desktop */}
      <Sidebar />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <Header />

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-8 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>

    </div>
  );
}
