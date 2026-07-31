import { useAuth } from '../contexts/AuthContext';
import { CreditCard, CheckCircle2 } from 'lucide-react';

export default function Paywall() {
  const { user, logout } = useAuth();

  const handleCheckout = () => {
    // Redireciona para o link de checkout do Dodo Payments
    // Em um cenário avançado, poderíamos passar o email do usuário na URL (ex: ?email=user.email)
    // para preencher automaticamente o checkout.
    window.location.href = 'https://test.checkout.dodopayments.com/buy/pdt_0NkP4tyyh4C0dF9wG6eUW';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Desbloqueie o AudioDash
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Olá, {user?.name}! Sua conta precisa de uma assinatura ativa para acessar o painel.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Plano AudioDash Pro
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900">R$ 50,00</span>
                <span className="text-base font-medium text-gray-500">/mês</span>
              </div>
              <ul className="mt-6 space-y-4">
                <li className="flex space-x-3">
                  <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-500">Pacientes ilimitados</span>
                </li>
                <li className="flex space-x-3">
                  <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-500">Audiometrias ilimitadas</span>
                </li>
                <li className="flex space-x-3">
                  <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-500">Sincronização em nuvem</span>
                </li>
                <li className="flex space-x-3">
                  <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-500">Geração de relatórios</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Assinar Agora
            </button>
            
            <button
              onClick={logout}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
