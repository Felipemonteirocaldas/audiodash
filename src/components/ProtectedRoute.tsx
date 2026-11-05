import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogoAD } from '@/components/LogoAD';
import { hasPaidAccess } from '@/lib/settingsStatus';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <div className="animate-pulse">
          <LogoAD className="w-16 h-auto" />
        </div>
        <p className="text-slate-500 font-medium">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Ignora o paywall APENAS no localhost / desenvolvimento:
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    import.meta.env.DEV
  );

  const hasAccess = user?.isAdmin || hasPaidAccess(user?.subscriptionStatus, user?.subscriptionEndDate);

  if (!isLocalhost && user && !hasAccess) {
    return <Navigate to="/planos" replace />;
  }

  return <Outlet />;
}
