import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AudiologicalOpinion, EarTonalData, LogoAudiometryData, TympanometryData, Meatoscopy, ComplementaryTests } from '@/db/db';
import {
  generateSmartAudiologicalReport,
  DegreeStandard
} from '@/lib/audiologyCalculations';
import {
  FileText,
  Sparkles,
  ClipboardList,
  Wand2
} from 'lucide-react';

interface Props {
  opinion?: AudiologicalOpinion;
  resultAndConduct: string;
  onChangeOpinion: (opinion: AudiologicalOpinion) => void;
  onChangeConduct: (text: string) => void;
  examData: {
    tonalData: { right: Partial<EarTonalData>; left: Partial<EarTonalData> };
    logoAudiometry: { right: LogoAudiometryData; left: LogoAudiometryData };
    tympanometry: { right: TympanometryData; left: TympanometryData };
    meatoscopy?: Meatoscopy;
    complementary?: ComplementaryTests;
    examCategory?: 'clinico' | 'ocupacional';
  };
  standard?: DegreeStandard;
  onStandardChange?: (std: DegreeStandard) => void;
}

export default function AudiologicalOpinionSummary({
  opinion,
  resultAndConduct,
  onChangeOpinion,
  onChangeConduct,
  examData,
  standard = 'OMS_2021',
  onStandardChange
}: Props) {
  const currentOpinion: AudiologicalOpinion = opinion || {};
  const [selectedStandard, setSelectedStandard] = useState<DegreeStandard>(standard);

  const handleGenerateSmartReport = () => {
    const report = generateSmartAudiologicalReport({
      rightTonal: examData.tonalData.right,
      leftTonal: examData.tonalData.left,
      rightLogo: examData.logoAudiometry.right,
      leftLogo: examData.logoAudiometry.left,
      rightTymp: examData.tympanometry.right,
      leftTymp: examData.tympanometry.left,
      meatoscopy: examData.meatoscopy,
      complementary: examData.complementary,
      category: examData.examCategory,
      standard: selectedStandard
    });

    onChangeOpinion({
      ...currentOpinion,
      clinical: report.clinicalSummary.split('\n')[0] || 'Audição dentro dos padrões de normalidade',
      lossTypeRight: report.rightOpinion.type,
      lossDegreeRight: report.rightOpinion.degree,
      configurationRight: report.rightOpinion.configuration,
      lossTypeLeft: report.leftOpinion.type,
      lossDegreeLeft: report.leftOpinion.degree,
      configurationLeft: report.leftOpinion.configuration
    });

    const fullLaudo = `${report.clinicalSummary}\n\nCONDUTA E RECOMENDAÇÕES:\n${report.conductSuggestion}`;
    onChangeConduct(fullLaudo);
  };

  const applyConductTemplate = (template: 'normal' | 'aasi' | 'otorrino' | 'ocupacional') => {
    let conduct = '';
    if (template === 'normal') {
      conduct = '1. Audição dentro dos padrões de normalidade bilateralmente.\n2. Manutenção dos cuidados de saúde auditiva.\n3. Reavaliação audiológica de rotina em 1 (um) ano ou se houver queixas.';
    } else if (template === 'aasi') {
      conduct = '1. Perda auditiva passível de reabilitação auditiva.\n2. Indicação de avaliação e adaptação de Aparelho de Amplificação Sonora Individual (AASI) bilateral.\n3. Encaminhamento para avaliação otorrinolaringológica e acompanhamento fonoaudiológico.';
    } else if (template === 'otorrino') {
      conduct = '1. Presença de achados audiológicos / meatoscópicos sugestivos de alteração de orelha média/externa.\n2. Encaminhamento imediato para avaliação e conduta com Médico Otorrinolaringologista.\n3. Retorno para reavaliação audiológica pós-tratamento.';
    } else if (template === 'ocupacional') {
      conduct = '1. Exame audiológico de caráter ocupacional (NR-7).\n2. Reforçar o uso contínuo e fiscalização adequada do Protetor Auditivo (EPI).\n3. Inclusão no Programa de Conservação Auditiva (PCA) e audiometria de controle sequencial anual.';
    }

    const currentBase = resultAndConduct ? resultAndConduct.split('CONDUTA')[0].trim() : '';
    const newText = currentBase ? `${currentBase}\n\nCONDUTA:\n${conduct}` : conduct;
    onChangeConduct(newText);
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior com Gerador Inteligente */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white shadow-sm overflow-hidden">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              <h3 className="text-base font-bold text-slate-800">
                Gerador Automático de Parecer &amp; Laudo Fonoaudiológico
              </h3>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl">
              Cruza automaticamente os limiares tonais (VA e VO), logoaudiometria (LRF/IPRF), timpanometria de Jerger, reflexos de Metz e meatoscopia em conformidade com as diretrizes do CFFa e SBFa.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col text-right">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Referência de Grau</label>
              <select
                className="h-8 text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2 py-0.5"
                value={selectedStandard}
                onChange={e => {
                  const val = e.target.value as DegreeStandard;
                  setSelectedStandard(val);
                  if (onStandardChange) onStandardChange(val);
                }}
              >
                <option value="OMS_2021">OMS 2021 (Global Report)</option>
                <option value="OMS_2014">OMS 2014 / Davis &amp; Silverman</option>
                <option value="LLOYD_KAPLAN">Lloyd &amp; Kaplan (1978)</option>
              </select>
            </div>

            <Button
              type="button"
              onClick={handleGenerateSmartReport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold shadow-sm h-10 px-4 rounded-xl"
            >
              <Wand2 className="w-4 h-4" /> Gerar Laudo Inteligente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Classificações Audiológicas por Orelha */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            Classificação Formal do Parecer Audiológico
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Definição taxonômica do tipo, grau e configuração da audição para cada orelha.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OD */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/20 space-y-3">
              <span className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                Orelha Direita (OD)
              </span>

              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tipo de Perda (Silman &amp; Silverman)</label>
                  <Input
                    className="h-8 text-xs bg-white font-medium"
                    placeholder="Ex: Audição Normal, Neurossensorial, Condutiva, Mista..."
                    value={currentOpinion.lossTypeRight || ''}
                    onChange={e => onChangeOpinion({ ...currentOpinion, lossTypeRight: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Grau de Perda ({selectedStandard})</label>
                  <Input
                    className="h-8 text-xs bg-white font-medium"
                    placeholder="Ex: Normal, Leve, Moderado..."
                    value={currentOpinion.lossDegreeRight || ''}
                    onChange={e => onChangeOpinion({ ...currentOpinion, lossDegreeRight: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Configuração Audiométrica</label>
                  <Input
                    className="h-8 text-xs bg-white font-medium"
                    placeholder="Ex: Plana, Descendente Leve, Entalhe..."
                    value={currentOpinion.configurationRight || ''}
                    onChange={e => onChangeOpinion({ ...currentOpinion, configurationRight: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* OE */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-3">
              <span className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Orelha Esquerda (OE)
              </span>

              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tipo de Perda (Silman &amp; Silverman)</label>
                  <Input
                    className="h-8 text-xs bg-white font-medium"
                    placeholder="Ex: Audição Normal, Neurossensorial, Condutiva, Mista..."
                    value={currentOpinion.lossTypeLeft || ''}
                    onChange={e => onChangeOpinion({ ...currentOpinion, lossTypeLeft: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Grau de Perda ({selectedStandard})</label>
                  <Input
                    className="h-8 text-xs bg-white font-medium"
                    placeholder="Ex: Normal, Leve, Moderado..."
                    value={currentOpinion.lossDegreeLeft || ''}
                    onChange={e => onChangeOpinion({ ...currentOpinion, lossDegreeLeft: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Configuração Audiométrica</label>
                  <Input
                    className="h-8 text-xs bg-white font-medium"
                    placeholder="Ex: Plana, Descendente Leve, Entalhe..."
                    value={currentOpinion.configurationLeft || ''}
                    onChange={e => onChangeOpinion({ ...currentOpinion, configurationLeft: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Classificação Clínica Síntese</label>
            <Input
              className="h-9 text-xs bg-white font-medium"
              placeholder="Ex: Audição dentro dos padrões de normalidade bilateralmente"
              value={currentOpinion.clinical || ''}
              onChange={e => onChangeOpinion({ ...currentOpinion, clinical: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Parecer Final e Conduta Fonoaudiológica */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Laudo Descritivo Oficial e Conduta Fonoaudiológica
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Texto que será impresso no laudo em PDF e no prontuário do paciente.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Modelos:</span>
            <button
              type="button"
              onClick={() => applyConductTemplate('normal')}
              className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => applyConductTemplate('aasi')}
              className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              AASI
            </button>
            <button
              type="button"
              onClick={() => applyConductTemplate('otorrino')}
              className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              Otorrino
            </button>
            <button
              type="button"
              onClick={() => applyConductTemplate('ocupacional')}
              className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              PCA Ocupacional
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <textarea
            className="flex min-h-[180px] w-full rounded-xl border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            placeholder="Digite ou gere automaticamente o laudo e as condutas clínicas fonoaudiológicas aqui..."
            value={resultAndConduct || ''}
            onChange={e => onChangeConduct(e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
