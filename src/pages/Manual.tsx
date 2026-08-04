import { LogoAD } from '@/components/LogoAD';
import { BookOpen, Stethoscope, Users, Calendar, Activity, Database, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Manual() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0071e3] flex items-center justify-center text-white shadow-md">
            <LogoAD className="h-6 w-auto text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">
              Audio<span className="text-[#0071e3]">Dash</span>
            </h1>
            <span className="text-xs text-slate-500 font-medium">Manual do Sistema</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">Bem-vindo(a) ao AudioDash</h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            O AudioDash é uma plataforma moderna e completa desenvolvida especificamente para profissionais de Fonoaudiologia. Este manual o guiará pelas principais funcionalidades do sistema, garantindo que você aproveite ao máximo todas as ferramentas disponíveis para gestão da sua clínica e atendimento aos seus pacientes.
          </p>
        </div>

        <div className="space-y-12">
          
          {/* Seção 1 */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Dashboard & Início</h3>
            </div>
            <div className="prose prose-slate max-w-none text-slate-600">
              <p>O <strong>Dashboard</strong> é a sua central de controle. Nele, você tem uma visão geral da sua clínica:</p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Visualização rápida dos atendimentos do dia e métricas principais.</li>
                <li>Atalhos para as ações mais frequentes, como adicionar novo paciente ou exame.</li>
                <li>Avisos e notificações do sistema sobre assinaturas ou backups pendentes.</li>
              </ul>
            </div>
          </section>

          {/* Seção 2 */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Gestão de Pacientes</h3>
            </div>
            <div className="prose prose-slate max-w-none text-slate-600">
              <p>A aba <strong>Pacientes</strong> permite gerenciar todos os perfis dos seus atendimentos.</p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li><strong>Cadastro Completo:</strong> Dados pessoais, informações de contato e endereço detalhado.</li>
                <li><strong>Histórico:</strong> Acesso rápido a todos os exames, anamneses e evoluções de um paciente específico em um único lugar.</li>
                <li><strong>Busca Inteligente:</strong> Utilize a barra de busca superior para encontrar pacientes rapidamente pelo nome, telefone ou CPF, em qualquer tela do sistema.</li>
              </ul>
            </div>
          </section>

          {/* Seção 3 */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Stethoscope className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Exames & Avaliações</h3>
            </div>
            <div className="prose prose-slate max-w-none text-slate-600">
              <p>No módulo de <strong>Exames</strong>, você pode registrar e acompanhar resultados audiológicos com precisão.</p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li><strong>Novo Exame:</strong> Interface interativa para preenchimento de audiometrias tonais e vocais, imitanciometria, logaudiometria e emissões otoacústicas.</li>
                <li><strong>Comparativo:</strong> Selecione dois exames do mesmo paciente para comparar visualmente a evolução da audição ao longo do tempo.</li>
                <li><strong>Impressão e Exportação:</strong> Gere ou imprima laudos lindamente formatados, com o logotipo e os dados da sua clínica (configuráveis nas opções do sistema).</li>
              </ul>
            </div>
          </section>

          {/* Seção 4 */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Agenda & Consultas</h3>
            </div>
            <div className="prose prose-slate max-w-none text-slate-600">
              <p>Mantenha sua rotina organizada com a <strong>Agenda</strong> integrada.</p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Visualize compromissos diários, semanais e mensais em formato de calendário.</li>
                <li>Crie novos agendamentos vinculando diretamente a um paciente cadastrado ou registrando um nome temporário.</li>
                <li>Controle visual do status do agendamento (Confirmado, Pendente, Concluído, Cancelado).</li>
              </ul>
            </div>
          </section>

          {/* Seção 5 */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Modo Offline e Sincronização</h3>
            </div>
            <div className="prose prose-slate max-w-none text-slate-600">
              <p>O AudioDash é estruturado para funcionar perfeitamente mesmo se a sua internet cair <strong>(Modo Local Offline First)</strong>.</p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li><strong>Trabalho Ininterrupto:</strong> Continue cadastrando pacientes e exames normalmente sem internet. A interface responde de forma instantânea.</li>
                <li><strong>Sincronização Automática:</strong> Assim que a conexão for reestabelecida, os dados salvos localmente serão sincronizados com segurança para o servidor em nuvem.</li>
                <li><strong>Indicador de Status:</strong> O canto inferior esquerdo sempre mostrará se você está <em>Online</em>, <em>Offline</em> ou <em>Sincronizando</em>.</li>
              </ul>
            </div>
          </section>

        </div>
        
        <div className="mt-16 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} AudioDash. Todos os direitos reservados.</p>
        </div>
      </main>
    </div>
  );
}
