import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

export default function Layout() {
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
