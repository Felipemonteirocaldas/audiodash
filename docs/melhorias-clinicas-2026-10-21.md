# Melhorias implementadas — 21/10/2026

## Atendimento e interpretação

- Novo exame começa com meatoscopia não preenchida e status de rascunho.
- Contexto salvo no JSON existente do cabeçalho: método, limiar versus nível mínimo de resposta, confiabilidade, referência de grau, transdutor, condição de campo livre, calibração e versão das regras. Não foram acrescentadas colunas ao Supabase.
- Idade calculada na data do exame, com dias/meses para lactentes. Público do painel também considera a idade no exame.
- Classificações automáticas adultas ficam condicionadas a idade conhecida, método convencional/lúdico, limiares confiáveis e referência registrada. A interpretação pediátrica fica sob revisão profissional; a aplicação não reutiliza automaticamente classificações adultas.
- Médias exigem todas as frequências da referência e excluem NR. OMS 2014 e 2021 usam média de 500, 1000, 2000 e 4000 Hz; Lloyd e Kaplan usa 500, 1000 e 2000 Hz. Não há troca silenciosa entre médias.
- Tipo de perda fica indeterminado sem VA/VO suficientes ou quando há pendências de mascaramento. Dados ausentes não viram zero.
- NR guarda o nível apresentado por via e frequência. Registros antigos sem esse nível permanecem identificados como desconhecidos; não são deslocados artificialmente para 120 dB.
- Removidos presets que inventavam medidas de timpanometria, reflexos e reconhecimento de fala. O desenho timpanométrico agora mostra apenas os picos registrados, sem curva fabricada.
- Timpanometria registra frequência de sonda, presença de pico e tipo informado pelo profissional. Sugestões quantitativas existentes ficam restritas ao contexto adulto documentado de 226 Hz. Não equivalem a diagnóstico etiológico.
- Ausência de dados não gera LRF concordante nem normalidade de reflexos. IPRF fora de 0–100% e medidas incompatíveis impedem revisão.
- O gerador produz resumo local determinístico, sem chamadas externas de IA, diagnósticos de exame vazio ou indicação automática de AASI.

## Revisão e integridade

- Geração de resumo e atualização dos campos passaram a usar uma única atualização, evitando a perda da opinião por sobrescrita de estado.
- Situação clínica estruturada: normalidade bilateral, alteração ou inconclusivo.
- Revisão exige identificação do paciente/profissional, contexto da avaliação e parecer, além de verificar valores inválidos, NR sem nível, condições de campo livre e resultados timpanométricos incompletos. Conclusões de normalidade/alteração exigem inspeção registrada.
- A revisão se vincula ao conteúdo clínico e texto. Alterar dados, paciente, data, parâmetros ou parecer invalida essa revisão. Não se trata de assinatura digital nem de auditoria imutável.
- PDF, Excel e Word identificam rascunhos. Removidos textos padrão de normalidade nas exportações.
- Excel passou a usar a biblioteca ExcelJS já instalada, com todas as frequências, NR e nível apresentado, mascaramento, procedimentos das duas orelhas e contexto da avaliação. PDF mantém zero e registros só na OE e documenta NR sem nível conhecido.
- Novo rascunho usa identificador estável, há proteção contra clique repetido ao salvar e tratamento de erro no carregamento. Navegar de um exame existente para novo exame reinicia o formulário.
- Registros existentes não foram recalculados nem reescritos em lote. Eles aparecem como aguardando revisão até confirmação explícita.

## Dashboard

- Agenda e continuidade dos exames substituem o bloco dominante de relógio/clima.
- Cartões de agendamentos, revisões, pacientes e registros com envio pendente.
- Filtros de período e público, com denominador explícito.
- Indicadores baseados em revisão atual e situação estruturada, sem busca de palavras no texto ou associação automática de ocupacional com PAIR.
- Próximo agendamento exclui entradas concluídas/passadas e acompanha a passagem do tempo.
- Lista de exames também distingue rascunhos e revisados.

## Validação executada

- `npm test`: 18 testes de regressão com dados sintéticos. Incluem NR, médias incompletas, parsing decimal, classificação sem VO, limites de tabelas, idade, revisão após serialização/alteração, indicadores, agenda, leitura do Excel gerado e renderização real de PDF.
- `npm run build`: TypeScript e build de produção.
- `npm run lint`: conclui com avisos; o repositório também contém avisos em arquivos e ferramentas fora deste escopo. O módulo PDF tem aviso de Fast Refresh por conter funções de exportação e componentes no mesmo arquivo.
- Conferência no navegador autenticado: painel; estado inicial sem normalidade; resumo de exame vazio; bloqueio de revisão incompleta; persistência do transdutor entre abas; entrada NR e campo do nível apresentado.
- Não foram criados nem alterados prontuários reais nos testes. Persistência e sincronização com a nuvem não foram ensaiadas de ponta a ponta.

## Limites e próximos trabalhos

Esta entrega corrige a base de integridade clínica e o fluxo de revisão. Não constitui certificação clínica.

- Protocolos pediátricos detalhados, idade corrigida quando pertinente, referência normativa selecionável de imitância, importação de curvas medidas, aquisição de EOA/PEATE e documentação completa de material de fala ainda precisam de implementação e validação especializada.
- Não há aquisição de sinais do audiômetro: a aplicação registra medidas obtidas externamente.
- O módulo ocupacional de comparação ainda precisa de trabalho próprio; a inferência automática de PAIR pelo entalhe foi retirada. Não usar o comparativo existente como motor normativo completo da NR-7.
- Histórico imutável de versões e assinatura digital não foram implementados. A revisão nesta entrega acompanha a versão atual do conteúdo.
- Sincronização utiliza os campos JSON existentes; deve ser verificada em ambiente de teste antes da liberação em produção.

## Referências consultadas

- [ASHA — audiometria tonal manual](https://www.asha.org/policy/GL2005-00014/).
- [ASHA — avaliação de crianças](https://www.asha.org/practice-portal/clinical-topics/hearing-loss-in-children/).
- [OMS — World Report on Hearing, 2021](https://www.who.int/publications/i/item/9789240020481).
- [OMS — tabela histórica e média de quatro frequências](https://www.who.int/docs/default-source/documents/report-on-informal-consultation-on-economic-analysis-sensory-disabilities.pdf).

As referências embasam os requisitos e não certificam o software. A auditoria original e suas limitações documentais estão em `auditoria-clinica-2026-10-21.md`.
