import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Aviso de nova versão do app. Não recarrega sozinho: pode haver exame em edição ainda não salvo.
 * Procura atualização a cada hora para abas e PWA instalados que ficam abertos por dias.
 */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => { registration.update().catch(() => undefined); }, 60 * 60 * 1000);
    }
  });

  if (!needRefresh) return null;
  return (
    <div role="status" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm z-[90] bg-white border border-slate-300 rounded-xl p-4 shadow-lg text-sm text-slate-800">
      <p className="mb-3">Há uma nova versão do AudioDash. Salve o que estiver editando e recarregue.</p>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setNeedRefresh(false)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700">Depois</button>
        <button onClick={() => updateServiceWorker(true)} className="px-3 py-1.5 rounded-lg bg-[#0071e3] text-white font-semibold">Recarregar</button>
      </div>
    </div>
  );
}
