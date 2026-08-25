import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AudiologicalOpinion, EarTonalData, LogoAudiometryData, TympanometryData, Meatoscopy, ComplementaryTests, EarReflexData } from '@/db/db';
import { DegreeStandard } from '@/lib/audiologyCalculations';
import { generateAIAudiologyReport, ReportStyle } from '@/services/aiAudiologyService';
import {
  FileText,
  Sparkles,
  ClipboardList,
  Wand2,
  CheckCircle2,
  RefreshCw,
  Stethoscope,
  Building2,
  Ear,
  FileCheck,
  Zap
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
    reflexes?: { right: Partial<EarReflexData>; left: Partial<EarReflexData> };
    meatoscopy?: Meatoscopy;
    complementary?: ComplementaryTests;
    examCategory?: 'clinico' | 'ocupacional';
    patientName?: string;
    patientAge?: number | string;
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
  const [reportStyle, setReportStyle] = useState<ReportStyle>('padrao');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState(false);
  const [engineUsed, setEngineUsed] = useState<'local' | 'cloud' | null>(null);

  const handleGenerateSmartReport = async (styleToUse: ReportStyle = reportStyle) => {
    setIsGenerating(true);
    setGeneratedSuccess(false);

    try {
      const result = await generateAIAudiologyReport(
        {
          patientName: examData.patientName,
          patientAge: examData.patientAge,
          category: examData.examCategory,
          standard: selectedStandard,
          tonalData: examData.tonalData,
          logoAudiometry: examData.logoAudiometry,
          tympanometry: examData.tympanometry,
          reflexes: examData.reflexes,
          meatoscopy: examData.meatoscopy,
          complementary: examData.complementary
        },
        styleToUse
      );

      // Preenche os campos taxonômicos da opinião
      onChangeOpinion({
        ...currentOpinion,
        clinical: result.opinion.clinical,
        lossTypeRight: result.opinion.lossTypeRight,
        lossDegreeRight: result.opinion.lossDegreeRight,
        configurationRight: result.opinion.configurationRight,
        lossTypeLeft: result.opinion.lossTypeLeft,
        lossDegreeLeft: result.opinion.lossDegreeLeft,
        configurationLeft: result.opinion.configurationLeft
      });

      // Preenche o texto oficial do laudo
      onChangeConduct(result.fullLaudo);

      setEngineUsed(result.aiProviderUsed === 'local_expert' ? 'local' : 'cloud');
      setGeneratedSuccess(true);
      setTimeout(() => setGeneratedSuccess(false), 4000);
    } catch (error) {
      console.error('Erro ao gerar laudo:', error);
    } finally {
      setIsGenerating(false);
    }
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
    const newText = currentBase ? `${currentBase}\n\nCONDUTA E RECOMENDAÇÕES:\n${conduct}` : conduct;
    onChangeConduct(newText);
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior com Assistente de IA Especialista */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-white shadow-sm overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            {/* Título e Explicação */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Copiloto de IA &amp; Gerador de Laudos Fonoaudiológicos
                    {generatedSuccess && (
                      <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300 animate-in fade-in">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Laudo gerado ({engineUsed === 'cloud' ? 'IA Cloud' : 'Motor Clínico'})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Cruza automaticamente todos os achados (VA, VO, mascaramento, LRF/IPRF, timpanometria de Jerger, reflexos e meatoscopia) com fundamentação científica.
                  </p>
                </div>
              </div>
            </div>

            {/* Controles de Configuração e Disparo */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              {/* Seletor de Estilo */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Foco do Laudo</label>
                <select
                  className="h-9 text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500"
                  value={reportStyle}
                  onChange={e => {
                    const style = e.target.value as ReportStyle;
                    setReportStyle(style);
                  }}
                >
                  <option value="padrao">🩺 Padrão Clínico (CFFa / SBFa)</option>
                  <option value="ocupacional">🏢 Ocupacional (NR-7 / PCA)</option>
                  <option value="aasi">🦻 Justificativa de AASI</option>
                  <option value="otorrino">👨‍⚕️ Encaminhamento Otorrino</option>
                  <option value="sintese">⚡ Resumo Executivo</option>
                </select>
              </div>

              {/* Seletor de Referência */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Classificação de Grau</label>
                <select
                  className="h-9 text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500"
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

              {/* Botão de Geração com IA */}
              <div className="flex flex-col justify-end pt-3.5">
                <Button
                  type="button"
                  onClick={() => handleGenerateSmartReport(reportStyle)}
                  disabled={isGenerating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold shadow-md shadow-indigo-500/20 h-9 px-5 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processando IA...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 text-indigo-200" />
                      <span>Gerar Laudo Inteligente</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

          </div>

          {/* Atalhos Rápidos de Refinamento */}
          <div className="pt-2 border-t border-indigo-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Predefinições com 1 Clique:
            </span>
            <button
              type="button"
              onClick={() => {
                setReportStyle('padrao');
                handleGenerateSmartReport('padrao');
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium hover:bg-indigo-50/50 shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Stethoscope className="w-3 h-3 text-indigo-600" /> Clínico CFFa
            </button>
            <button
              type="button"
              onClick={() => {
                setReportStyle('ocupacional');
                handleGenerateSmartReport('ocupacional');
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium hover:bg-indigo-50/50 shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Building2 className="w-3 h-3 text-blue-600" /> Ocupacional NR-7
            </button>
            <button
              type="button"
              onClick={() => {
                setReportStyle('aasi');
                handleGenerateSmartReport('aasi');
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium hover:bg-indigo-50/50 shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Ear className="w-3 h-3 text-purple-600" /> Indicação AASI
            </button>
            <button
              type="button"
              onClick={() => {
                setReportStyle('sintese');
                handleGenerateSmartReport('sintese');
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-medium hover:bg-indigo-50/50 shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileCheck className="w-3 h-3 text-emerald-600" /> Síntese Médica
            </button>
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
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Laudo Descritivo Oficial e Conduta Fonoaudiológica
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Texto redigido e editável que será impresso no laudo em PDF e prontuário.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Condutas Rápidas:</span>
            <button
              type="button"
              onClick={() => applyConductTemplate('normal')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => applyConductTemplate('aasi')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              AASI
            </button>
            <button
              type="button"
              onClick={() => applyConductTemplate('otorrino')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              Otorrino
            </button>
            <button
              type="button"
              onClick={() => applyConductTemplate('ocupacional')}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              PCA Ocupacional
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <textarea
            className="flex min-h-[220px] w-full rounded-xl border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono shadow-inner"
            placeholder="Digite ou clique em 'Gerar Laudo Inteligente' para que o copiloto de IA analise todos os exames e redija o laudo completo..."
            value={resultAndConduct || ''}
            onChange={e => onChangeConduct(e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
