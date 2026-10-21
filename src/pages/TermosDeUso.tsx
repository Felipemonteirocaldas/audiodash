import { Link } from 'react-router-dom';
import { ArrowLeft, Activity, FileText, ShieldCheck, Scale } from 'lucide-react';

export default function TermosDeUso() {
  const lastUpdated = '04 de agosto de 2026';

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-['Inter',sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-[#0071e3] transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Voltar ao site</span>
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#0071e3] flex items-center justify-center text-white shadow-sm">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Audio<span className="text-[#0071e3]">Dash</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#f5f5f7] py-16 sm:py-20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-indigo-100/30 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0071e3] to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0071e3] uppercase tracking-widest">Documento Legal</p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Termos de Uso</h1>
            </div>
          </div>
          <p className="text-slate-500 text-sm">Última atualização: {lastUpdated}</p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-10 space-y-10 text-[15px] leading-relaxed text-slate-700">

            {/* Section 1 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="text-lg font-bold text-slate-900">Aceitação dos Termos</h2>
              </div>
              <p>
                Ao acessar e utilizar a plataforma AudioDash ("Plataforma"), operada por Black Dog Tecnologia LTDA ("Empresa"), 
                o usuário ("Profissional") declara que leu, entendeu e concorda integralmente com estes Termos de Uso. 
                Caso não concorde com qualquer disposição, o Profissional deverá cessar imediatamente o uso da Plataforma.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="text-lg font-bold text-slate-900">Descrição do Serviço</h2>
              </div>
              <p>
                O AudioDash é uma plataforma SaaS (Software as a Service) desenvolvida para profissionais da área de Fonoaudiologia, 
                oferecendo funcionalidades de:
              </p>
              <ul className="mt-3 space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Realização e registro de exames de audiometria tonal e vocal;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Geração de laudos audiológicos em formato PDF;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Gestão de cadastro de pacientes e prontuários;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Comparativo evolutivo entre exames audiométricos;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Agendamento de consultas e gerenciamento de agenda.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">3</div>
                <h2 className="text-lg font-bold text-slate-900">Cadastro e Conta</h2>
              </div>
              <p>
                Para utilizar a Plataforma, o Profissional deverá criar uma conta informando dados verídicos e completos. 
                O Profissional é responsável por:
              </p>
              <ul className="mt-3 space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Manter suas credenciais de acesso em sigilo;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Notificar imediatamente qualquer uso não autorizado de sua conta;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Toda e qualquer atividade realizada em sua conta.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">4</div>
                <h2 className="text-lg font-bold text-slate-900">Dados de Pacientes e Responsabilidade</h2>
              </div>
              <p>
                O Profissional é o <strong>controlador dos dados</strong> pessoais e sensíveis de seus pacientes, conforme definido na 
                Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). A Empresa atua como <strong>operadora de dados</strong>, 
                processando-os exclusivamente conforme as instruções do Profissional e nos limites destes Termos.
              </p>
              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-sm text-amber-900 font-medium">
                  <Scale className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                  O Profissional é responsável por obter o consentimento de seus pacientes para a coleta e armazenamento 
                  dos dados na plataforma, conforme Art. 7º e Art. 11 da LGPD.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">5</div>
                <h2 className="text-lg font-bold text-slate-900">Planos e Pagamento</h2>
              </div>
              <p>
                A Plataforma é oferecida por assinatura paga. Os valores, condições e benefícios estão descritos 
                na página de preços. O pagamento é processado por provedor terceirizado (Dodo Payments). 
                A cobrança é recorrente (mensal) e pode ser cancelada a qualquer momento pelo portal do cliente do provedor 
                ou pelo e-mail contato@audiodash.com.br, mantendo o acesso até o fim do período pago.
              </p>
              <p className="mt-3">
                Em caso de inadimplência ou fim da assinatura, a Empresa pode restringir o acesso às funcionalidades 
                até a regularização do pagamento, sem exclusão dos dados armazenados. O Profissional continua podendo 
                baixar a cópia completa dos seus registros na tela de planos.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">6</div>
                <h2 className="text-lg font-bold text-slate-900">Propriedade Intelectual</h2>
              </div>
              <p>
                Todos os direitos de propriedade intelectual da Plataforma, incluindo código-fonte, design, marcas, logotipos 
                e conteúdo, pertencem exclusivamente à Empresa. O uso da Plataforma não concede ao Profissional nenhum 
                direito de propriedade sobre esses elementos.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">7</div>
                <h2 className="text-lg font-bold text-slate-900">Limitação de Responsabilidade</h2>
              </div>
              <p>
                A Plataforma é fornecida "no estado em que se encontra" (as is). A Empresa não garante que o serviço será 
                ininterrupto ou livre de erros. Em nenhuma hipótese a Empresa será responsável por:
              </p>
              <ul className="mt-3 space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Diagnósticos médicos realizados com base nos dados da Plataforma;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Perdas de dados causadas por uso indevido ou falha no dispositivo do Profissional;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-2 shrink-0" />
                  Danos indiretos, incidentais ou consequentes decorrentes do uso da Plataforma.
                </li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">8</div>
                <h2 className="text-lg font-bold text-slate-900">Rescisão</h2>
              </div>
              <p>
                O Profissional pode encerrar sua conta a qualquer momento por meio das configurações do sistema ou 
                solicitando a exclusão de dados conforme a seção de Privacidade. A Empresa pode suspender ou encerrar 
                contas que violem estes Termos, mediante notificação prévia de 30 (trinta) dias quando possível.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">9</div>
                <h2 className="text-lg font-bold text-slate-900">Legislação Aplicável e Foro</h2>
              </div>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer controvérsias 
                decorrentes destes Termos, fica eleito o Foro da Comarca da sede da Empresa, com renúncia expressa a qualquer 
                outro, por mais privilegiado que seja.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0071e3] flex items-center justify-center text-xs font-bold">10</div>
                <h2 className="text-lg font-bold text-slate-900">Contato</h2>
              </div>
              <p>
                Para dúvidas, sugestões ou reclamações sobre estes Termos, entre em contato pelo e-mail:
              </p>
              <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <span className="text-sm font-semibold text-[#0071e3]">contato@audiodash.com.br</span>
              </div>
            </section>

            {/* Bottom Nav */}
            <div className="pt-8 mt-6 border-t border-slate-100 flex flex-wrap items-center gap-3 text-sm">
              <Link 
                to="/privacidade" 
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Ver Política de Privacidade
              </Link>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Voltar ao Login
              </Link>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
