import { useEffect, useState } from 'react';
import { dialogStore } from '@/lib/dialogs';

export function Dialogs() {
  const [state, setState] = useState(dialogStore.state);

  useEffect(() => {
    return dialogStore.subscribe(setState);
  }, []);

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{state.title}</h2>
        <p className="text-gray-600 mb-6">{state.message}</p>
        
        <div className="flex justify-end gap-3">
          {state.type === 'confirm' && (
            <button
              onClick={state.onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f172a] transition-colors"
            >
              {state.cancelText}
            </button>
          )}
          <button
            onClick={state.onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0f172a] rounded-lg hover:bg-[#1e293b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f172a] transition-colors"
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
