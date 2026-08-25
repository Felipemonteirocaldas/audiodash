import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Os laudos e audiogramas gerados cumprem os padrões do CFFa?",
      answer:
        "Sim! Os modelos de exames e relatórios emitidos no AudioDash foram estruturados rigorosamente dentro das diretrizes dos Conselhos de Fonoaudiologia, incluindo simbologia oficial (Vermelho para Orelha Direita, Azul para Orelha Esquerda, Via Aérea, Via Óssea e Mascaramento).",
    },
    {
      question: "Posso utilizar o AudioDash no meu iPad, Tablet ou Notebook?",
      answer:
        "Com certeza! O AudioDash é uma aplicação web progressiva (PWA) responsiva. Você pode acessar diretamente pelo navegador em qualquer computador, iPad ou tablet Android, adaptando-se perfeitamente ao tamanho da sua tela.",
    },
    {
      question: "Como funciona o modo offline caso fique sem internet na cabine?",
      answer:
        "Graças à tecnologia de armazenamento local (Dexie / IndexedDB), você pode realizar exames e preencher prontuários normalmente sem conexão. Assim que seu dispositivo reconectar à internet, os dados são sincronizados automaticamente com a nuvem.",
    },
    {
      question: "Há limite de exames ou pacientes cadastrados no Plano Pro?",
      answer:
        "Nenhum limite! No Plano Pro por R$ 50,00/mês você tem acesso ilimitado a cadastros de pacientes, exames de audiometria tonal e vocal, comparativos de evolução e laudos.",
    },
    {
      question: "Como funciona o cancelamento do plano?",
      answer:
        "Você tem total liberdade. Não há fidelidade ou contrato de longa permanência. Você pode cancelar sua assinatura com apenas um clique a qualquer momento no seu painel ou através da página de checkout.",
    },
  ];

  return (
    <section id="faq" className="py-14 sm:py-24 bg-[#fafafa] relative border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Perguntas Frequentes
          </h2>
          <p className="text-base text-slate-600">
            Tudo o que você precisa saber para revolucionar seu atendimento fonoaudiológico.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-base text-slate-900 focus:outline-none cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <div
                    className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-blue-50' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-base text-slate-600 leading-relaxed border-t border-slate-100 pt-4 animate-in fade-in duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
