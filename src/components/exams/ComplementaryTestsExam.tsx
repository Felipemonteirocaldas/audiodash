import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ComplementaryTests, EarTonalData } from '@/db/db';
import {
  Activity,
  Headphones,
  Waves
} from 'lucide-react';

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

  const updateWeberFreq = (freq: '500' | '1000' | '2000' | '4000', val: any) => {
    const updatedFreqs = {
      ...(current.weberFreqs || {}),
      [freq]: val
    };
    
    // Auto-generate text summary
    const values = Object.entries(updatedFreqs).filter(([_, v]) => v);
    let summary = '';
    if (values.length > 0) {
      summary = values.map(([f, v]) => `${f}Hz: ${v === 'indiferente' ? 'Indiferente' : v === 'od' ? 'Lateralizado para OD' : 'Lateralizado para OE'}`).join(' | ');
    }

    onChange({
      ...current,
      weberFreqs: updatedFreqs,
      weber: summary || current.weber
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Teste de Weber Audiométrico */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Headphones className="w-4 h-4 text-indigo-600" />
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
                    onChange={e => updateWeberFreq(freq, e.target.value)}
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
                placeholder="Ex: Weber indiferente em todas as frequências testadas"
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
              <Activity className="w-4 h-4 text-indigo-600" />
              2. Testes de Fadiga Tonal (Tone Decay) &amp; SISI
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Investigação de fadiga patológica (Carhart / Rosenberg) e sensibilidade a pequenos incrementos.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-red-600 block mb-1">Tone Decay OD</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: Negativo (0 dB)"
                  value={current.toneDecayDetails?.right || ''}
                  onChange={e => updateField('toneDecayDetails', { ...(current.toneDecayDetails || {}), right: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-blue-600 block mb-1">Tone Decay OE</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: Negativo (0 dB)"
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
                  placeholder="Ex: 10% (Normal)"
                  value={current.sisi?.right || ''}
                  onChange={e => updateField('sisi', { ...(current.sisi || {}), right: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-blue-600 block mb-1">SISI Test OE (%)</label>
                <Input
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: 10% (Normal)"
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
            <Waves className="w-4 h-4 text-indigo-600" />
            3. Emissões Otoacústicas (EOA) &amp; PEATE / BERA
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Triagem auditiva neonatal e avaliação coclear/eletrofisiológica do nervo auditivo.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EOA */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Emissões Otoacústicas Evocadas (EOA)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-red-600 block mb-0.5">OD</label>
                  <select
                    className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2"
                    value={current.eoa?.right || ''}
                    onChange={e => updateField('eoa', { ...(current.eoa || {}), right: e.target.value })}
                  >
                    <option value="">Não realizado</option>
                    <option value="presente">Presente (Passa)</option>
                    <option value="ausente">Ausente (Falha)</option>
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
                    <option value="presente">Presente (Passa)</option>
                    <option value="ausente">Ausente (Falha)</option>
                    <option value="parcial">Parcial</option>
                  </select>
                </div>
              </div>
              <Input
                className="h-7 text-xs bg-white"
                placeholder="Observações EOA (ex: EOAT presentes em 1 a 4 kHz)"
                value={current.eoa?.notes || ''}
                onChange={e => updateField('eoa', { ...(current.eoa || {}), notes: e.target.value })}
              />
            </div>

            {/* PEATE / BERA */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">PEATE / BERA (Eletrofisiologia)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-red-600 block mb-0.5">Latências OD (ms)</label>
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="Ex: I: 1.6ms, III: 3.7ms, V: 5.6ms"
                    value={current.bera?.right || ''}
                    onChange={e => updateField('bera', { ...(current.bera || {}), right: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-blue-600 block mb-0.5">Latências OE (ms)</label>
                  <Input
                    className="h-8 text-xs bg-white"
                    placeholder="Ex: I: 1.6ms, III: 3.7ms, V: 5.6ms"
                    value={current.bera?.left || ''}
                    onChange={e => updateField('bera', { ...(current.bera || {}), left: e.target.value })}
                  />
                </div>
              </div>
              <Input
                className="h-7 text-xs bg-white"
                placeholder="Intervalos interpicos I-III, III-V, I-V normais..."
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
