import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogoAD } from '@/components/LogoAD';

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

  // Verifica se o usuário tem uma assinatura ativa
  // Se for nulo ou diferente de 'active' (e estamos considerando que null = sem plano)
  // Para testes locais ou se a property ainda não existe, comente as 3 linhas abaixo.
  if (user && user.subscriptionStatus !== 'active') {
    return <Navigate to="/paywall" replace />;
  }

  return <Outlet />;
}
