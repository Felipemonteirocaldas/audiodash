# Plano de implementação clínica do AudioDash

Data de elaboração: 21/10/2026. Público: profissionais que atendem adultos e crianças.

Revisão 2 — 21/10/2026 (Claude): fontes brasileiras atuais obtidas (Guia CFFa 2023, SBFa 2025, NR-7 Anexo II, CFFa 777/2025) e primeira execução parcial de E0, E2–E7. Ver `docs/MATRIZ-REGRAS-CLINICAS.md` e o registro de execução (seção 13). Validação clínica continua pendente.

Revisão 1 — 21/10/2026: incorporada a revisão de coerência científica. Complementos obrigatórios: unidade da classificação OMS, integração pediátrica, campo livre, qualidade da aquisição, motivo de NR, contratos de automação fechados e validação clínica desde E0. Essa revisão documental não inicia a implementação das etapas.

## 1. Objetivo e situação

Transformar os procedimentos existentes em registros e ferramentas de apoio clínico consistentes, rastreáveis e baseados em referências verificadas. Dados observados, cálculos, sugestões e conclusão profissional devem ser distinguíveis.

Este plano ainda não foi executado. As melhorias anteriores e os 31 testes existentes constituem a base inicial, não a comprovação de que os pontos abaixo estão resolvidos. A ordem é deliberada: primeiro estabelecer as regras e o contrato dos dados; depois implementar a interpretação e a finalização.

A conferência científica e profissional é transversal: começa em E0 e acompanha cada módulo. E8 reúne a verificação integrada; não é o primeiro momento de avaliação clínica. Sem um responsável clínico disponível, avançar na pesquisa, documentação e verificações técnicas independentes, registrando a validação pendente e sem apresentar a regra como liberada para uso clínico.

Checklist geral:

- [ ] E0 — Base clínica e matriz de decisão · **em andamento**: matriz criada; validação clínica e decisões pendentes listadas
- [ ] E1 — Estados, dados e compatibilidade · parcial: `earConvention`, `auditoryRest14h`, tipos 1000 Hz; contratos isPAIR/hasRecruitment substituídos por estados
- [ ] E2 — Audiometria tonal, médias, grau, tipo e NR · parcial: tipo, grau sem "normal", OMS global, elegibilidade única
- [ ] E3 — Mascaramento · parcial: regra 2 corrigida; lançamento pelo gráfico preserva limiar sem mascaramento
- [ ] E4 — Timpanometria e reflexos · parcial: Jerger × 1000 Hz; Metz com convenção de orelha
- [ ] E5 — Avaliação ocupacional · parcial: itens 3.4, 3.6, 5.1–5.4 implementados como critérios descritivos
- [ ] E6 — Fala e procedimentos complementares · parcial: LRF sem limite não fundamentado
- [ ] E7 — Revisão, exportações e documentação profissional · parcial: carimbos sem declaração de conformidade, referência por extenso
- [ ] E8 — Verificação integrada e validação clínica

Marcar uma etapa como concluída somente com os respectivos critérios de aceite atendidos e evidências registradas. Se houver parte dependente de fonte ou decisão profissional, registrar exatamente o que está pendente.

## 2. Regras de trabalho

- Não criar normalidade, diagnóstico, conduta, medidas ou traçados que não sejam sustentados pelos dados.
- Automação útil é permitida quando tem critérios explícitos, contexto suficiente e origem identificável. Não desativar todas as funções para contornar a necessidade de implementá-las corretamente.
- Uma sugestão não substitui a conclusão assinada pelo profissional.
- Não interpretar `false`, string vazia ou `null` indiscriminadamente como ausência de alteração.
- Não usar apenas a idade de 18 anos como regra geral para permitir ou proibir interpretação pediátrica. Verificar idade, desenvolvimento, método, natureza da resposta, população da referência e suficiência dos dados.
- Não restaurar curvas timpanométricas sintéticas. Pontos isolados representam picos registrados; curvas completas precisam das amostras e condições reais de aquisição.
- Não inventar tabelas, coeficientes, limites de saída ou intervalos de confiança com base em memória ou resumo de artigo.
- Não misturar critérios de fontes distintas sem identificar essa decisão. Guias profissionais e normas legais têm escopos diferentes.
- Preservar os registros históricos. Uma nova regra pode exigir nova revisão, mas não deve reescrever o resultado antigo silenciosamente.
- Propostas abaixo são especificações de software a detalhar, não valores normativos prontos para aplicar.
- Separar a classificação global da pessoa, a descrição por orelha e os achados por frequência. Uma média favorável da melhor orelha não estabelece normalidade bilateral nem exclui alteração localizada.
- Avaliar a qualidade e as limitações da aquisição separadamente da validade numérica do campo. O software não verifica a calibração física do equipamento nem comprova condições de coleta por receber um número.

## 3. E0 — Base clínica e matriz de decisão

Entregável: documento versionado, sugerido `docs/MATRIZ-REGRAS-CLINICAS.md`.

Para cada regra, registrar: identificador, finalidade, fonte e seção/página, edição, data de verificação, população, método, unidades, entradas necessárias, condições de exclusão, saída, limites e casos de teste.

Contrato mínimo de cada regra antes da implementação:

| Item | Especificação exigida |
| --- | --- |
| Finalidade | Registro, cálculo, alerta, classificação descritiva ou interpretação assistida; o que a regra não conclui |
| Unidade de análise | Pessoa, orelha, frequência, condição de teste ou série temporal |
| Aplicabilidade | População, método, transdutor/sonda, condições e limitações da referência |
| Entradas | Campos, unidades, precisão e origem; distinguir obrigatório, condicional e desconhecido |
| Decisão | Fórmula, frequências, limites inclusivos/exclusivos, arredondamento e tratamento de NR |
| Insuficiência | Motivo explícito da impossibilidade de calcular/concluir; nunca um negativo presumido |
| Divergências | Compatibilidade entre procedimentos, conflito com conclusão manual e revisão necessária |
| Saída | Texto/estado estruturado, dados utilizados, referência e versão reproduzíveis |
| Verificação | Casos e resultados esperados obtidos independentemente da função a implementar |
| Situação | Pesquisa pendente, especificada, implementada, verificação técnica ou validação clínica pendente/concluída |

Não delegar ao agente de implementação a escolha de uma tabela, regra ou limiar ausente desse contrato. Fechar a especificação de cada regra individualmente; uma pendência de outra regra não impede trabalhos independentes.

Trabalhos:

- Verificar o guia brasileiro de avaliação audiológica e os documentos atuais pertinentes. O PDF histórico de 2013 já consultado não deve ser apresentado como comprovação de orientação brasileira atual.
- Usar SBFa 2025 para delimitar imitanciometria; NR-7 para critérios ocupacionais; referências pediátricas para método e integração de resultados; OMS e demais classificações somente em seu escopo verificado.
- Conferir critérios de tipo/configuração e não apenas a tabela de grau.
- Documentar divergências: por exemplo, faixa etária para sonda de alta frequência e regras de mascaramento. Não escolher o número mais conveniente.
- Registrar o que não foi possível consultar integralmente. Não declarar revisão sistemática nem atualização normativa completa.
- Incluir a conferência do responsável clínico na especificação de cada módulo, antes de considerá-lo apto ao uso profissional. Identificar responsável e divergências; não atribuir aprovação inexistente.
- Separar força e finalidade da fonte: obrigação normativa, recomendação profissional, estudo de validação e convenção descritiva não são intercambiáveis.
- Verificar o escopo da tabela OMS de 2021 para a classificação global pela melhor orelha e a fundamentação da eventual descrição por orelha. Não rotular todas essas saídas apenas como "OMS".

Aceite: cada regra levada à implementação tem contrato fechado, fonte/seção e escopo registrados, casos esperados independentes e situação de validação explícita. Existe lista das decisões não resolvidas. Ausência de validação clínica não é encoberta por aprovação de testes de software.

## 4. E1 — Estados, dados e compatibilidade

Dependência: E0 para os conceitos clínicos; pode começar pelo inventário técnico.

Arquivos: `src/db/db.ts`, `src/lib/audiologyCalculations.ts`, `src/lib/examIntegrity.ts`, `src/lib/syncManager.ts`, consumidores e exportadores.

Trabalhos:

- Substituir contratos ambíguos de `isPAIR: false` e `hasRecruitment: false` por um resultado que distinga não analisado, dados insuficientes, resultado obtido e sugestão. Definir o formato antes de editar consumidores.
- Separar estado do procedimento, validade da medição, resultado clínico e estado de revisão.
- Preservar zero, NR, unidade, via, frequência, condições da pesquisa e origem do valor.
- Diferenciar normalidade documentada, exame não realizado e teste sem resposta.
- Inventariar todos os consumidores antes de alterar tipos; evitar mudanças apenas na tela.
- Planejar adaptação de JSON histórico, armazenamento local e sincronização. Não presumir que não há migração só porque a coluna remota é JSON.
- Preservar dado bruto; armazenar cálculo e convenção com referência/versão quando necessário.
- Prever condição por medição/procedimento quando relevante, sem obrigar que toda a sessão compartilhe a mesma confiabilidade ou natureza de resposta.
- Especificar qualidade da aquisição: equipamento/transdutor, identificação e data da calibração documentada, condições ambientais informadas, artefatos e limitações pertinentes. Informação desconhecida permanece identificada como desconhecida; não preencher automaticamente "adequado".
- Modelar o motivo da ausência de resposta e a condição de interrupção: nível apresentado, informação sobre saída máxima disponível naquela frequência/via e se a pesquisa foi limitada por tolerância, comportamento, condições técnicas ou outro motivo documentado. Não pressupor causa pela string NR.
- Preservar a procedência dos dados: obtidos no atendimento, transcritos de laudo externo ou importados do equipamento. Registrar autor/fonte e unidade, sem tratar transcrição como nova aquisição.
- Para campo livre, prever estímulo, método, condição sem/com dispositivo e configuração pertinente, sem criar lateralidade por proximidade do alto-falante.

Aceite: round-trip local/JSON/exportação não perde campos nem zero; registros antigos incompletos continuam legíveis e não ganham resultado negativo presumido; os consumidores tratam todos os estados.

## 5. E2 — Audiometria tonal, médias, grau, tipo e NR

Dependências: E0 e E1.

Arquivos: `audiologyCalculations.ts`, `clinicalProtocol.ts`, `examIntegrity.ts`, `NewExam.tsx`, `TonalAudiometryExam.tsx`, `aiAudiologyService.ts`, `examPlot.ts`, `AudiogramSVG.tsx`, exportadores.

Trabalhos:

- Definir uma única avaliação de elegibilidade para tela, resumo e exportações. Hoje o resumo confere método convencional/lúdico, e a tela não faz essa mesma conferência.
- Mostrar o motivo da indisponibilidade de cada cálculo/classificação. `--` e "Não avaliado" não explicam exame incompleto ou NR.
- Calcular cada média com suas frequências prescritas. Não chamar uma média de níveis mínimos de resposta de média de limiares.
- Corrigir o bloqueio global por oito frequências de VA em `classifyType`. Determinar suficiência a partir dos pares e do padrão investigado; manter revisão de mascaramento e padrões heterogêneos.
- Rever o atalho de normalidade em `classifyType` e a coerência de normalidade bilateral em `getReviewIssues`: há atualmente um limite fixo de 25 dB, que não representa todas as referências/populações.
- Implementar configuração somente após definir critérios bibliográficos verificáveis. A atual amplitude máximo–mínimo não classifica a forma da curva.
- Para NR, distinguir dado observado, limite apresentado e eventual convenção de cálculo. BSA 2018, seção 9, prevê 130 dB para sua média específica de cinco frequências; não transferir essa convenção automaticamente para OMS ou Lloyd e Kaplan.
- Considerar saída com cálculo indisponível ou limite explicitamente identificado, conforme a referência adotada; não concluir perda profunda por uma única frequência NR.
- Rever a elegibilidade pediátrica por protocolo; não simplesmente liberar tabelas adultas ou manter proibição absoluta até 18 anos.
- Não resolver a divergência de elegibilidade copiando indiscriminadamente o bloqueio convencional/lúdico do resumo para toda a aplicação. Verificar o que cada método permite concluir na população e condição documentadas.
- Distinguir graduação global pela melhor orelha, classificação descritiva por orelha e resultados por frequência. Documentar a base científica de cada uso e mostrar claramente a unidade da conclusão.
- Não usar média isolada para declarar ausência de alteração em todas as frequências ou normalidade bilateral.
- Tornar a verificação cruzada pediátrica parte do fluxo: reunir os procedimentos disponíveis, registrar discrepâncias e sua investigação e permitir conclusão parcial com limitações explícitas. Não exigir indistintamente todos os exames em toda consulta.
- Campo livre não permite atribuir resultado individual a OD/OE. Dispositivos e condições da pesquisa precisam acompanhar o resultado; não transpor o ponto para uma orelha na exportação.
- Aplicar eventual convenção de NR somente quando suas condições estiverem demonstradas, incluindo a razão da ausência de resposta e a condição da saída disponível. Interrupção por desconforto, falta de condicionamento ou limitação técnica não comprova ausência de resposta por gravidade da perda.
- Definir precisão e arredondamento na matriz. Preservar o cálculo sem arredondamento para a decisão quando assim exigir a referência, e arredondar apenas a apresentação; não alterar fronteiras por conveniência de interface.

Aceite: casos adultos/pediátricos compatíveis com a matriz; casos com interoitavas não testadas; pares VA/VO incompletos; padrões heterogêneos; NR com e sem nível/motivo conhecido; limites de cada tabela; assimetria entre orelhas; alterações localizadas não excluídas por uma média; campo livre sem lateralidade; discrepâncias entre procedimentos documentáveis; nenhuma alteração do dado bruto para obter classificação.

## 6. E3 — Mascaramento

Dependências: E0, E1 e contrato tonal de E2.

Trabalhos:

- Permitir configurar o protocolo da clínica, mantendo a referência efetivamente usada no exame. Não aplicar silenciosamente uma preferência nova ao histórico.
- Identificar transdutor/modelo e parâmetros necessários; não confundir a escala do gráfico com a saída do equipamento.
- Conferir as relações entre orelha testada, não testada, VA e VO sem mascaramento para cada regra.
- Distinguir alerta não calculável, ausência de critério encontrado e mascaramento realizado. Nenhum desses estados demonstra um platô por si só.
- Preservar medidas iniciais sem mascaramento e valores finais; revisar também o lançamento pelo gráfico, não apenas pelos checkboxes da matriz.
- Explicar o critério acionado com frequência e dados utilizados. Não apresentar limites mínimos/máximos ou platô como medidos quando não foram pesquisados.

Aceite: fronteiras e diferenças por transdutor/protocolo verificadas; ausência de VO não vira zero; o exame não parece dispensado de mascaramento porque o protocolo está ausente; dados mascarados não são reutilizados como originais sem identificação.

## 7. E4 — Timpanometria e reflexos

Dependências: E0 e E1; integração com E2 para diferenças reflexo–limiar.

Trabalhos:

- Registrar método, sonda, unidade, idade pertinente ao protocolo e referência selecionada. Oferecer referências estruturadas quando disponíveis, evitando exigir repetidamente texto livre.
- Sugerir classificação timpanométrica apenas quando o escopo e os dados forem suficientes; identificar a classificação informada pelo profissional separadamente da sugestão.
- Tratar ausência de pico sem fabricar pressão de pico ou curva plana. Resíduos de campos de um preenchimento anterior não podem contradizer a condição atual na tela/exportação.
- Não aplicar automaticamente a classificação adulta de 226 Hz à avaliação de 1000 Hz em lactentes.
- Registrar idade cronológica e, quando exigida pelo protocolo, idade corrigida e sua base de cálculo. Não inferir idade corrigida sem as informações necessárias.
- Conferir vedação, repetibilidade e artefatos documentados antes de tratar a classificação sugerida como interpretável. Ausência de pico não identifica isoladamente sua causa.
- Para reflexos, tornar inequívocas orelha da sonda e orelha estimulada, ipsi/contra, frequência e unidade. Mapear explicitamente o formato legado antes de cálculos contralaterais.
- Rever Metz conforme SBFa 2025: relação com reflexo contralateral, dados válidos e interpretação contextual. Não implementar simplesmente `ipsi - VA <= 60` como diagnóstico.
- Rever decay: resultado resumido não contém uma série temporal. Não desenhar reflexograma nem curva de decay a partir de texto livre.

Aceite: casos 226/1000 Hz, unidades compatíveis, pico ausente, registro incompleto, valores reais de zero, reflexos ipsi/contra e condições em que Metz não é calculável. Nenhum diagnóstico etiológico automático por um pico ou uma diferença isolada.

## 8. E5 — Avaliação ocupacional

Dependências: E0, E1 e E2.

Trabalhos:

- Implementar critérios descritivos do Anexo II da NR-7, distinguindo resultado sugestivo, comparação sequencial e conclusão profissional.
- Selecionar e identificar exame de referência válido; não comparar automaticamente com qualquer exame anterior.
- Conferir frequências, vias e condições exigidas. Entalhe com recuperação em 8 kHz, sozinho, não substitui o critério normativo.
- Registrar contexto de exposição e limitações. Não concluir nexo ocupacional ou aptidão por algoritmo de forma de curva.
- Revisar a função `isSuggestivePAIR`, o texto da tela e o relatório comparativo no PDF, que precisam compartilhar as mesmas regras.

Aceite: casos sem referência, com condições incompatíveis, casos que atendem/não atendem cada critério e fronteiras numéricas da norma. Dados insuficientes não produzem conclusão negativa.

## 9. E6 — Fala e procedimentos complementares

Dependências: E0, E1; concordância com E2.

Trabalhos:

- Validar nível/unidade, acertos/total, lista, material, idioma e apresentação conforme procedimento.
- Manter percentual calculado identificável; preservar percentual transcrito e sua origem quando não existem contagens.
- O gráfico atual de fala mostra pontos por material e orelha. Não chamar isso de função desempenho–intensidade, PB máx ou rollover.
- Registro em múltiplos níveis, importação de traçados e novos gráficos são ampliação de escopo: propor separadamente se necessário ao fluxo aprovado.
- Revisar campos de SISI, tone decay, EOA e PEATE para não confundir anotação resumida com execução/validação do teste.
- Não converter automaticamente nHL/eHL/SPL nem inferir resposta normal de um campo em branco.
- Delimitar no produto o registro resumido de EOA/PEATE e o que os campos permitem concluir. EOA presente não estabelece sozinha normalidade auditiva global. Não inferir limiar ou integridade neural de presença/ausência resumida.
- Uma futura conversão eletrofisiológica fundamentada precisa de protocolo, estímulo, frequência, transdutor e fatores de correção verificáveis; o plano não proíbe cálculo validado, mas proíbe conversão genérica ou sem condições conhecidas.

Aceite: zero, porcentagens inválidas, contagens conflitantes, nível ausente, material inadequadamente identificado e dados históricos. Campos de apresentação não sugerem resultados fictícios.

## 10. E7 — Revisão, exportações e documentação profissional

Dependências: contratos clínicos estabilizados em E1–E6. O levantamento normativo pode começar em E0.

Trabalhos:

- Centralizar cálculos/estados usados na tela e exportações. Evitar repetir tabelas ou critérios clínicos nos renderizadores.
- Separar avisos de impedimentos: rascunho, procedimento incompleto com justificativa e conclusão revisada têm requisitos distintos.
- Tornar claros os procedimentos não realizados ou inconclusivos, em vez de obrigar o preenchimento de resultados para permitir finalizar.
- Conferir identificação profissional, CRFa, data/hora, autoria, retenção, acesso e assinatura conforme requisitos aplicáveis, incluindo a Resolução CFFa 777/2025.
- Definir tecnicamente assinatura eletrônica e histórico de versões. `reviewedSignature` atual é uma serialização de integridade, não assinatura avançada/qualificada.
- Não substituir documentos anteriormente emitidos sem histórico de retificação. Distinguir versão da regra de versão do documento emitido.
- Se a assinatura depender de provedor, preparar a integração e documentar a dependência; não simular uma assinatura válida com carimbo, nome digitado ou hash.

Aceite: igualdade de valores/estados entre tela, PDF, Word e Excel; NR e unidades preservados; revisão invalidada quando necessário; rascunho identificado; caminho de emissão e retificação documentado. Não declarar conformidade normativa completa sem verificação específica.

## 11. E8 — Verificação integrada e validação clínica

- Reutilizar as conferências profissionais feitas desde E0; revisar os módulos em cada etapa, não somente ao final.
- Fixtures sintéticas com resultados esperados fundamentados na matriz, incluindo situações que não permitem concluir.
- Resultados esperados devem ser calculados/avaliados independentemente da implementação e vinculados à fonte. Não gerar o oráculo de teste chamando a própria função avaliada.
- Manter conjuntos que cubram casos usuais, fronteiras, dados ausentes, contradições e populações fora do escopo. Exemplos sintéticos pertencem aos testes, não aos valores iniciais da interface.
- Testes de fronteira, serialização, compatibilidade histórica, revisão e exportações reais.
- Conferência visual do audiograma, picos, fala e documentos exportados; manter geometria e rótulos fiéis aos dados.
- Verificação de sincronização em ambiente de teste: criar, salvar, reabrir, sincronizar e comparar os registros. Não usar prontuários reais como fixtures.
- Fonoaudiólogo responsável confere casos representativos e aprova o escopo clínico implementado. Documentar quem conferiu, versão e divergências; anonimizar os materiais quando necessário.
- Definir previamente o método de comparação e os critérios de aceitação de cada saída. Registrar discrepâncias com a referência clínica, investigá-las e repetir a conferência após correções. Não inventar um percentual de concordância mínimo sem fundamentação.
- Registrar erros conhecidos e funcionalidades sem suporte. Testes verdes não demonstram validade diagnóstica, calibração de equipamento ou certificação do prontuário.

Aceite final: critérios das etapas atendidos; nenhuma pendência crítica oculta; responsável clínico e requisitos de emissão definidos para a versão destinada ao uso profissional.

## 12. Fontes e limites já conhecidos

As URLs abaixo foram consultadas nesta colaboração. O agente seguinte deve conferir as seções relevantes e eventual atualização antes de implementar. Não considerar esta lista uma bibliografia exaustiva.

- SBFa, Diretrizes em Imitanciometria, revisão outubro/2025: https://fonoaudiologia.sbfa.org.br/_files/ugd/ead516_b97c2a9ebfd445ef981a64fde38b35d3.pdf — Metz nas páginas 29–30; sonda de alta frequência na página 33; escopo das curvas de baixa frequência e referências do equipamento na página 26.
- BSA, audiometria tonal 2018: https://www.thebsa.org.uk/wp-content/uploads/2024/01/Recommended-Procedure-Pure-Tone-Audiometry-2018.pdf — mascaramento seção 8.6; NR para média específica de cinco frequências na seção 9. O catálogo consultado ainda listava 2018; havia consulta de revisão, não presumir que minuta seja recomendação publicada.
- BSA, timpanometria 2024, emenda março/2026: https://www.thebsa.org.uk/wp-content/uploads/2026/03/BSA-Recommended-Procedure-Tympanometry-Acoustic-Reflex-Thresholds-March-2026-minor-revision.pdf.
- NR-7, texto oficial disponível atualizado em 2022: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-07-atualizada-2022.pdf — conferir Anexo II e eventuais alterações posteriores antes da implementação.
- Resolução CFFa 777/2025: https://www.fonoaudiologia.org.br/resolucoes/resolucoes_html/CFFa_N_777_25.htm — registro profissional e assinatura nos artigos 5–6; demais requisitos do prontuário no texto integral.
- AAA, avaliação de lactentes e crianças, 2020: https://www.audiology.org/wp-content/uploads/2021/05/Clin-Guid-Doc_Assess_Hear_Infants_Children_1.23.20.pdf.
- OMS, World Report on Hearing, 2021: https://www.who.int/publications/i/item/9789240020481 — verificar tabela 1.3 e notas sobre a melhor orelha. O PDF no repositório IRIS retornou bloqueio de acesso na última tentativa; conteúdo indexado foi localizado, mas leitura integral da seção e sua aplicação clínica seguem como item de E0.
- ASHA, avaliação da perda auditiva em crianças: https://www.asha.org/practice-portal/clinical-topics/hearing-loss-in-children/ — fonte complementar para integração dos testes e limitações interpretativas de EOA; não substitui fontes específicas da regra implementada.
- Guia de Orientação na Avaliação Audiológica, vol. I, 2ª ed. (CFFa, jul/2023) — PDF integral obtido em 21/10/2026: https://fonoaudiologia.org.br/wp-content/uploads/2023/11/Guia-de-Orientacao-na-Avaliacao-Audiologica-DIGITAL-COMPLETO-FINAL.pdf. Quadros 2 (tipo), 3–7 e 14–15 (grau), 8 (configuração), 11 (IPRF); "não existe grau normal"; laudos automáticos devem seguir literatura validada e o fonoaudiólogo responde por eles.
- ASHA, Determining Threshold Level for Speech (1988): https://www.asha.org/policy/gl1988-00008/ — concordância LRF × média sem limite numérico.
- Referências adicionais e níveis de acesso: `docs/base-cientifica-exames-2026-10-21.md` e `src/lib/clinicalEvidence.ts`.

## 13. Registro de execução por etapa

Adicionar uma entrada ao concluir ou interromper uma etapa:

```text
Data / agente:
Etapa e status: não iniciada | em andamento | implementação concluída | validação pendente | concluída
Fonte/seção verificada e decisões:
Arquivos alterados:
Compatibilidade / migração:
Testes executados e resultado:
Conferência visual / clínica:
Pendências concretas:
Próxima ação exata:
Commit, se existir:
```

### Registro — 21/10/2026 · Claude (revisão científica 2)

```text
Data / agente: 21/10/2026 · Claude (Opus), a pedido do usuário ("atuar como especialista e ajustar o que for preciso").
Etapa e status: E0 em andamento; E1–E7 parciais (implementação concluída nos itens abaixo; validação clínica pendente).
Fonte/seção verificada e decisões: ver docs/MATRIZ-REGRAS-CLINICAS.md. Guia CFFa 2023 (Quadros 2, 3, 7, 8, 14, 15), NR-7 Anexo II (3.4, 3.6, 5.1–5.5.1, 6), SBFa 2025 (Jerger 226 Hz, 1000 Hz, Metz), BSA 2018 (§6.4, §8.6, §9), ASHA 1988, CFFa 777/2025 (arts. 5º, 6º, 8º).
Arquivos alterados: src/lib/audiologyCalculations.ts, src/lib/examIntegrity.ts, src/lib/clinicalEvidence.ts, src/lib/clinicalOverview.ts, src/lib/exportPdf.tsx, src/lib/exportWord.ts, src/lib/exportExcel.ts, src/lib/localPassword.ts (novo), src/db/db.ts, src/services/aiAudiologyService.ts, src/components/exams/{TonalAudiometryExam,StapedialReflexExam,TympanometryExam,LogoAudiometryExam}.tsx, src/components/NotificationsModal.tsx, src/components/landing/{HeroSection,BentoGridSection,BeforeAfterSection,LandingFooter}.tsx, src/contexts/AuthContext.tsx, src/pages/{NewExam,CompareExams,EvolutionControl,Patients,Settings,Manual,PoliticaDePrivacidade,AnamnesisForm}.tsx, tests/clinical-regressions.cjs, docs/*.
Compatibilidade / migração: campos novos opcionais; 'OMS_2014' mantida como chave; 'As' legado continua legível; senhas locais em texto migradas para PBKDF2 no próximo login. CLINICAL_RULES_VERSION 2026-10-21.3 invalida revisões anteriores (exigem nova confirmação).
Testes executados e resultado: no ambiente do Claude (sem acesso ao registro npm) 40 de 42 testes passaram; os 2 restantes dependem de @react-pdf/renderer e lucide-react, não instaláveis ali. Type-check com stubs sem erros nos arquivos alterados. `npm test` e `npm run build` precisam ser executados na máquina do usuário.
Conferência visual / clínica: não realizada. Nenhuma validação clínica.
Pendências concretas: decisões 1–7 da matriz; seleção explícita do exame de referência NR-7; tabelas pediátricas; RLS do Supabase (exclusões por id dependem dela); avaliação regulatória Anvisa (RDC 657/2022) e LGPD (contratos/operadores); provedor de assinatura eletrônica; conferir afirmação "mais de 120 consultórios" na landing.
Próxima ação exata: rodar npm test / npm run build / git diff --check; conferência visual das telas Tonal, Reflexos, Timpanometria, Comparar; apresentar a matriz a um fonoaudiólogo responsável.
Commit, se existir: nenhum.
```

### Registro — 21/10/2026 · Claude (guarda do prontuário)

```text
Etapa e status: E7 parcial — guarda do prontuário implementada (DOC-02 da matriz); validação jurídica/clínica pendente.
Decisão: paciente com menos de 20 anos desde o último registro é arquivado, não apagado (Res. CFFa 777/2025, art. 8º). Exclusão da conta exige exportação da cópia completa e declaração de guarda.
Arquivos: src/lib/recordRetention.ts (novo), src/db/db.ts, src/pages/{Patients,NewExam,Agenda,Settings,PoliticaDePrivacidade}.tsx, supabase/migrations/20261021190000_patients_archived_at.sql (novo), tests/clinical-regressions.cjs.
Migração: executar o SQL no Supabase antes de publicar; sem a coluna "archivedAt" o arquivamento falha na sincronização.
Testes: 41/43 no ambiente do Claude (os 2 restantes dependem de pacotes não instaláveis ali).
Removido também: "Utilizado em mais de 120 consultórios" da página inicial (afirmação sem comprovação).
```

### Registro — 21/10/2026 · Claude (classificações do Guia CFFa)

```text
Pedido: incorporar a orientação da fonoaudióloga consultada pelo usuário (a referência é escolha do profissional; seletor de referência; tabela própria para crianças).
Fonte: Guia CFFa 2023, Quadros 3–7, 14 e 15 (números conferidos no PDF).
Implementado: Kaplan/Gladstone/Lloyd 1993, Davis 1970, BIAP 1996, Northern e Downs 2005; sugestão de grau infantil apenas com Quadros 14–15; normalidade bilateral conforme a tabela escolhida. CLINICAL_RULES_VERSION 2026-10-21.4.
Testes: 42/44 no ambiente do Claude (2 dependem de pacotes não instaláveis ali).
Pendente: decisão do usuário sobre a curva timpanométrica pedida pela fonoaudióloga (ver CONTINUIDADE).
```

### Registro — 21/10/2026 · Claude (revisão de coerência do sistema)

```text
Corrigido:
- Comparação permitia exames de pacientes diferentes (lista e tela de comparação agora bloqueiam).
- Parecer: tipo/grau/configuração registrados pelo profissional não saíam no PDF/Word/Excel; agora saem, com a situação clínica revisada e a classificação adotada.
- Assinatura do PDF/Word usava o cadastro de Configurações mesmo quando o exame foi feito por outro profissional; agora usa o profissional do exame (preenchido automaticamente a partir do cadastro em exames novos).
- PDF omitia Tone decay e SISI; imprimia linha de EOA/PEATE vazia.
- Idade na lista de pacientes e data nas notificações recuavam um dia (data AAAA-MM-DD lida como UTC).
- Selo de síntese na lista de exames ficava vermelho para qualquer rascunho.
- Importar backup apagava dados sem confirmação e marcava registros como "sincronizados" (seriam removidos na reconciliação seguinte); agora confirma e marca como pendentes.
- Assinatura expirada bloqueava o acesso à cópia dos prontuários; tela de planos ganhou "Baixar cópia dos meus dados".
- Webhook de pagamento: não verificava assinatura (qualquer um ativava assinatura por POST) e usava nomes de evento inexistentes no Dodo (payment.success, subscription.created, subscription.canceled, payment.refunded). Reescrito com Standard Webhooks e eventos documentados.
- Checkout usava URL de TESTE fixa; agora lê VITE_DODO_CHECKOUT_URL. Botão "Gerenciar assinatura" era um alerta; agora abre VITE_DODO_CUSTOMER_PORTAL_URL ou e-mail de suporte.
- Termos citavam "planos gratuitos" e FAQ prometia cancelamento "em um clique no painel"; textos alinhados ao fluxo real. Landing dizia "PDF, Word e Excel", mas não há botão de Word.
- Aviso de exame de referência (NR-7) agora aceita exame admissional como base.
Pendências externas: definir VITE_DODO_CHECKOUT_URL e DODO_WEBHOOK_SECRET em produção; confirmar no painel Dodo o formato do payload (customer.email / next_billing_date); RLS do Supabase; botão de Word (exportação existe mas não está na interface e não inclui reflexos/testes especiais).
```
