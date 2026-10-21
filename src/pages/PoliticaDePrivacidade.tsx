import { Link } from 'react-router-dom';
import { ArrowLeft, Activity, ShieldCheck, FileText, Eye, Database, UserX, Lock } from 'lucide-react';

export default function PoliticaDePrivacidade() {
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
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-blue-100/30 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">Documento Legal</p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Política de Privacidade</h1>
            </div>
          </div>
          <p className="text-slate-500 text-sm">Última atualização: {lastUpdated}</p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-10 space-y-10 text-[15px] leading-relaxed text-slate-700">

            {/* Intro */}
            <section>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-6">
                <p className="text-sm text-emerald-900 font-medium leading-relaxed">
                  <ShieldCheck className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                  Esta Política de Privacidade descreve como o AudioDash coleta, utiliza, armazena e protege os dados pessoais 
                  dos usuários e seus pacientes, em conformidade com a Lei Geral de Proteção de Dados 
                  (Lei nº 13.709/2018 — LGPD).
                </p>
              </div>
            </section>

            {/* Section 1 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">1. Dados Coletados</h2>
              </div>
              <p className="mb-3">Coletamos os seguintes tipos de dados:</p>

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-sm mb-2">Dados do Profissional (Usuário)</h3>
                  <ul className="space-y-1.5 text-sm text-slate-600">
                    <li>• Nome completo e e-mail;</li>
                    <li>• CPF e número de registro profissional (CRFa);</li>
                    <li>• Dados da clínica (razão social, CNPJ, endereço);</li>
                    <li>• Dados de pagamento (processados por terceiros — não armazenamos dados de cartão).</li>
                  </ul>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-sm mb-2">Dados de Pacientes (Dados Sensíveis)</h3>
                  <ul className="space-y-1.5 text-sm text-slate-600">
                    <li>• Nome, CPF, data de nascimento, gênero e ocupação;</li>
                    <li>• Resultados de exames audiométricos (tonal, vocal, timpanometria);</li>
                    <li>• Anamneses e prontuários clínicos;</li>
                    <li>• Laudos audiológicos gerados.</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-sm text-amber-900 font-medium">
                    ⚠️ Os dados de saúde dos pacientes são classificados como <strong>dados pessoais sensíveis</strong> nos termos 
                    do Art. 5º, II da LGPD e recebem tratamento especial de proteção.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">2. Finalidade do Tratamento</h2>
              </div>
              <p className="mb-3">Os dados são tratados para as seguintes finalidades:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  Prestação do serviço contratado (gestão de exames, laudos e prontuários);
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  Autenticação e segurança da conta do Profissional;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  Processamento de pagamentos e gestão de assinaturas;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  Comunicações operacionais (confirmação de cadastro, notificações de sistema);
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  Cumprimento de obrigações legais e regulatórias.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">3. Armazenamento e Segurança</h2>
              </div>
              <p className="mb-3">Os dados são armazenados com as seguintes medidas de segurança:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Nuvem (Supabase)</h4>
                  <p className="text-xs text-slate-500">Infraestrutura com criptografia em trânsito (TLS) e em repouso. Provedor com relatório SOC 2 (Supabase).</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Local (Modo Offline)</h4>
                  <p className="text-xs text-slate-500">Dados armazenados no navegador via IndexedDB, acessíveis apenas no dispositivo do Profissional.</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Autenticação</h4>
                  <p className="text-xs text-slate-500">Sessões com token de expiração automática e login por e-mail/senha ou Google (OAuth 2.0), gerenciados pelo Supabase.</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">Pagamentos</h4>
                  <p className="text-xs text-slate-500">Processados por provedores certificados PCI-DSS. Nenhum dado de cartão passa pelos nossos servidores.</p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserX className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">4. Direitos do Titular (LGPD)</h2>
              </div>
              <p className="mb-3">
                Em conformidade com o Art. 18 da LGPD, o titular dos dados (Profissional ou paciente, por intermédio do Profissional) 
                possui os seguintes direitos:
              </p>
              <div className="space-y-2">
                {[
                  { right: 'Confirmação e acesso', desc: 'Solicitar a confirmação da existência e acesso aos seus dados pessoais.' },
                  { right: 'Correção', desc: 'Solicitar a correção de dados incompletos, inexatos ou desatualizados.' },
                  { right: 'Anonimização ou bloqueio', desc: 'Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.' },
                  { right: 'Portabilidade', desc: 'Solicitar a portabilidade dos dados a outro fornecedor de serviço (exportação JSON).' },
                  { right: 'Eliminação', desc: 'Solicitar a eliminação dos dados pessoais tratados com base no consentimento.' },
                  { right: 'Revogação do consentimento', desc: 'Revogar o consentimento a qualquer momento, de forma gratuita e facilitada.' },
                ].map(({ right, desc }) => (
                  <div key={right} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 text-sm">{right}:</span>{' '}
                      <span className="text-sm text-slate-600">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-sm text-blue-900 font-medium">
                  📩 Para exercer qualquer desses direitos, utilize o botão <strong>"Solicitar exclusão de dados"</strong> nas 
                  Configurações do sistema ou envie um e-mail para <strong>contato@audiodash.com.br</strong>.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">5</div>
                <h2 className="text-lg font-bold text-slate-900">Compartilhamento de Dados</h2>
              </div>
              <p>
                <strong>Não vendemos, alugamos ou compartilhamos</strong> dados pessoais dos nossos usuários ou de seus pacientes 
                com terceiros para fins de marketing. Dados podem ser compartilhados exclusivamente com:
              </p>
              <ul className="mt-3 space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <strong>Supabase</strong> — infraestrutura de banco de dados e autenticação;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <strong>Provedores de pagamento</strong> — exclusivamente para processamento financeiro;
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <strong>Autoridades competentes</strong> — quando exigido por lei ou ordem judicial.
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">6</div>
                <h2 className="text-lg font-bold text-slate-900">Retenção de Dados</h2>
              </div>
              <p>
                Os dados pessoais serão armazenados pelo tempo necessário para a prestação do serviço ou para cumprimento 
                de obrigações legais. O Profissional é responsável pela guarda do prontuário de seus pacientes
                (Resolução CFFa nº 777/2025, arts. 7º e 8º: prontuário eletrônico de guarda permanente, com eliminação
                possível após 20 anos do último registro). Por isso, a Plataforma arquiva — em vez de apagar — pacientes
                cujo prazo de guarda não terminou, e a exclusão da conta exige a exportação prévia da cópia completa dos
                registros. A exclusão da conta apaga os dados do dispositivo e da nuvem no momento da confirmação,
                exceto aqueles cuja retenção seja exigida por lei.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">7</div>
                <h2 className="text-lg font-bold text-slate-900">Cookies e Tecnologias de Rastreio</h2>
              </div>
              <p>
                A Plataforma pode utilizar cookies essenciais para o funcionamento do serviço (autenticação, preferências). 
                Não utilizamos cookies de rastreamento publicitário. Cookies de análise de uso (analytics) podem ser 
                implementados no futuro, sempre com a devida notificação e consentimento do usuário.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">8</div>
                <h2 className="text-lg font-bold text-slate-900">Alterações nesta Política</h2>
              </div>
              <p>
                Reservamo-nos o direito de atualizar esta Política de Privacidade periodicamente. Alterações significativas 
                serão comunicadas por e-mail ou notificação na Plataforma. A continuidade do uso após a publicação das 
                alterações constitui aceite das novas condições.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">9</div>
                <h2 className="text-lg font-bold text-slate-900">Encarregado de Dados (DPO)</h2>
              </div>
              <p>
                Para questões relacionadas à proteção de dados, incluindo o exercício dos direitos do titular, 
                entre em contato com o Encarregado de Dados:
              </p>
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <p className="text-sm"><strong className="text-slate-900">E-mail:</strong> contato@audiodash.com.br</p>
                <p className="text-sm"><strong className="text-slate-900">Empresa:</strong> Black Dog Tecnologia LTDA</p>
                <p className="text-sm text-slate-500">Requisições de confirmação ou acesso completo são respondidas em até 15 (quinze) dias, contados do requerimento (Art. 19, II, da LGPD).</p>
              </div>
            </section>

            {/* Bottom Nav */}
            <div className="pt-8 mt-6 border-t border-slate-100 flex flex-wrap items-center gap-3 text-sm">
              <Link 
                to="/termos" 
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Ver Termos de Uso
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
