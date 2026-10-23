# Continuidade — Codex / Claude

Última atualização: 21/10/2026, revisão científica 2 (Claude) — primeira execução parcial de E0–E7. Atualizar este arquivo antes de trocar de agente ou encerrar uma etapa.

## 1. Pedido e próxima ação

O usuário solicitou um plano de implementação e orientações para o Claude continuar quando o contexto/créditos do Codex se esgotarem. O plano foi registrado em `docs/PLANO-IMPLEMENTACAO-CLINICA.md`. Nenhuma etapa E0–E8 foi iniciada pela criação destes documentos.

Quando o usuário autorizar a execução, começar por E0: conferir fontes originais e elaborar a matriz de regras. Em seguida, E1: inventário dos estados e contratos atuais. Não iniciar diretamente pela ativação dos booleanos de Metz/PAIR.

Após a elaboração, o usuário pediu nova análise científica e autorizou incorporar seus ajustes. O plano está na revisão 1. Esta autorização foi atendida atualizando a documentação; nenhuma regra clínica foi implementada nesta revisão. As etapas E0–E8 permanecem pendentes.

Requisitos acrescidos que o próximo agente deve observar:

- Especificar cada automação com fórmula/decisão, população, unidade de análise, exclusões, resultado e casos independentes antes de programá-la.
- Distinguir graduação global OMS pela melhor orelha de descrição por orelha/frequência; conferir integralmente a seção aplicável em E0.
- Integrar resultados pediátricos e investigação de discrepâncias, sem exigir todos os testes em toda consulta ou reduzir elegibilidade a um seletor.
- Campo livre não adquire lateralidade; manter método, estímulo e condição com/sem dispositivos.
- Documentar qualidade/limitações da aquisição e origem dos dados. Campo numérico válido não comprova coleta válida.
- NR precisa de nível e contexto/motivo; uma pesquisa interrompida não equivale a ausência de resposta por gravidade da perda.
- Validação profissional começa na especificação e acompanha as etapas. Não aguardar E8 para buscar a primeira conferência clínica.
- Testes precisam de resultados esperados independentes da função implementada; não apresentar exemplos sintéticos como dados da aplicação.

### Atualização da revisão científica 2 (Claude, 21/10/2026)

O usuário pediu atuação como especialista para ajustar o sistema às fontes e corrigir incoerências. Foram implementadas regras com fonte verificada (ver `docs/MATRIZ-REGRAS-CLINICAS.md` e o registro na seção 13 do plano). Principais mudanças: tipo pelo Guia CFFa 2023 sem exigir 250/6k/8k; grau sem "Audição Normal"; classificação global OMS 2021 pela melhor orelha; NR-7 Anexo II (5.1–5.4) em tela, comparação e PDF; regra 2 da BSA corrigida; Metz pela SBFa 2025 condicionado à convenção de orelha; Jerger só em 226 Hz; LRF sem limite inventado; textos comerciais e do manual corrigidos; senha local com PBKDF2; status de pacientes/notificações pela decisão estruturada; datas locais; aviso de guarda do prontuário (CFFa 777) nas exclusões.

Fonoaudióloga consultada pelo usuário (21/10/2026): pediu seletor de referência (escolha do profissional) e tabela própria para crianças — implementadas as classificações do Guia CFFa 2023 (Quadros 3–7, 14, 15); e timpanograma com curva fechando no pico — o usuário escolheu a curva ILUSTRATIVA, identificada como não medida, na tela e no PDF. A regra anterior "não recuperar curvas simuladas" foi substituída por essa decisão apenas para o timpanograma.

Revisão de coerência (21/10/2026): ver último registro do plano — inclui correções de segurança no webhook de pagamento (assinatura verificada) e variáveis novas VITE_DODO_CHECKOUT_URL / VITE_DODO_CUSTOMER_PORTAL_URL / DODO_WEBHOOK_SECRET.

Guarda do prontuário (21/10/2026, depois da revisão 2): exclusão de paciente virou arquivamento enquanto não completar 20 anos do último registro (Res. CFFa 777/2025, art. 8º); exclusão da conta exige backup exportado e declaração de guarda. **Antes de publicar, rodar no Supabase** `supabase/migrations/20261021190000_patients_archived_at.sql`.

Painel de início (23/10/2026, Claude): lógica do painel extraída para `buildDashboardOverview` em `src/lib/clinicalOverview.ts` (testada em `tests/clinical-regressions.cjs`, testes "painel: …"). Mudanças: pacientes arquivados fora dos totais e das filas; motivo da revisão separado (nunca revisado / editado após a revisão / regras clínicas atualizadas, via `reviewState`); card "A atender hoje" mostra só os agendados; filtros no topo, com novos períodos (30 dias, ano, personalizado) e comparação com o período anterior; selo de escopo em cada bloco; alertas (assinatura, atendimentos fora do horário, revisões com regras atualizadas, exames recentes sem data de calibração, registros sem envio incluindo anamneses e configurações). Não foi criado alerta de calibração vencida nem de retenção: não há intervalo normativo documentado neste plano. Data por extenso em `src/lib/dateLabels.ts` (cabeçalho e painel). Menu: "Dashboard (Início)" virou "Início". Nenhuma regra clínica foi alterada. **Verificação parcial:** testes do painel passaram; `npm run build` e a suíte completa NÃO foram executados nesta sessão (instalação de dependências bloqueada no ambiente em nuvem) — rodar `npm test`, `npm run build` e lint localmente antes de publicar.

Configurações (23/10/2026, Claude): `src/pages/Settings.tsx` reescrita e `src/lib/backup.ts` ampliado; novo `src/lib/settingsValidation.ts`. Correções: exclusão de dados agora apaga a nuvem primeiro, confere o erro de cada tabela e só então limpa o aparelho (antes limpava o aparelho primeiro e dava sucesso mesmo com falha no servidor); mensagens distintas para falha total, parcial e sem conexão; sincronização que chegava do banco não sobrescreve mais o que está sendo digitado (controle de edição não salva, aviso ao sair, descartar); salvar grava no aparelho e trata falha de envio à nuvem como aviso, sem erro técnico em alerta; importação de backup valida o arquivo (listas, ids, duplicados), mostra a contagem do arquivo versus a do aparelho, baixa uma cópia dos dados atuais antes de substituir e restaura em transação; mostra a data da última cópia exportada; logo reduzida a 600 px (antes qualquer imagem era gravada e sincronizada sem limite); validação e máscaras de CPF, CNPJ, CEP, UF, telefone, e-mail e Instagram (campos vazios continuam válidos); assinatura sem degradê e com texto dependente da data de fim (cancelada com data vencida não diz mais que o acesso continua); abas com papéis ARIA e teclado, rótulos ligados aos campos, modal de exclusão com `role="dialog"` e Escape. O botão agora diz "Excluir dados do consultório": não há função no repositório que apague o usuário de autenticação, então a tela não afirma que a conta é excluída. Testes: "configurações: …" e "backup: …" em `tests/clinical-regressions.cjs`. **Pendente:** `npm run build`, suíte completa e lint locais (instalação de dependências bloqueada na sessão em nuvem); conferir visualmente a tela.

Configurações, segunda auditoria (23/10/2026, Claude): corrigidos ao testar a tela em Chromium com banco e nuvem simulados (78 verificações, fora do repositório) — a mensagem de salvar agora vem da própria linha salva (`syncStatus`) e não de um erro antigo do gerenciador (`src/lib/settingsStatus.ts`); a tela usa a primeira linha da tabela de configurações, como menu, painel e exportações (antes lia `settings_1` e podia criar uma segunda linha); salvar é leitura+gravação em transação, preservando campos que o formulário não edita; atualização vinda do banco entra campo a campo (antes, com edição em andamento, ela era ignorada por inteiro e o salvar seguinte apagava a mudança remota); Enter salva (formulário); telefone aceita +55 colado; logo pesada vira JPEG; assinatura "ativa" com data vencida aparece como vencida; contagens no singular ("1 paciente"); títulos em h2. **Trava de segurança na exclusão:** antes de apagar, conta os registros na nuvem e recusa se houver mais do que na cópia exportada (aparelho novo ainda sem sincronizar geraria cópia incompleta). Limites conhecidos: (1) não há bloqueio de navegação interna com alterações não salvas (o app usa `BrowserRouter`, sem `useBlocker`); só há aviso ao fechar/recarregar; (2) uma sincronização automática que ocorra entre a exclusão na nuvem e a limpeza local pode reenviar registros pendentes; (3) `pullFromSupabase` usa `bulkPut` e pode sobrescrever edição local ainda pendente no login — fora do escopo desta tela, vale revisar; (4) importar não esvazia a nuvem: o que existir só lá pode voltar no próximo login.

Configurações, terceira rodada (23/10/2026, Claude): modal de exclusão com fundo inerte (`inert`), Tab preso dentro dele e foco devolvido ao botão de origem; site validado (só http/https ou domínio; `javascript:` e similares recusados); limite de 200 MB na importação; aviso de que o backup contém dados pessoais e de saúde sem criptografia; contagem local mostra "Indisponível" se a leitura falhar. **Achado de coerência ainda aberto:** `razão social, CNPJ, CEP, bairro, cidade, UF, site e Instagram` são coletados mas nenhum código os usa; o cabeçalho do PDF imprime só clínica, profissional/CRFa/especialidade, telefone, e-mail e a linha de endereço (sem bairro/cidade/UF/CEP), e o Word imprime só clínica e profissional. Também no PDF, o selo "LAUDO OFICIAL" é fixo, inclusive em rascunho (a primeira linha diz "RASCUNHO — AGUARDANDO REVISÃO PROFISSIONAL"). Decisão do usuário pendente sobre o que deve constar no cabeçalho dos laudos.

## 2. Ambiente e estado do código

- Pasta: `E:\AUDIODASH`; Windows / PowerShell.
- Stack: React 19, TypeScript 6, Vite 8, Dexie, Supabase, React PDF, ExcelJS e docx. Confirmar versões em `package.json`.
- Páginas principais: `/painel`, `/exame/novo`; desenvolvimento vinha sendo acessado em `http://localhost:3000`.
- Branch observada na elaboração: `main`; último commit: `47d2eb2` (`feat: implement agenda view, patient management, and synchronization service`). Esse commit NÃO contém as alterações locais posteriores desta colaboração.
- Há muitas alterações locais não commitadas e arquivos novos. A base é o conteúdo atual da pasta, não somente o HEAD do Git.
- `package-lock.json` já estava modificado antes das intervenções anteriores. Preservar.
- Não foram encontrados `AGENTS.md` nem `CLAUDE.md` antes deste planejamento. O novo `CLAUDE.md` da raiz orienta a retomada.
- A sessão do navegador do Codex não deve ser presumida disponível ao Claude. Não copiar credenciais ou dados de pacientes para resolver acesso.

## 3. Melhorias já existentes, a preservar

- Dashboard baseado em agenda e estados estruturados, sem contar normalidade por palavras no laudo.
- Exame novo sem achados de meatoscopia predefinidos; rascunho e revisão vinculada aos dados.
- Idade na data do exame; método, natureza da resposta, confiabilidade, referência e condições registráveis.
- NR com nível apresentado separado; zero preservado; sem substituição global por 120 dB.
- Audiograma logarítmico, proporção oitava/20 dB, símbolos por via/mascaramento, setas NR e seleção de dados compartilhada com PDF.
- Timpanometria com pontos reais de pico, separação de sonda/unidade, pressão zero destacada e valores visíveis; sem curva reconstruída artificialmente.
- IPRF por contagem e material identificado; gráfico de pontos por material na tela/PDF, sem estimativa de curva.
- EOA/PEATE como registros resumidos de equipamento externo.
- Resumo determinístico local; não há IA gerando diagnóstico ou conduta nesse fluxo.
- Descrições anatômicas, encaminhamentos e valores de exemplo não são mais gerados ao selecionar um achado de meatoscopia.
- Removidos brilhos e ícones decorativos de títulos/abas dos exames. `lucide-react` permanece para ações/navegação; não afirmar que a dependência inteira foi removida.
- Exportações foram ampliadas; testes incluem PDF real e round-trip Excel com fixtures sintéticas.

## 4. Problemas confirmados que continuam pendentes

- `classifyType` exige oito frequências numéricas de VA antes de analisar os pares VA/VO.
- `isSuggestivePAIR` e `hasRecruitment` retornam falso fixo; distinguir não analisado de resultado negativo.
- `classifyConfiguration` descreve amplitude de variação, não classifica a configuração.
- Timpanometria é classificação informada pelo profissional, não um algoritmo clínico completo.
- Alertas de mascaramento dependem de seleção explícita BSA; ausência de protocolo deve ser comunicada adequadamente e o fluxo precisa de configuração.
- Elegibilidade diverge entre tela e resumo. Há bloqueio geral para menores de 18 anos, a revisar por protocolo, sem liberar indiscriminadamente regras adultas.
- NR pode resultar em "Não avaliado"; melhorar estados e implementar apenas convenções específicas fundamentadas.
- Validação de normalidade bilateral contém limite fixo de 25 dB.
- Estado de revisão e serialização de dados não constituem assinatura eletrônica avançada/qualificada.
- Metadados e mapeamento de orelha da sonda versus orelha estimulada precisam ser revistos antes de interpretação de reflexo contralateral.

## 5. Correções à análise do Gemini

A análise foi tratada como material para avaliação, não como instruções aprovadas.

- Presets de meatoscopia e caixa de "Sem indicação automática" já foram removidos.
- Timpanometria não é sempre inconclusiva: aceita classificação documentada.
- Requisitos de revisão são condicionais aos dados/status, não obrigatórios indistintamente.
- Na tela, método não participa da mesma forma que no resumo; referências não se limitam a OMS.
- Não aceitar mascaramento como um conjunto único de regras universais. O texto do Gemini alternava gap de 10 e 15 dB sem delimitação.
- Não implementar Metz simplesmente como `ipsi - VA <= 60`. SBFa 2025 descreve reflexo contralateral e limites interpretativos.
- Não diagnosticar perda profunda por qualquer NR. A convenção BSA de 130 dB pertence a sua média de cinco frequências; não é um limiar observado e não deve ser aplicada automaticamente a outras tabelas.
- Um padrão ocupacional pode gerar alerta fundamentado; um entalhe isolado não determina nexo ou aptidão.

## 6. Mapa dos arquivos

| Área | Arquivos |
| --- | --- |
| Modelos/persistência | `src/db/db.ts`, `src/lib/syncManager.ts` |
| Cálculos | `src/lib/audiologyCalculations.ts`, `src/lib/clinicalProtocol.ts` |
| Integridade/revisão | `src/lib/examIntegrity.ts`, `src/components/exams/AudiologicalOpinionSummary.tsx` |
| Fluxo e exames | `src/pages/NewExam.tsx`, `src/components/exams/*` |
| Gráficos | `src/lib/examPlot.ts`, `src/lib/speechPlot.ts`, `src/components/AudiogramSVG.tsx`, `src/components/TympanogramSVG.tsx`, `src/components/SpeechRecognitionSVG.tsx` |
| Resumo e fontes | `src/services/aiAudiologyService.ts`, `src/lib/clinicalEvidence.ts` |
| Exportações | `src/lib/exportPdf.tsx`, `src/lib/exportWord.ts`, `src/lib/exportExcel.ts`, `src/components/ExportPdfModal.tsx` |
| Regressões | `tests/clinical-regressions.cjs` |

## 7. Verificação conhecida

Última execução antes da elaboração deste plano:

- `npm test`: 31 testes aprovados.
- `npm run build`: concluído; avisos de bundle grande e `eval` em dependência.
- `git diff --check`: sem erros.
- Lint direcionado das últimas alterações: sem erros; o arquivo PDF possui avisos de organização para Fast Refresh.
- Conferências visuais feitas sem paciente selecionado; dados temporários descartados, sem salvar prontuários.

Não foi repetida a suíte apenas por escrever estes documentos. O Claude deve obter uma execução de referência antes de alterar código, se o ambiente permitir. Verificar resultados atuais, não pressupor que o número de testes continuará 31.

Não há validação clínica formal concluída nem comprovação de conformidade normativa integral.

## 8. Documentos anteriores

- `docs/auditoria-clinica-2026-10-21.md`: diagnóstico inicial.
- `docs/melhorias-clinicas-2026-10-21.md`: relato histórico da primeira etapa; algumas descrições foram superadas pelas alterações seguintes.
- `docs/base-cientifica-exames-2026-10-21.md`: fontes, limitações e implementações posteriores; complementar com fontes brasileiras recentes de E0.
- Capturas em `docs/*.png`: conferência visual histórica, não fixtures de pacientes ou prova de validação clínica.

Para estado atual, prevalecem código inspecionado, este checkpoint atualizado e decisões verificadas da matriz; não reproduzir automaticamente comentários antigos ou relatórios históricos.

## 9. Como trocar de agente sem perder o trabalho

1. Manter/salvar o projeto inteiro, incluindo arquivos não rastreados. Um clone ou checkout apenas do último commit NÃO basta.
2. Se houver uma etapa em andamento, preencher o registro de execução do plano e atualizar as seções 1, 4 e 7 deste arquivo com a próxima ação exata.
3. Se for fazer um commit de checkpoint, revisar o diff, arquivos novos e exclusões; não incluir segredos, prontuários ou dados temporários. Não fazer commit automático só para satisfazer esta instrução.
4. Abrir a mesma pasta no Claude Code. Enviar o texto abaixo. Se for outro computador, transferir as alterações locais e arquivos novos por meio apropriado, sem dados sensíveis.
5. O novo agente deve verificar o estado real antes de continuar, preservar alterações existentes e comunicar divergências relevantes.

### Texto para entregar ao Claude

```text
Continue o projeto AudioDash em E:\AUDIODASH.
Leia CLAUDE.md, docs/CONTINUIDADE.md e docs/PLANO-IMPLEMENTACAO-CLINICA.md antes de editar.
Há alterações locais extensas ainda sem commit: preserve-as e inspecione git status/diffs.
Confira o checkpoint e execute a próxima etapa pendente do plano; se nenhuma etapa foi iniciada, comece por E0, construindo a matriz de regras clínicas com fontes originais e escopo aplicável.
O sistema atenderá profissionais em clínica de adultos e crianças. Não invente medidas, curvas, normalidade ou diagnóstico. Não reative Metz/PAIR com condições simplificadas. Não aplique tabelas adultas indiscriminadamente à pediatria. Não restaure curvas simuladas.
Valide a implementação com testes adequados e casos de fronteira; não utilize prontuários reais como fixtures. Registre fontes, decisões, arquivos alterados, verificações e pendências no plano e no checkpoint ao terminar cada etapa.
Não declare validação clínica, assinatura eletrônica válida ou conformidade normativa apenas porque testes passaram.
```

## 10. Checkpoint da próxima sessão

Etapa em andamento: E0 (matriz criada; validação clínica pendente) e itens parciais de E1–E7 descritos no plano (revisão 2).

Verificação pendente na máquina do usuário: `npm test`, `npm run build`, `git diff --check`, lint dos arquivos alterados e conferência visual. O ambiente do Claude não acessava o registro npm; 40/42 testes passaram ali (os 2 restantes exigem @react-pdf/renderer e lucide-react).

Etapa em andamento anterior à revisão 2: nenhuma.

Próxima ação concreta: obter o estado atual do repositório e elaborar a matriz de regras de E0 usando o contrato mínimo da revisão 1 do plano; verificar acesso ao guia brasileiro recente, à seção OMS e às decisões de tipo/grau/NR/mascaramento antes de programar as respectivas regras. Registrar a participação clínica ou sua pendência já nessa fase.

Decisões clínicas pendentes: ver E0–E7 do plano. Responsável clínico pela validação ainda não identificado nesta colaboração.

Alterações desta sessão de planejamento: somente `CLAUDE.md`, `docs/PLANO-IMPLEMENTACAO-CLINICA.md` e `docs/CONTINUIDADE.md`.

Na revisão científica 1, foram alterados somente esses mesmos documentos. Nenhum teste de software foi repetido apenas pela revisão textual; a execução de referência continua sendo a descrita na seção 7.

## Cabeçalho do laudo (23/10/2026)
- Por decisão do usuário: o laudo (PDF e Word) imprime razão social, CNPJ, endereço completo (rua, bairro, cidade/UF, CEP) e contato (`src/lib/letterhead.ts`). Site e Instagram ficam só no cadastro.
- Selo fixo "LAUDO / OFICIAL" removido do cabeçalho do PDF.
- Pendente de decisão: o título do Word "LAUDO AUDIOLÓGICO OFICIAL" é fixo e aparece também em rascunhos.

## PDF do laudo reorganizado (23/10/2026)
- `AudiometryPDF` (A4 retrato) reescrito: margens de 36 pt, timbre, título com situação (revisado/rascunho), cartão de identificação + protocolo, seções numeradas dinamicamente (só as realizadas), tabelas padronizadas (`DataTable`), parecer em destaque, assinatura, cabeçalho corrido (página 2+) e rodapé com paginação.
- Removidos textos sem base nos dados: fallback "Referencial" da finalidade, nome padrão da clínica, "Fonoaudiologia Clínica e Ocupacional" e "Laudo Audiológico Digital". Linhas de frequência sem dado fora das oitavas não são impressas; nota de NR e de média não calculável só aparecem quando aplicáveis.
- Verificação feita só por render com mock do @react-pdf (HTML aproximado) — o PDF real não foi gerado aqui. Conferir visualmente: quebras de página, tamanho do audiograma (240 pt), tabela tonal com "NR a 80 dB NA" em célula estreita.
- O PDF comparativo (paisagem) mantém o estilo antigo.

## Remoção de dados fictícios (23/10/2026)
- Página inicial: removidos o laudo/prontuário de exemplo (paciente, médico, CRFa, audiograma e IPRF inventados) e a aba "Evolução 2024 vs 2026". Removidos "3 min/exame", "30 a 45 minutos por laudo", "carimbo do CFFa" e a nota 4,9 (128 avaliações) do `index.html`, além da imagem de stock do Open Graph.
- Exame novo: transdutor e referência de grau não vêm mais pré-selecionados; finalidade começa "Não informado". O transdutor passa a ser exigido para marcar o exame como revisado. Sem transdutor, o alerta de mascaramento (BSA) usa a atenuação conservadora de 40 dB (supra-aural), sem gravar isso no exame. `categoria` continua "clínico" por padrão.
- Textos padrão removidos dos exports e telas: "Referencial/Sequencial", nomes genéricos de clínica, "Dra. Fonoaudióloga"/"Clínica Auditiva" (barra lateral), tipo/horário padrão da agenda. Título do Word: "AVALIAÇÃO AUDIOLÓGICA" (sem "OFICIAL").
- Notificações: o status de sincronização vem do estado real (offline, erro, nuvem não configurada, pendências em todas as tabelas); não diz mais "100% sincronizado".
- NÃO alterado, por pedido do usuário (tratar no final): pagamentos, preços (R$ 50,00 repetido), link de checkout de teste, bypass do paywall (localhost e e-mail fixo), "Conforme Normas CFFa"/"100% criptografado" na seção de preços.
- Arquivos sem uso apagados (23/10/2026), após confirmar que nada os importava: `src/components/ReportPDF.tsx` ("Not implemented"), `src/lib/exportUtils.ts` (exportador antigo) e `src/services/storageService.ts` (upload para o bucket `audiometry-reports`, sem chamadas). Pacotes `xlsx` e `xlsx-populate` removidos do `package.json` (exportações usam `exceljs` e `docx`); `npm install` retirou as dependências transitivas deles do `package-lock.json`. Upload de laudos para a nuvem exigirá um novo serviço de storage. Os scripts soltos na raiz (`gen_template.py`, `test_docx.py`, `translate_routes.cjs`) não são referenciados, mas foram mantidos.
- Título do PDF comparativo: "(NR-7, Anexo II)" só aparece quando um dos exames é ocupacional. Categoria do exame segue "clínico" por padrão (decisão: vazio quebraria filtros e a lógica NR-7).

## Área de exames — revisão e correções (23/10/2026, Claude)
- Revisão do código da aba Exames, do formulário e das 7 abas: as regras de grau (Quadros 3–7 e 14–15 do Guia CFFa 2023), OMS global, tipo (Silman e Silverman), NR, NR-7, BSA, Metz e Jerger conferem com `MATRIZ-REGRAS-CLINICAS.md`. Nenhuma regra clínica foi alterada; `CLINICAL_RULES_VERSION` continua `2026-10-21.4`.
- Novo `src/lib/examForm.ts` (funções puras testadas) e 8 correções:
  1. Entrada por toque (telas < lg) com a ferramenta "Campo Livre" gravava na VO da OE; agora grava no campo livre. Campo livre com NR ganhou o campo de nível apresentado.
  2. "Gerar resumo dos dados" apagava síntese e situação clínica e substituía tipo/grau/configuração digitados; agora só preenche classificações vazias (`mergeSuggestedOpinion`) e a confirmação diz o que será substituído.
  3. Meatoscopia saía como código interno ("cerumen", "foreign_body"…) no PDF, Word e resumo; agora em português, com achado + descrição (`meatoscopyText`). O Excel continua com os códigos na planilha "Procedimentos" (dump de dados, usado no round-trip).
  4. Encaminhamento ao otorrino (marcado na meatoscopia) agora sai no PDF, no Word e no resumo.
  5. Aba Exames: exames de pacientes arquivados e os próprios arquivados ficam fora da lista e do seletor, com aviso de quantos foram ocultados (DOC-02).
  6. Reflexos: o PDF informa a convenção das colunas (orelha estimulada/sonda); o rodapé da tabela deixou de dizer "Sonda no Direito/Esquerdo" (contradizia a opção "orelha estimulada") e virou "Observações OD/OE". O Word continua sem a seção de reflexos.
  7. Exame: aviso ao voltar para Exames com alterações não salvas (diálogo) e ao fechar/recarregar a aba. Limite: navegação pelo menu lateral não é bloqueada (`BrowserRouter`, sem `useBlocker`).
  8. Menores: busca aceita data DD/MM/AAAA e CPF sem pontuação; "Gerar PDF" avisa quando o paciente não existe; botão "Word" no exame; o texto do Weber só é regenerado se estiver vazio ou igual ao resumo automático.
- Verificação: `npm test` 63/63 (5 testes novos "exames: …"); `npx tsc --noEmit` sem erros; `npm run build` ok; `oxlint` sem erros (avisos antigos: Fast Refresh em `exportPdf.tsx` e pastas de skills); `git diff --check` ok. Conferido no Chrome do usuário (localhost:3000, sem salvar exames): itens 1, 2, 3, 4 (resumo), 7 e botão Word. Não conferidos visualmente: PDF/Word gerados, lista com paciente arquivado (não há arquivados na base) e layout da entrada por toque em tela pequena.
- Achado fora da área de exames, não alterado: a página inicial ainda mostra "Evolução 2024 vs 2026 / Curva Estável" e a FAQ afirma que os laudos "cumprem os padrões do CFFa" (pendente junto com textos comerciais).
