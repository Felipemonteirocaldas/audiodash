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
