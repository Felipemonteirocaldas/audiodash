import ClinicalEvidence from './ClinicalEvidence';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ComplementaryTests, EarTonalData } from '@/db/db';
import { updateWeber } from '@/lib/examForm';
interface Props {
  complementary?: ComplementaryTests;
  tonalData?: {
    right: Partial<EarTonalData>;
    left: Partial<EarTonalData>;
  };
  onChange: (data: ComplementaryTests) => void;
}

export default function ComplementaryTestsExam({ complementary, onChange }: Props) {
  const current: ComplementaryTests = complementary || {};

  const updateField = (key: keyof ComplementaryTests, value: any) => {
    onChange({
      ...current,
      [key]: value
    });
  };

  // O texto do Weber só é regenerado se estiver vazio ou ainda igual ao resumo automático.
  const updateWeberFreq = (freq: '500' | '1000' | '2000' | '4000', val: '' | 'indiferente' | 'od' | 'oe') => onChange(updateWeber(current, freq, val));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Teste de Weber Audiométrico */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              1. Teste de Weber Audiométrico (Diapasão / Via Óssea)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Posicionamento do vibrador ósseo na linha média da fronte / vértex nas frequências de 500 a 4000 Hz.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['500', '1000', '2000', '4000'] as const).map(freq => (
                <div key={freq} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">{freq} Hz</span>
                  <select
                    className="w-full text-xs rounded border border-slate-300 bg-white p-1"
                    value={current.weberFreqs?.[freq] || ''}
                    onChange={e => updateWeberFreq(freq, e.target.value as '' | 'indiferente' | 'od' | 'oe')}
                  >
                    <option value="">Selecione...</option>
                    <option value="indiferente">Indiferente (Central)</option>
                    <option value="od">Lateraliza p/ OD</option>
                    <option value="oe">Lateraliza p/ OE</option>
                  </select>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Síntese / Descrição do Weber</label>
              <Input
                className="h-8 text-xs bg-white"
                placeholder="Registre a resposta nas frequências pesquisadas"
                value={current.weber || ''}
                onChange={e => updateField('weber', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Tone Decay & SISI */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              2. Testes de Fadiga Tonal (Tone Decay) &amp; SISI
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Registre o protocolo aplicado, as condições de pesquisa e o resultado obtido.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-red-600 block mb-1">Tone Decay OD</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Resultado e condições de pesquisa"
                  value={current.toneDecayDetails?.right || ''}
                  onChange={e => updateField('toneDecayDetails', { ...(current.toneDecayDetails || {}), right: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-blue-600 block mb-1">Tone Decay OE</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Resultado e condições de pesquisa"
                  value={current.toneDecayDetails?.left || ''}
                  onChange={e => updateField('toneDecayDetails', { ...(current.toneDecayDetails || {}), left: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-red-600 block mb-1">SISI Test OD (%)</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Percentual obtido e protocolo utilizado"
                  value={current.sisi?.right || ''}
                  onChange={e => updateField('sisi', { ...(current.sisi || {}), right: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-blue-600 block mb-1">SISI Test OE (%)</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Percentual obtido e protocolo utilizado"
                  value={current.sisi?.left || ''}
                  onChange={e => updateField('sisi', { ...(current.sisi || {}), left: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Emissões Otoacústicas (EOA) e Eletrofisiologia (PEATE / BERA) */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            3. Emissões Otoacústicas (EOA) &amp; PEATE / BERA
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Registro resumido de EOA e PEATE obtidos em equipamento externo; documente o protocolo e consulte o registro original.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <ClinicalEvidence sources={['AAA_2020', 'MCCREERY_2015']} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EOA */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Emissões Otoacústicas Evocadas (EOA)</span>
              <label className="block text-xs">Tipo<select aria-label="Tipo de EOA" className="block border rounded p-2 bg-white w-full" value={current.eoa?.type || ''} onChange={e => updateField('eoa', { ...current.eoa, type: e.target.value })}><option value="">Não informado</option><option value="transiente">EOAT</option><option value="distorcao">EOAPD</option></select></label>
              <label className="block text-xs">Protocolo, frequências e critério do equipamento<Input aria-label="Protocolo EOA" value={current.eoa?.protocol || ''} onChange={e => updateField('eoa', { ...current.eoa, protocol: e.target.value })} /></label>
              <label className="block text-xs">Qualidade do registro e ruído residual<Input aria-label="Qualidade EOA" value={current.eoa?.quality || ''} onChange={e => updateField('eoa', { ...current.eoa, quality: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-red-600 block mb-0.5">OD</label>
                  <select
                    className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2"
                    value={current.eoa?.right || ''}
                    onChange={e => updateField('eoa', { ...(current.eoa || {}), right: e.target.value })}
                  >
                    <option value="">Não realizado</option>
                    <option value="presente">Presente (resultado registrado)</option>
                    <option value="ausente">Ausente (resultado registrado)</option>
                    <option value="parcial">Parcial</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-blue-600 block mb-0.5">OE</label>
                  <select
                    className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2"
                    value={current.eoa?.left || ''}
                    onChange={e => updateField('eoa', { ...(current.eoa || {}), left: e.target.value })}
                  >
                    <option value="">Não realizado</option>
                    <option value="presente">Presente (resultado registrado)</option>
                    <option value="ausente">Ausente (resultado registrado)</option>
                    <option value="parcial">Parcial</option>
                  </select>
                </div>
              </div>
              <Input
                className="h-7 text-xs bg-white"
                placeholder="Frequências avaliadas e resultados do registro original"
                value={current.eoa?.notes || ''}
                onChange={e => updateField('eoa', { ...(current.eoa || {}), notes: e.target.value })}
              />
            </div>

            {/* PEATE / BERA */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">PEATE / BERA (Eletrofisiologia)</span>
              <label className="block text-xs">Protocolo de aquisição e referência<Input aria-label="Protocolo PEATE" value={current.bera?.protocol || ''} onChange={e => updateField('bera', { ...current.bera, protocol: e.target.value })} /></label>
              <label className="block text-xs">Estímulo, frequência e taxa de apresentação<Input aria-label="Estímulo PEATE" value={current.bera?.stimulus || ''} onChange={e => updateField('bera', { ...current.bera, stimulus: e.target.value })} /></label>
              <label className="block text-xs">Nível de apresentação e unidade (nHL/eHL/SPL)<Input aria-label="Nível PEATE" value={current.bera?.levelAndUnit || ''} onChange={e => updateField('bera', { ...current.bera, levelAndUnit: e.target.value })} /></label>
              <p className="text-xs text-slate-500">A unidade e a correção pertencem ao protocolo. Este registro não converte automaticamente PEATE em limiar comportamental.</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-red-600 block mb-0.5">Latências OD (ms)</label>
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="Latências identificadas no registro original, em ms"
                    value={current.bera?.right || ''}
                    onChange={e => updateField('bera', { ...(current.bera || {}), right: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-blue-600 block mb-0.5">Latências OE (ms)</label>
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="Latências identificadas no registro original, em ms"
                    value={current.bera?.left || ''}
                    onChange={e => updateField('bera', { ...(current.bera || {}), left: e.target.value })}
                  />
                </div>
              </div>
              <Input
                className="h-7 text-xs bg-white"
                placeholder="Registre interpicos, condições de coleta e interpretação do laudo original"
                value={current.bera?.notes || ''}
                onChange={e => updateField('bera', { ...(current.bera || {}), notes: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
