import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadFullBackup } from '@/lib/backup';
import { supabase } from '@/lib/supabase';
import { PLAN_PRICE_LABEL, TEST_CHECKOUT_URL, checkoutUrl, hasPaidAccess } from '@/lib/settingsStatus';

const CHECKOUT_URL = import.meta.env.VITE_DODO_CHECKOUT_URL || TEST_CHECKOUT_URL;

export default function Paywall() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // A Dodo volta para /planos?status=...; o webhook pode chegar alguns segundos depois do retorno.
  const returnedStatus = new URLSearchParams(window.location.search).get('status');
  const [confirming, setConfirming] = useState<'idle' | 'waiting' | 'timeout'>(returnedStatus === 'succeeded' || returnedStatus === 'active' ? 'waiting' : 'idle');

  useEffect(() => {
    if (user && (user.isAdmin || hasPaidAccess(user.subscriptionStatus, user.subscriptionEndDate))) {
      navigate('/painel', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (confirming !== 'waiting' || !user || !supabase) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      const { data } = await supabase!.from('users').select('subscription_status, subscription_end_date').eq('id', user.id).single();
      const end = data?.subscription_end_date ? new Date(data.subscription_end_date).getTime() : null;
      if (hasPaidAccess(data?.subscription_status, end)) {
        clearInterval(timer);
        window.location.assign('/painel'); // recarrega para o AuthContext ler a assinatura nova
      } else if (tries >= 20) {
        clearInterval(timer);
        setConfirming('timeout');
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [confirming, user]);

  const handleCheckout = () => {
    if (user) window.location.href = checkoutUrl(CHECKOUT_URL, user, window.location.origin);
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
            {confirming !== 'idle' && (
              <p role="status" className={`rounded-md p-3 text-sm ${confirming === 'waiting' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-900'}`}>
                {confirming === 'waiting'
                  ? 'Confirmando o pagamento com a Dodo Payments…'
                  : 'O pagamento foi feito, mas a confirmação ainda não chegou. Recarregue a página em alguns minutos; se persistir, fale com o suporte.'}
              </p>
            )}
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Plano AudioDash Pro
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900">{PLAN_PRICE_LABEL}</span>
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

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Atenção: O email <span className="font-semibold">{user?.email}</span> será o responsável pela ativação da conta. Ao assinar, esse será o seu vínculo oficial.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Assinar Agora
            </button>
            
            <div className="border border-slate-200 rounded-md p-4 text-sm text-gray-600 space-y-2">
              <p>Seus prontuários continuam guardados mesmo sem assinatura ativa. Você pode baixar a cópia completa dos dados deste dispositivo a qualquer momento (Res. CFFa 777/2025, arts. 7º e 8º).</p>
              <button
                onClick={() => downloadFullBackup().catch(() => undefined)}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Baixar cópia dos meus dados (JSON)
              </button>
            </div>

            <button
              onClick={() => logout()}
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
