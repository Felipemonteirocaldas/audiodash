# Auditoria técnica e clínica do AudioDash

Data: 21/10/2026. Prioridade definida pelo usuário: clínica de adultos e crianças.

## Conclusão e alcance

O sistema possui uma estrutura útil de cadastro e lançamento, mas o motor interpretativo não deve ser tratado como validado para emissão autônoma de conclusões clínicas. Há resultados fabricados por valores padrão, inferências com dados insuficientes e perda de informações entre tela, estado e exportação.

Esta é uma auditoria de software com confronto documental, não uma perícia clínica assinada nem certificação regulatória. Foram inspecionados `/painel` e `/exame/novo` após autenticação pelo usuário, código de cálculo, componentes de exame, modelo de dados, geração de parecer e caminhos de exportação. Foram executadas funções com dados sintéticos em memória. Nenhum prontuário foi criado ou alterado. Não foram acionados serviços de IA nem produzidos laudos de pacientes reais. Exportações, sincronização e persistência não receberam ensaio completo de ponta a ponta nesta etapa.

## Evidências prioritárias

P0 = corrigir antes de confiar na geração clínica; P1 = corrigir antes da liberação do fluxo; P2 = melhoria de uso.

| ID | Prioridade | Evidência no código/interface | Consequência e correção proposta |
|---|---|---|---|
| C01 | P0 | `src/pages/NewExam.tsx:75`: meatoscopia começa normal bilateral, com descrição de membrana íntegra. Confirmado na interface vazia. | Achado não realizado pode aparecer no laudo. Iniciar como não realizado; exigir registro explícito por orelha. |
| C02 | P0 | `src/components/exams/TympanometryExam.tsx`, `applyPreset`: Tipo A insere pressão 0, complacência 0,85 e volume 1,10; outros tipos também inserem números. Clique no gráfico preenche volume 1,10 quando ausente. | A classificação selecionada fabrica medições. Retirar preenchimento numérico no fluxo clínico; exemplos somente em ambiente demonstrativo separado. |
| C03 | P0 | `src/components/exams/StapedialReflexExam.tsx:91`: Preset Normal preenche reflexos 85–95 dB, diferenças fixas e decay negativo bilateral. | Dados sem observação clínica, inclusive diferenças desconectadas dos limiares. Registrar exclusivamente resultados medidos e condição de pesquisa. |
| C04 | P0 | `src/lib/audiologyCalculations.ts:72`: NR é convertido em 120. `AudiogramSVG.tsx:184` e `exportPdf.tsx:319` também colocam NR em 120. | Ausência de resposta não é limiar de 120 dB. Guardar nível máximo apresentado por via/frequência/transdutor e estado sem resposta; não fabricar média numérica. |
| C05 | P0 | `calculatePTA`: média tritonal aceita dois valores; quadritonal aceita três. `classifyDegree` troca silenciosamente a média quando a exigida falta. | Classificação aparentemente completa com protocolo incompleto. Exigir conjunto definido pela referência; apresentar pendência quando insuficiente. |
| C06 | P0 | `classifyType`: retorno final Neurossensorial mesmo sem VO; considera VO alterada apenas acima de 25 dB apesar de citar Silman e Silverman. | Tipo sem sustentação e referência aplicada incorretamente. Separar suficiência de dados, critério da fonte, validade do mascaramento e conclusão profissional. |
| C07 | P0 | `src/services/aiAudiologyService.ts:146`: estilo AASI insere perda confirmada e indicação bilateral sem verificar resultados. Exame vazio também gera síntese de perda bilateral. | O estilo de redação altera fatos clínicos. Gerar somente rascunho de achados disponíveis; conduta deve depender da avaliação e validação profissional. |
| C08 | P0 | `isSuggestivePAIR` usa zero para graves ausentes e descreve perda neurossensorial bilateral sem verificar VO. | Dados parciais podem virar parecer ocupacional. Isolar módulo ocupacional e rever contra a NR-7, sem inferir etiologia de um entalhe isolado. |
| C09 | P1 | `TympanogramSVG.tsx:100`: curva Bézier artificial usando apenas pico e complacência. | Desenho aparenta curva adquirida. Mostrar ponto/resumo ou identificar como esquema; curva medida exige amostras do equipamento. |
| C10 | P1 | `getNumericThreshold` usa parseFloat sem normalizar vírgula; gráfico timpanométrico normaliza. | `0,8` é lido como zero pelo classificador e como 0,8 no gráfico. Unificar parsing, validação e representação. |
| C11 | P1 | `checkMaskingNecessity` substitui VO contralateral ausente por VA ou zero; calcula faixa chamada plateau. Fala usa outra regra fixa, 45 dB e apenas 1 kHz. | Sugestões não têm pré-requisitos confiáveis e faixa calculada não comprova platô observado. Registrar protocolo, transdutor, frequência, ruído aplicado e validação; ausência de dados deve impedir recomendação numérica. |
| C12 | P1 | Interface vazia mostra LRF Concordante e Padrão Fisiológico. `validateSpeechConcordance` retorna true sem dados; reflexos sem recrutamento são tratados visualmente como fisiológicos. | Não avaliado vira resultado positivo. Usar estados distintos: não realizado, incompleto, inconclusivo, válido e inválido. |
| C13 | P1 | `classifyIPRF` aceita 150%; texto de IPRF baixo sugere fortemente lesão retrococlear/neuropatia. | Falta validação e há extrapolação etiológica. Registrar material, idioma, número de itens/acertos, apresentação, nível e mascaramento; não concluir etiologia isoladamente. |
| C14 | P1 | `analyzeStapedialReflexes` retorna Normal para diferença negativa. | Contradição numérica passa como normal. Validar compatibilidade e impedir interpretação com dados inválidos. |
| C15 | P1 | `NewExam.tsx:522–523`: dois callbacks usam o mesmo objeto exam; gerador chama ambos consecutivamente. | Atualização de conduta pode sobrescrever opinião recém-gerada por batching do React. Aplicar atualização atômica ou setters funcionais. Constatação estática; não foi reproduzida no navegador. |
| C16 | P1 | Padrão de classificação é estado separado do exame; transdutor é estado local do componente tonal. | Referência não é persistida e transdutor pode reiniciar ao trocar abas. Persistir contexto e versão das regras no exame. |
| C17 | P1 | `ExportPdfModal.tsx:20–40`: retorno antes de hooks e detecção por truthiness; testes detectados por poucos campos. | Risco de ordem de hooks; zero numérico e resultados só em OE podem ser omitidos. Revisar hooks e detecção estrutural. Falha de abertura não comprovada nesta inspeção. |
| C18 | P1 | `exportExcel.ts:10`: NR vira undefined; lista de frequências omite 750 e 1500 Hz. | Exportação perde resultados registrados. Criar matriz de equivalência tela/banco/PDF/Excel, preservando ausência de resposta e frequências efetivamente avaliadas. |
| C19 | P1 | Salvar permite confirmar ausência de frequências; exportar não depende de revisão clínica; modelo não possui ciclo de rascunho/revisado/finalizado. | Documento pode parecer concluído sem protocolo completo. Permitir rascunhos e separar claramente emissão final, autoria e revisão. |
| C20 | P1 | IA local é conjunto de regras/templates; serviço recebe nome/idade e pode enviar resumo clínico ao Gemini quando configurado. Parâmetro openai não possui implementação correspondente. | Descrever a capacidade real; minimizar dados enviados e explicitar processamento externo. Não foi verificada chave configurada nem realizada chamada externa. |

## Exemplos executados em memória

Execução com Node.js e transpileModule do TypeScript instalado. Funções de cálculo foram executadas isoladamente; para o gerador local, foi carregado somente o trecho anterior à função de chamada cloud. Não houve alteração no código da aplicação.

| Entrada sintética | Saída atual observada | Resultado esperado após correção |
|---|---|---|
| VA 500=10, 1000=20, sem 2000 Hz | Tritonal=15 | Média tritonal indisponível; identificar frequência ausente. |
| NR nas quatro frequências da média | Quadritonal=120 | Ausência de resposta preservada, sem limiar inventado. |
| VA=50 em 500/1000/2000, sem VO | Neurossensorial | Tipo indeterminado por insuficiência de dados. |
| Reflexo ipsi 40 e VA 60 em 1 kHz | Sensação -20, interpretação Normal | Inconsistência a revisar. |
| IPRF=150% | Excelente | Entrada inválida. |
| 4 kHz=50 e 8 kHz=20 bilateral, demais ausentes | Sugestivo de PAIR neurossensorial bilateral | Dados insuficientes; não assumir graves normais ou tipo. |
| Pico 0, complacência `0,8`, volume 1 | Tipo As | Interpretar 0,8 corretamente antes de classificar. |
| Exame vazio, estilo padrão | Perda auditiva bilateral do tipo não avaliado, grau não avaliado | Não emitir conclusão de perda. |
| Exame vazio, estilo AASI | Perda confirmada e indicação de avaliação/adaptação bilateral | Não gerar afirmação clínica sem suporte. |

## Dashboard

Observação visual: estrutura legível, cores de ação consistentes, navegação lateral clara. No viewport inspecionado, relógio e clima ocupam grande área superior e deixam espaço vazio; agenda e últimos exames ficam abaixo. Há múltiplos acessos redundantes a Novo Exame. A tela consultada tinha zero exames, por isso não foi possível confrontar os indicadores com um conjunto real de laudos.

Problemas confirmados no código:

- `Dashboard.tsx:141`: busca textual de normal classifica também expressões como anormal ou um parecer com OD normal e OE alterada. Qualquer texto restante não vazio é contado como alterado, inclusive inconclusivo.
- Categoria ocupacional vira rótulo Alterado Ocupacional (PAIR), embora categoria do exame não estabeleça etiologia.
- `Dashboard.tsx:50–56`: próximo agendamento não depende do relógio na memoização; fallback retorna primeiro agendamento mesmo que passado/concluído.
- `Dashboard.tsx:108`: falha no clima mostra 24 °C inventados.
- Consulta inicial sem resposta é tratada como zero; deve haver carregando/erro/vazio separados.

Proposta de composição:

1. Cabeçalho compacto com data, pesquisa e ação principal Novo atendimento.
2. Primeira linha: agenda de hoje, exames em rascunho, aguardando revisão e pendências de sincronização.
3. Área principal: continuar atendimento e últimos exames, com paciente, data, protocolo e status.
4. Indicadores com período explícito, população adulta/pediátrica e denominador. Normalidade bilateral, alteração unilateral/bilateral, inconclusivos e não classificados devem vir de campos estruturados revisados.
5. Clima removido da prioridade clínica; atalhos sem duplicações desnecessárias.

## Requisitos para adultos e crianças

Não basta acrescentar um checkbox infantil. A idade atual em anos aproximados não representa a idade na data do exame e é inadequada para lactentes.

- Calcular idade na data do atendimento, com meses/dias quando necessários. Registrar idade corrigida quando aplicável ao protocolo.
- Registrar método utilizado e adequação ao desenvolvimento: convencional, condicionamento lúdico, reforço visual e outras avaliações conforme indicação profissional. Separar limiar de nível mínimo de resposta.
- Campo livre deve registrar condição com/sem dispositivos, estímulo e método; não atribuir automaticamente resultado a uma orelha.
- Timpanometria precisa de frequência de sonda, condições de vedação, presença/ausência de pico e referência apropriada à idade. Não aplicar a mesma faixa numérica universalmente. A ASHA distingue uso da sonda de 1000 Hz em lactentes; o limite etário deve acompanhar o protocolo escolhido [S4].
- EOA presente não equivale universalmente a passa, e EOA ausente não determina perda. Registrar protocolo, qualidade, ruído e critérios do equipamento. PEATE exige condições de aquisição e interpretação; campos livres de latências são registro resumido, não módulo diagnóstico completo [S4].
- Logoaudiometria precisa considerar linguagem, familiaridade com material e capacidade de resposta. Rótulos etiológicos não devem derivar de percentuais isolados [S3].
- Revisão por fonoaudiólogo responsável de casos sintéticos e casos de referência antes de liberar regras para uso clínico.

## Ordem de implementação proposta

1. **Conter conclusões indevidas:** retirar presets numéricos, normalidade padrão e condutas automáticas; impedir conclusão com dados insuficientes.
2. **Reconstruir dados e cálculos:** estados de medição, NR com nível apresentado, referência versionada, médias completas, validação numérica, idade no exame e transdutor persistido.
3. **Reorganizar atendimento clínico:** identificação → anamnese/inspeção → procedimentos selecionados → validação → parecer revisado. Mostrar módulos conforme protocolo, mantendo testes complementares opcionais.
4. **Garantir integridade:** salvar, reabrir, editar e exportar sem perda de dados ou mudança de critérios; histórico de versões e autoria. Preservar dados legados e sinalizar interpretações antigas para revisão, sem reescrita silenciosa.
5. **Refazer painel:** indicadores estruturados, continuidade de atendimento e filtros úteis.
6. **Manter ocupacional separado:** só reativar conclusões específicas após implementar integralmente critérios documentados e testes próprios.

Critérios mínimos de aceitação: todos os exemplos acima devem deixar de gerar falsas conclusões; exame vazio não deve conter normalidade; critérios e transdutor devem sobreviver a troca de abas e reabertura; resultados de zero/NR/OE devem permanecer nas exportações; revisão de dados deve invalidar parecer automático anterior; relatório final deve identificar profissional, data, método e referência usada.

## Fundamentação e limites documentais

As fontes sustentam requisitos clínicos, não certificam a implementação. Evitar misturar referências com nomes diferentes como se fossem a mesma tabela. Os intervalos numéricos OMS 2021 presentes no código não são, por si, o principal erro: o problema inclui média substituída, dados incompletos e contexto inadequado [S5].

- **S1 — CFFa, Guia de Orientação na Avaliação Audiológica (2020)**: [arquivo indexado](https://fonoaudiologia.org.br/wp-content/uploads/2020/09/CFFa_Manual_Audiologia-1.pdf). Trecho indexado acessível diferencia VO até 15 dB e acima de 15 dB na classificação de Silman e Silverman. Download direto retornou 404 nesta consulta; não foi possível revisar integralmente essa edição. A implementação atual usa 25 dB para VO. Não atribuir ao CFFa regras não verificadas.
- **S2 — ASHA, Guidelines for Manual Pure-Tone Threshold Audiometry**: [documento](https://www.asha.org/policy/GL2005-00014/). Fundamenta registro de limiares, exame prévio, procedimento e mascaramento apropriado; informações faltantes não são medições.
- **S3 — ASHA, Hearing Loss in Adults**: [avaliação clínica](https://www.asha.org/practice-portal/clinical-topics/hearing-loss). Sustenta integração dos procedimentos e documentação das condições de testes de fala.
- **S4 — ASHA, Hearing Loss in Children**: [avaliação pediátrica](https://www.asha.org/practice-portal/clinical-topics/hearing-loss-in-children/). Métodos e parâmetros dependem de idade e desenvolvimento, com integração de informações comportamentais e objetivas.
- **S5 — OMS, World Report on Hearing, 2021**: [publicação](https://www.who.int/publications/i/item/9789240020481). A graduação e seu contexto precisam ser preservados; não intercambiar médias/referências silenciosamente.
- **S6 — Ministério do Trabalho, NR-7, Anexo II**: [texto disponibilizado na página oficial vigente](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-07-atualizada-2022-1.pdf). Itens 5.3–5.4 distinguem desencadeamento e agravamento, com comparações de médias e frequências contra referência. Colorir qualquer piora de 10 dB não implementa esse conjunto de regras. O repouso auditivo mínimo de 14 horas e requisitos de registro também precisam ser contemplados no módulo ocupacional.

Próxima etapa recomendada: corrigir C01–C07 e C12, reconstruindo primeiro a distinção entre dado medido, cálculo e parecer profissional; em seguida implementar o contexto pediátrico.
