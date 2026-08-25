import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Meatoscopy } from '@/db/db';
import { Eye, AlertTriangle, CheckCircle2, Stethoscope, ArrowRight } from 'lucide-react';

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

  const setPreset = (type: 'normal' | 'cerumen_bilateral') => {
    if (type === 'normal') {
      updateField({
        right: 'normal',
        left: 'normal',
        rightDescription: 'Conduto auditivo externo livre e pérvio. Membrana timpânica íntegra, translúcida, com cone luminoso presente.',
        leftDescription: 'Conduto auditivo externo livre e pérvio. Membrana timpânica íntegra, translúcida, com cone luminoso presente.',
        referToENT: false
      });
    } else if (type === 'cerumen_bilateral') {
      updateField({
        right: 'cerumen',
        left: 'cerumen',
        rightDescription: 'Presença de cerúmen oclusivo em conduto auditivo externo.',
        leftDescription: 'Presença de cerúmen oclusivo em conduto auditivo externo.',
        referToENT: true
      });
    }
  };

  const isAbnormalRight = current.right && current.right !== 'normal';
  const isAbnormalLeft = current.left && current.left !== 'normal';

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              Inspeção do Meato Acústico Externo (Meatoscopia / Otoscopia)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Avaliação prévia indispensável das condições anatômicas do meato e integridade da membrana timpânica antes dos testes auditivos.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPreset('normal')}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Normal Bilateral
            </button>
            <button
              type="button"
              onClick={() => setPreset('cerumen_bilateral')}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Cerúmen Bilateral
            </button>
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
                  Alteração Detectada
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Achado Otoscópico Principal</label>
                <select
                  className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  value={current.right || ''}
                  onChange={e => {
                    const val = e.target.value as any;
                    let desc = current.rightDescription || '';
                    if (val === 'normal' && !desc) desc = 'Conduto livre, membrana timpânica íntegra e translúcida com triângulo luminoso presente.';
                    if (val === 'cerumen' && !desc) desc = 'Presença de rolha de cerúmen oclusivo no terço externo/médio do MAE.';
                    if (val === 'perforation' && !desc) desc = 'Perfuração de membrana timpânica em pars tensa.';
                    updateField({ 
                      right: val, 
                      rightDescription: desc,
                      referToENT: val && val !== 'normal' ? true : current.referToENT 
                    });
                  }}
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
                  placeholder="Ex: Tímpano íntegro, cone de luz preservado..."
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
                  Alteração Detectada
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Achado Otoscópico Principal</label>
                <select
                  className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  value={current.left || ''}
                  onChange={e => {
                    const val = e.target.value as any;
                    let desc = current.leftDescription || '';
                    if (val === 'normal' && !desc) desc = 'Conduto livre, membrana timpânica íntegra e translúcida com triângulo luminoso presente.';
                    if (val === 'cerumen' && !desc) desc = 'Presença de rolha de cerúmen oclusivo no terço externo/médio do MAE.';
                    if (val === 'perforation' && !desc) desc = 'Perfuração de membrana timpânica em pars tensa.';
                    updateField({ 
                      left: val, 
                      leftDescription: desc,
                      referToENT: val && val !== 'normal' ? true : current.referToENT 
                    });
                  }}
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
                  placeholder="Ex: Tímpano íntegro, cone de luz preservado..."
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
