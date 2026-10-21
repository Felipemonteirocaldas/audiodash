import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LogoAD } from '@/components/LogoAD';
import {
  Stethoscope,
  Users,
  Calendar,
  Activity,
  Database,
  Search,
  BookOpen,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Keyboard,
  Sliders,
  Lock,
  WifiOff,
  CloudCheck,
  ChevronDown,
  ChevronRight,
  Info,
  Layers,
  FileCheck2,
  MousePointerClick,
  Eye
} from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  category: string;
  icon: any;
  badge?: string;
  summary: string;
  content: React.ReactNode;
}

export default function Manual() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [expandedFaq, setExpandedFaq] = useState<Record<string, boolean>>({
    'faq-1': true,
    'faq-2': false,
    'faq-3': false,
    'faq-4': false,
    'faq-5': false,
    'faq-6': false,
  });

  const categories = [
    { id: 'todos', label: 'Todos os Tópicos' },
    { id: 'inicio', label: 'Primeiros Passos' },
    { id: 'pacientes', label: 'Pacientes & Prontuário' },
    { id: 'exames', label: 'Exames & Audiometria' },
    { id: 'laudos', label: 'Laudos & Pareceres' },
    { id: 'agenda', label: 'Agenda & Lembretes' },
    { id: 'offline', label: 'Offline & Segurança' },
    { id: 'metodos', label: 'Métodos de Entrada & Atalhos' },
    { id: 'faq', label: 'Dúvidas Frequentes (FAQ)' },
  ];

  const toggleFaq = (id: string) => {
    setExpandedFaq(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const topics: Topic[] = useMemo(() => [
    {
      id: 'primeiros-passos',
      title: '1. Primeiros Passos e Configuração da Clínica',
      category: 'inicio',
      icon: null,
      badge: 'Essencial',
      summary: 'Configuração dos dados da clínica, logotipo nos laudos, registro profissional CRFa e parâmetros padrão.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            Ao acessar o AudioDash pela primeira vez, personalize as informações cadastrais para que todos os relatórios, pareceres e laudos impressos ou exportados em PDF saiam devidamente identificados e em total conformidade ética.
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              Etapas de Configuração Recomendadas:
            </h4>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Acesse o menu <strong>Configurações</strong> na barra lateral esquerda.</li>
              <li>Preencha a <strong>Razão Social / Nome Fantasia da Clínica</strong>, CNPJ/CPF, Telefone, WhatsApp de contato e Endereço completo.</li>
              <li>Insira seu nome profissional completo e o <strong>Registro CRFa</strong> (Conselho Regional de Fonoaudiologia) correspondente à sua jurisdição.</li>
              <li>Faça o upload do <strong>Logotipo da Clínica</strong> (PNG com fundo transparente ou JPG em alta resolução). Esse logotipo é inserido no cabeçalho dos laudos audiométricos.</li>
              <li>Escolha o <strong>Padrão de Classificação Audiológica Padrão</strong> no exame: as classificações do Guia CFFa (2023) — OMS 2021, Lloyd e Kaplan (1978), Kaplan, Gladstone e Lloyd (1993), Davis (1970), BIAP (1996) e, para crianças, Northern e Downs (2005) ou OMS. Nenhuma é “mais certa”: a escolha é do profissional e deve ser citada no laudo.</li>
            </ol>
          </div>
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              <strong>Dica de Prática Clínica:</strong> Todos os dados do carimbo profissional e CRFa são preservados nas versões digitais e impressas, atendendo às exigências dos Conselhos Regionais e Federal de Fonoaudiologia.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard',
      title: '2. Painel Central & Monitoramento de Atendimentos',
      category: 'inicio',
      icon: Activity,
      summary: 'Visão panorâmica dos atendimentos diários, métricas de produtividade e atalhos rápidos.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            O <strong>Dashboard</strong> é a central diária do consultório, projetada para proporcionar leitura imediata do fluxo de pacientes e acesso instantâneo às principais ferramentas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 text-sm block mb-1">📅 Atendimentos do Dia</span>
              <p className="text-xs text-slate-600">Lista cronológica dos pacientes agendados com indicação de status (Pendente, Em Atendimento, Concluído).</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 text-sm block mb-1">⚡ Ações Rápidas</span>
              <p className="text-xs text-slate-600">Botões diretos para iniciar Novo Exame, Cadastrar Paciente ou Agendar Consulta sem navegar por múltiplos menus.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 text-sm block mb-1">📊 Métricas Clínicas</span>
              <p className="text-xs text-slate-600">Total de exames executados no período, novos pacientes cadastrados e comparativos de volume.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 text-sm block mb-1">📴 Monitor de Conexão</span>
              <p className="text-xs text-slate-600">Status em tempo real de gravação local (IndexedDB) e sincronização com o banco em nuvem.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pacientes',
      title: '3. Gestão de Pacientes & Prontuário Unificado',
      category: 'pacientes',
      icon: Users,
      badge: 'Prontuário',
      summary: 'Ficha cadastral completa, histórico cronológico de avaliações, busca global e segurança de dados.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            O módulo de <strong>Pacientes</strong> organiza o histórico fonoaudiológico individual de forma contínua e integrada.
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
              <div>
                <strong className="text-slate-900">Cadastro Detalhado:</strong> Nome completo, data de nascimento com cálculo instantâneo de faixa etária, gênero, CPF, contatos telefônicos (com link para WhatsApp), e-mail e profissão/ocupação (fundamental para histórico de ruído ocupacional).
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
              <div>
                <strong className="text-slate-900">Histórico de Exames & Audiogramas:</strong> Na ficha de cada paciente, acesse a linha do tempo completa de audiometrias, imitanciometrias e evoluções, com visualização rápida e reemissão de laudos.
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
              <div>
                <strong className="text-slate-900">Busca Global Instantânea:</strong> Pressione <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-xs font-mono">Ctrl + K</kbd> (ou <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-xs font-mono">Cmd + K</kbd>) em qualquer tela para localizar pacientes por nome, CPF ou telefone.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'meatoscopia-anamnese',
      title: '4. Meatoscopia (Otoscopia) e Anamnese Especializada',
      category: 'pacientes',
      icon: Eye,
      summary: 'Inspeção do Meato Acústico Externo e Membrana Timpânica antes do exame e questionário audiológico.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            De acordo com as boas práticas da Fonoaudiologia Clínica, a <strong>Meatoscopia</strong> é a primeira etapa mandatória antes de acoplar fones ou realizar testes audiológicos:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h5 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                Meatoscopia / Inspeção Otológica
              </h5>
              <ul className="list-disc pl-4 text-xs space-y-1 text-slate-600">
                <li>Inspeção de Orelha Direita (OD) e Orelha Esquerda (OE).</li>
                <li>Identificação de condutos livres ou presença de cerúmen (parcial / oclusivo).</li>
                <li>Verificação de integridade da Membrana Timpânica (MT íntegra, perfuração, retração, secreção ou sinais flogísticos).</li>
                <li>Registro prévio para determinar a viabilidade imediata da audiometria e timpanometria.</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h5 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                Anamnese Fonoaudiológica Completa
              </h5>
              <ul className="list-disc pl-4 text-xs space-y-1 text-slate-600">
                <li>Queixa principal e tempo de início da perda ou desconforto.</li>
                <li>Zumbido (lateralidade, tipo de som, frequência e impacto na rotina).</li>
                <li>Tontura / vertigem e manifestações vestibulares associadas.</li>
                <li>Exposição a ruído ocupacional ou de lazer e uso de EPIs.</li>
                <li>Histórico de otites, antecedentes familiares e uso de fármacos ototóxicos.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'audiometria-tonal-vocal',
      title: '5. Audiometria Tonal Limiar & Logoaudiometria (Vocal)',
      category: 'exames',
      icon: Stethoscope,
      badge: 'Principal',
      summary: 'Metodologia de teste, via aérea, via óssea, símbolos internacionais ISO/ASHA, mascaramento e logoaudiometria.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            O módulo de audiometria do AudioDash segue estritamente as recomendações do CFFa, ASHA e ISO 8253 para avaliação dos limiares auditivos.
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h5 className="font-bold text-slate-900 text-sm">Boas Práticas de Execução do Exame:</h5>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Ordem de Frequências (Via Aérea):</strong> Iniciar pela orelha de melhor audição (ou OD se simétrica), começando em 1.000 Hz, progredindo para 2k, 3k, 4k, 6k e 8k Hz, retestando 1.000 Hz e finalizando em 500, 250 e 125 Hz.</li>
              <li><strong>Via Óssea:</strong> Testada nas frequências de 250 Hz a 4.000 Hz quando os limiares de via aérea forem superiores a 25 dB NA (ou na presença de queixas de perda condutiva).</li>
              <li><strong>Critério de Mascaramento:</strong>
                <ul className="list-circle pl-4 mt-1 space-y-0.5">
                  <li><strong>Via Aérea:</strong> Quando a diferença entre o limiar de VA da orelha testada e o limiar de VO (ou VA) da orelha oposta for ≥ 40 dB (fones supra-aurais TDH-39) ou ≥ 60 dB (fones de inserção ER-3A).</li>
                  <li><strong>Via Óssea:</strong> Quando houver gap aéreo-ósseo ≥ 10 dB ou ≥ 15 dB na orelha testada.</li>
                </ul>
              </li>
            </ul>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 text-sm flex items-center justify-between">
              <span>Simbologia Audiométrica Padronizada (ANSI / ISO / CFFa)</span>
              <span className="text-xs font-normal text-slate-500">OD Vermelho | OE Azul</span>
            </div>
            <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 text-red-950">
                <strong className="text-red-700 font-bold block mb-1 text-sm">Orelha Direita (OD) - Cor Vermelha</strong>
                <ul className="space-y-1">
                  <li><strong>VA sem Mascaramento:</strong> Círculo <code>O</code></li>
                  <li><strong>VA com Mascaramento:</strong> Triângulo <code>△</code></li>
                  <li><strong>VO sem Mascaramento:</strong> Sinal menor que <code>&lt;</code></li>
                  <li><strong>VO com Mascaramento:</strong> Colchete aberto <code>[</code></li>
                  <li><strong>Ausência de Resposta (NR):</strong> Símbolo com seta descendente a 45°</li>
                </ul>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-950">
                <strong className="text-blue-700 font-bold block mb-1 text-sm">Orelha Esquerda (OE) - Cor Azul</strong>
                <ul className="space-y-1">
                  <li><strong>VA sem Mascaramento:</strong> Xis <code>X</code></li>
                  <li><strong>VA com Mascaramento:</strong> Quadrado <code>□</code></li>
                  <li><strong>VO sem Mascaramento:</strong> Sinal maior que <code>&gt;</code></li>
                  <li><strong>VO com Mascaramento:</strong> Colchete fechado <code>]</code></li>
                  <li><strong>Ausência de Resposta (NR):</strong> Símbolo com seta descendente a 45°</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-slate-900 text-sm">Logoaudiometria (Audiometria Vocal):</h5>
            <p className="text-sm">
              Integração dos testes de reconhecimento de fala com verificação de concordância biológica:
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li><strong>LRF / SRT (Limiar de Reconhecimento de Fala):</strong> Deve ser compatível com a média tritonal da audiometria tonal (+/- 10 dB).</li>
              <li><strong>IPRF / SDSR (Índice de Reconhecimento de Fala):</strong> Testado a 30-40 dB NS acima do LRF, registrando a porcentagem de acertos em listas de monossílabos e dissílabos.</li>
              <li><strong>SDT / LAF (Limiar de Detecção de Voz):</strong> Aplicado quando não for possível obter o LRF (ex: perdas profundas ou crianças pequenas).</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'imitanciometria-eoa',
      title: '6. Imitanciometria (Timpanometria) & EOA / PEATE',
      category: 'exames',
      icon: Activity,
      summary: 'Registro da timpanometria (Jerger em 226 Hz; normal/alterada em 1000 Hz), reflexos acústicos e testes eletrofisiológicos.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            Avaliação funcional da orelha média e das vias auditivas centrais e periféricas:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 text-sm block mb-1">Curvas timpanométricas:</strong>
              <ul className="space-y-1 text-slate-600">
                <li><strong>Sonda de 226 Hz:</strong> tipos de Jerger (A, Ar/As, Ad, B, C) para orelhas não operadas (SBFa, 2025).</li>
                <li><strong>Sonda de 1000 Hz (lactentes):</strong> curva classificada como normal ou alterada.</li>
                <li>O tipo é registrado pelo profissional com a referência normativa, a unidade (ml ou mmho) e as condições do exame. Os valores de referência variam por idade, sonda e equipamento; o sistema não classifica a curva automaticamente nem infere etiologia.</li>
              </ul>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 text-sm block mb-1">Reflexos Estapedianos Acústicos:</strong>
              <ul className="space-y-1 text-slate-600">
                <li>Pesquisa de reflexos <strong>Ipsilaterais</strong> e <strong>Contralaterais</strong> em 500, 1.000, 2.000 e 4.000 Hz.</li>
                <li>Critério numérico de Metz (SBFa, 2025): diferença entre a VA da orelha estimulada e o reflexo contralateral ≤ 60 dB. Só é calculado quando se informa se as colunas indicam a orelha estimulada ou a da sonda; é um dado para interpretação, não um diagnóstico isolado.</li>
                <li>Registro dos limiares de reflexo em dB NA e do resultado do decay informado pelo profissional.</li>
              </ul>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Emissões Otoacústicas (EOA) & Teste de Weber:</strong>
              <p className="mt-0.5 text-emerald-900">
                O sistema permite registrar o Weber Audiométrico (Indiferente, Lateralizado para OD ou OE), além de EOAT (Transitórias) e EOAPD (Produto de Distorção) com triagem "Passou / Falhou" ou análise por bandas de frequência, e potenciais evocados auditivos de tronco encefálico (PEATE / BERA).
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'laudos-comparativo',
      title: '7. Resumo para Revisão, Parecer & Comparador Temporal',
      category: 'laudos',
      icon: null,
      badge: 'Revisão profissional',
      summary: 'Médias, sugestões descritivas de tipo e grau para adultos, critérios da NR-7 (Anexo II) e comparação entre exames.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            O botão <strong>Gerar resumo dos dados</strong> organiza os resultados registrados e, com limiares confiáveis, sugere o grau conforme a referência selecionada (para crianças, só Northern e Downs ou OMS, indicadas pelo Guia) e, para adultos, também o tipo. O parecer, a conduta e a conclusão são do fonoaudiólogo, que responde pelo laudo (Guia CFFa, 2023). Níveis mínimos de resposta (VRA, observação) e exames com confiabilidade limitada não recebem classificação automática.
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h5 className="font-bold text-slate-900 text-sm">Cálculos e sugestões (sempre revisados pelo profissional):</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Médias Audiométricas:</strong> Tritonal (500, 1k, 2k Hz) e Quadritonal (500, 1k, 2k, 4k Hz).</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Tipo de perda (Silman e Silverman, 1997):</strong> condutiva, neurossensorial ou mista, analisando as frequências com via óssea; padrões incompletos ou heterogêneos ficam indeterminados.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Grau:</strong> conforme a classificação escolhida entre as do Guia CFFa (Quadros 3–7, 14 e 15). Com OMS 2021, também a classificação global pela melhor orelha e a categoria unilateral. Média dentro do padrão não recebe grau.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>NR-7, Anexo II:</strong> verificação descritiva dos itens 5.1 e 5.2 por orelha e, na comparação com o exame de referência, dos critérios de desencadeamento (5.3) e agravamento (5.4). O diagnóstico conclusivo e a aptidão cabem ao médico do trabalho.</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100">
            <h5 className="font-bold text-indigo-950 text-sm mb-1.5 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Comparativo de Audiometrias
            </h5>
            <p className="text-xs text-indigo-900 leading-relaxed">
              No menu <strong>Comparar Exames</strong>, escolha dois exames de datas distintas do mesmo paciente. O sistema sobrepõe graficamente os audiogramas, demonstrando a evolução de limiares, eficácia de próteses auditivas (AASI) ou progressão de perdas ocupacionais.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'agenda-whatsapp',
      title: '8. Agenda de Consultas & Sincronização Google Calendar',
      category: 'agenda',
      icon: Calendar,
      summary: 'Controle de consultas, envio de lembretes no WhatsApp e sincronização automática de agenda.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            Organize a rotina de exames com a <strong>Agenda Audiológica</strong> integrada:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <h5 className="font-bold text-slate-900 text-sm mb-1">Visualização Flexível</h5>
              <p className="text-xs text-slate-600">Alterne entre visualização por <strong>Mês</strong>, <strong>Semana</strong> ou <strong>Dia</strong>, acompanhando status em tempo real (Confirmado, Pendente, Concluído, Falta).</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <h5 className="font-bold text-slate-900 text-sm mb-1">💬 Lembretes e Confirmações no WhatsApp</h5>
              <p className="text-xs text-slate-600">Com um único clique no card do agendamento, abra o WhatsApp com uma mensagem personalizada com instruções para o paciente (data, horário e recomendação de repouso auditivo prévio de 14 horas para exames ocupacionais).</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <h5 className="font-bold text-slate-900 text-sm mb-1">🔄 Sincronização Google Calendar</h5>
              <p className="text-xs text-slate-600">Conecte sua conta do Google nas Configurações para sincronizar seus horários com smartphone e outros dispositivos.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'offline-seguranca',
      title: '9. Funcionamento Offline-First & Privacidade (LGPD)',
      category: 'offline',
      icon: Database,
      badge: 'Segurança',
      summary: 'Continuidade de atendimento sem conexão com internet, banco IndexedDB local e backup dos dados.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            O AudioDash foi construído com arquitetura <strong>Offline-First</strong>. Mesmo se a internet do consultório sofrer instabilidade, a interface permanece veloz e você não perde nenhum dado durante o atendimento.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <WifiOff className="h-4 w-4 text-amber-600" />
                <span className="font-bold text-slate-900 text-sm">Gravação Local Instantânea</span>
              </div>
              <p className="text-xs text-slate-600">
                Os dados são gravados no banco local seguro do navegador (IndexedDB), garantindo preenchimento ágil sem travar a digitação.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <CloudCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-slate-900 text-sm">Sincronização em Nuvem</span>
              </div>
              <p className="text-xs text-slate-600">
                Assim que a conexão for reestabelecida, os dados salvos localmente são sincronizados com o servidor em nuvem por conexão criptografada (TLS).
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 text-blue-950 text-xs flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Backup Local e Privacidade (LGPD):</strong>
              <p className="mt-0.5 text-blue-900">
                Você pode baixar uma cópia completa de segurança em formato JSON em <em>Configurações &gt; Backup</em> a qualquer momento. Os dados médicos permanecem sob estrito sigilo ético e profissional.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'metodos-entrada',
      title: '10. Métodos de Entrada: Plotagem no Gráfico & Digitação em Tabela',
      category: 'metodos',
      icon: MousePointerClick,
      summary: 'Conheça as duas formas práticas e velozes de preencher os limiares audiométricos no AudioDash.',
      content: (
        <div className="space-y-4 text-slate-600">
          <p>
            Para atender a diferentes preferências de rotina clínica, o AudioDash oferece <strong>dois métodos complementares</strong> de registro dos limiares auditivos:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-blue-600" />
                Método 1: Plotagem Interativa no Audiograma
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ideal para quem prefere interação visual ou utiliza telas sensíveis ao toque (touchscreen / tablets):
              </p>
              <ul className="list-disc pl-4 text-xs space-y-1 text-slate-600">
                <li>Selecione a ferramenta desejada no topo do gráfico: <strong>OD VA</strong>, <strong>OD VO</strong>, <strong>OE VA</strong>, <strong>OE VO</strong> ou <strong>Campo Livre</strong>.</li>
                <li>Ative as opções <strong>Mascarado</strong> ou <strong>Sem Resposta (NR)</strong> conforme a necessidade clínica.</li>
                <li>Clique diretamente na interseção da frequência (Hz) e intensidade (dB) da grade para plotar o símbolo imediatamente.</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-indigo-600" />
                Método 2: Digitação Tabular Rápida
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ideal para máxima velocidade de digitação em teclados de computador:
              </p>
              <ul className="list-disc pl-4 text-xs space-y-1 text-slate-600">
                <li>Digite o valor do limiar em dB diretamente nos campos da tabela (ex: <code>15</code>, <code>20</code>, <code>45</code>).</li>
                <li>Para ausência de resposta, digite <code>NR</code> ou <code>SR</code>.</li>
                <li>Pressione <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[11px]">Tab</kbd> para avançar instantaneamente para a próxima frequência.</li>
                <li>Pressione <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[11px]">Shift + Tab</kbd> para retornar à frequência anterior.</li>
              </ul>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 text-sm flex items-center justify-between">
              <span>Atalhos Rápidos de Navegação</span>
              <span className="text-xs text-slate-500 font-normal">Disponíveis em qualquer tela</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Busca Global Instantânea</td>
                  <td className="py-2.5 px-4"><kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-800">Ctrl + K</kbd> ou <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-800">Cmd + K</kbd></td>
                  <td className="py-2.5 px-4 text-slate-500">Foca imediatamente no campo de busca de pacientes e exames</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Navegar entre Campos de Frequência</td>
                  <td className="py-2.5 px-4"><kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-800">Tab</kbd> / <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-800">Shift + Tab</kbd></td>
                  <td className="py-2.5 px-4 text-slate-500">Pula sequencialmente entre as frequências testadas</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Imprimir / Salvar Laudo em PDF</td>
                  <td className="py-2.5 px-4"><kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-800">Ctrl + P</kbd></td>
                  <td className="py-2.5 px-4 text-slate-500">Abre o diálogo de impressão ou geração de PDF</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    }
  ], []);

  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      const matchesCategory = selectedCategory === 'todos' || topic.category === selectedCategory;
      const matchesQuery = searchQuery === '' || 
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [topics, selectedCategory, searchQuery]);

  const faqs = [
    {
      id: 'faq-1',
      question: 'Como faço para colocar o logotipo da minha clínica nos laudos?',
      answer: 'Acesse o menu Configurações na barra lateral. Na seção "Identificação da Clínica", clique em "Enviar Logotipo" e escolha uma imagem no seu computador (formato PNG com fundo transparente ou JPG). O logo será incluído automaticamente no topo de todos os relatórios gerados em PDF.'
    },
    {
      id: 'faq-2',
      question: 'Posso usar o AudioDash se a internet do consultório cair?',
      answer: 'Sim! O AudioDash conta com a tecnologia Offline-First. Você pode abrir o sistema, criar novos cadastros, preencher audiometrias e consultar exames anteriores mesmo sem internet. Assim que o sinal for restaurado, tudo será sincronizado com o servidor automaticamente.'
    },
    {
      id: 'faq-3',
      question: 'Como exportar ou imprimir um laudo audiométrico para o paciente?',
      answer: 'Abra o exame desejado na tela de Exames ou no prontuário do paciente e clique no botão "Imprimir / Exportar Laudo". O sistema abrirá uma prévia formatada em tamanho A4 pronta para impressão física ou download do arquivo em formato PDF de alta qualidade.'
    },
    {
      id: 'faq-4',
      question: 'Como funciona o cálculo automático das médias e classificação da perda?',
      answer: 'O sistema lê os limiares de via aérea inseridos e calcula instantaneamente a média tritonal (500Hz, 1kHz, 2kHz) e quadritonal (500Hz, 1kHz, 2kHz, 4kHz), sugerindo, quando os limiares são confiáveis, a faixa de grau da classificação selecionada no exame (Guia CFFa, 2023). A sugestão não substitui a conclusão do profissional, que redige e revisa o parecer.'
    },
    {
      id: 'faq-5',
      question: 'Como sincronizar a agenda do AudioDash com o Google Calendar?',
      answer: 'Vá em Configurações > Integrações e clique no botão "Conectar Google Calendar". Faça o login com sua conta do Google e autorize o acesso. A partir daí, cada novo agendamento criado no AudioDash será espelhado no seu Google Agenda.'
    },
    {
      id: 'faq-6',
      question: 'Como fazer backup completo dos dados dos meus pacientes?',
      answer: 'Por segurança e conformidade com a LGPD, você pode ir em Configurações > Banco de Dados e clicar em "Exportar Backup Completo (JSON)". Um arquivo seguro contendo todos os dados clínicos será baixado diretamente para o seu computador.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/painel" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-[#0071e3] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <LogoAD className="h-6 w-auto text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-none">
                  Audio<span className="text-[#0071e3]">Dash</span>
                </h1>
                <span className="text-xs text-slate-500 font-medium">Guia & Manual do Usuário</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Imprimir ou Salvar PDF"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Imprimir / Salvar PDF</span>
            </button>

            <Link
              to="/painel"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#0071e3] text-white text-xs font-semibold hover:bg-blue-600 transition shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Sistema</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-linear-to-b from-white to-slate-50 border-b border-slate-200/80 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
            <BookOpen className="h-3.5 w-3.5" />
            Documentação Clínica & Operacional v2.5
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Central de Ajuda e Manual do AudioDash
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Consulte as diretrizes de avaliação audiológica, preenchimento de exames, automação de laudos, sincronização segura e gestão clínica.
          </p>

          {/* Search Box */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Busque por tópico (ex: mascaramento, timpanometria, logo, atalhos, backup)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-300 shadow-sm text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full px-2 py-0.5 cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Topics (Left / Center) */}
          <div className="lg:col-span-8 space-y-6">
            {filteredTopics.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">Nenhum tópico encontrado</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Não encontramos resultados para "{searchQuery}". Tente pesquisar por termos como "exame", "laudo" ou "agenda".
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('todos'); }}
                  className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition cursor-pointer"
                >
                  Ver todos os tópicos
                </button>
              </div>
            ) : (
              filteredTopics.map((topic) => {
                const IconComponent = topic.icon;
                return (
                  <section
                    key={topic.id}
                    id={topic.id}
                    className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 transition-all hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        {IconComponent && <div className="p-3 bg-blue-50 text-[#0071e3] rounded-2xl shrink-0">
                          <IconComponent className="h-6 w-6" />
                        </div>}
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                            {topic.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">{topic.summary}</p>
                        </div>
                      </div>
                      {topic.badge && (
                        <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                          {topic.badge}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      {topic.content}
                    </div>
                  </section>
                );
              })
            )}

            {/* FAQ Accordion Section */}
            {(selectedCategory === 'todos' || selectedCategory === 'faq') && (
              <section id="faq" className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Perguntas Frequentes (FAQ)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Respostas para as dúvidas operacionais e clínicas mais comuns</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {faqs.map((faq) => {
                    const isOpen = !!expandedFaq[faq.id];
                    return (
                      <div
                        key={faq.id}
                        className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-slate-50/50"
                      >
                        <button
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-slate-800 text-sm hover:bg-slate-100/60 transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-blue-600 font-bold">Q:</span>
                            {faq.question}
                          </span>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Table of Contents & Quick Help (Sticky Right Sidebar) */}
          <div className="lg:col-span-4 space-y-6 sticky top-24">
            {/* Table of Contents Box */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-xs text-slate-400">
                Índice de Conteúdo
              </h4>
              <nav className="space-y-1 text-xs">
                {topics.map(topic => (
                  <a
                    key={topic.id}
                    href={`#${topic.id}`}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50/60 transition"
                  >
                    <span className="truncate pr-2">{topic.title.replace(/^\d+\.\s*/, '')}</span>
                    <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                  </a>
                ))}
                <a
                  href="#faq"
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50/60 transition font-semibold text-blue-900"
                >
                  <span>Dúvidas Frequentes (FAQ)</span>
                  <ChevronRight className="h-3 w-3 text-blue-400 shrink-0" />
                </a>
              </nav>
            </div>

            {/* Quick Support Card */}
            <div className="bg-linear-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-md space-y-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <HelpCircle className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-bold text-lg leading-tight">Suporte Técnico e Clínico</h4>
              <p className="text-xs text-blue-100 leading-relaxed">
                Dúvidas sobre calibração, importação de dados ou diretrizes audiológicas? Nossa equipe especializada está pronta para auxiliar.
              </p>
              <div className="pt-2">
                <Link
                  to="/painel"
                  className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-white text-[#0071e3] font-bold text-xs hover:bg-blue-50 transition shadow-xs"
                >
                  Acessar Painel da Clínica
                </Link>
              </div>
            </div>

            {/* Hybrid mode indicator */}
            <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></div>
              <span>
                <strong>Modo Híbrido Ativo:</strong> Sistema funcionando com sincronização local inteligente.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-slate-500 text-xs space-y-2">
          <p>© {new Date().getFullYear()} AudioDash - Sistema de Gestão Audiológica e Prontuário Eletrônico.</p>
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <Link to="/termos" className="hover:text-slate-600 transition">Termos de Uso</Link>
            <span>•</span>
            <Link to="/privacidade" className="hover:text-slate-600 transition">Política de Privacidade</Link>
            <span>•</span>
            <Link to="/planos" className="hover:text-slate-600 transition">Planos</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
