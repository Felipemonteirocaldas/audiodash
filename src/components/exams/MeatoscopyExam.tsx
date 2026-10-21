import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Meatoscopy } from '@/db/db';
import { Stethoscope, ArrowRight } from 'lucide-react';

interface Props {
  meatoscopy?: Meatoscopy;
  onChange: (data: Meatoscopy) => void;
}

export default function MeatoscopyExam({ meatoscopy, onChange }: Props) {
  const current: Meatoscopy = meatoscopy || {
    right: '',
    left: '',
    rightDescription: '',
    leftDescription: '',
    referToENT: false
  };

  const updateField = (updates: Partial<Meatoscopy>) => {
    onChange({ ...current, ...updates });
  };

  const isAbnormalRight = current.right && current.right !== 'normal';
  const isAbnormalLeft = current.left && current.left !== 'normal';

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Inspeção do Meato Acústico Externo (Meatoscopia / Otoscopia)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Avaliação prévia indispensável das condições anatômicas do meato e integridade da membrana timpânica antes dos testes auditivos.
            </CardDescription>
          </div>

        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Orelha Direita */}
          <div className={`p-4 rounded-xl border transition-all ${
            isAbnormalRight ? 'bg-red-50/40 border-red-200' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                Orelha Direita (OD)
              </span>
              {current.right === 'normal' && (
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Normal
                </span>
              )}
              {isAbnormalRight && (
                <span className="text-[11px] font-medium text-red-700 bg-red-100/80 px-2 py-0.5 rounded-full">
                  Achado registrado
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Achado Otoscópico Principal</label>
                <select
                  className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  value={current.right || ''}
                  onChange={e => updateField({ right: e.target.value as Meatoscopy['right'] })}
                >
                  <option value="">-- Selecione o estado da OD --</option>
                  <option value="normal">Normal (Conduto livre e MT íntegra/translúcida)</option>
                  <option value="cerumen">Presença de Cerúmen (Oclusivo / Não Oclusivo)</option>
                  <option value="foreign_body">Presença de Corpo Estranho</option>
                  <option value="perforation">Perfuração da Membrana Timpânica</option>
                  <option value="other">Outro (Retração / Hiperemia / Pós-cirúrgico)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Descrição e Detalhes (OD)</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Descreva somente os achados observados"
                  value={current.rightDescription || ''}
                  onChange={e => updateField({ rightDescription: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Orelha Esquerda */}
          <div className={`p-4 rounded-xl border transition-all ${
            isAbnormalLeft ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Orelha Esquerda (OE)
              </span>
              {current.left === 'normal' && (
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Normal
                </span>
              )}
              {isAbnormalLeft && (
                <span className="text-[11px] font-medium text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                  Achado registrado
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Achado Otoscópico Principal</label>
                <select
                  className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  value={current.left || ''}
                  onChange={e => updateField({ left: e.target.value as Meatoscopy['left'] })}
                >
                  <option value="">-- Selecione o estado da OE --</option>
                  <option value="normal">Normal (Conduto livre e MT íntegra/translúcida)</option>
                  <option value="cerumen">Presença de Cerúmen (Oclusivo / Não Oclusivo)</option>
                  <option value="foreign_body">Presença de Corpo Estranho</option>
                  <option value="perforation">Perfuração da Membrana Timpânica</option>
                  <option value="other">Outro (Retração / Hiperemia / Pós-cirúrgico)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Descrição e Detalhes (OE)</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Descreva somente os achados observados"
                  value={current.leftDescription || ''}
                  onChange={e => updateField({ leftDescription: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Encaminhamento Otorrino */}
        <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
          current.referToENT ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="referToENTCheckbox"
              checked={current.referToENT || false}
              onChange={e => updateField({ referToENT: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div className="flex items-center gap-2">
              <Stethoscope className={`w-4 h-4 ${current.referToENT ? 'text-amber-600' : 'text-slate-400'}`} />
              <span className="text-sm font-semibold">
                Recomendar e Registrar Encaminhamento para Médico Otorrinolaringologista
              </span>
            </div>
          </label>
          {current.referToENT && (
            <span className="text-xs font-bold text-amber-700 bg-amber-200/60 px-2.5 py-1 rounded-md flex items-center gap-1">
              Indicado no Laudo <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
