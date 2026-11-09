# Plano de correções — auditoria de código de 08/11/2026

Origem: auditoria de qualidade do repositório (skill `ponytail-audit`, 08/11/2026). Este plano trata de **software**
(sincronização, login, pagamento, dependências). Não altera regras clínicas; se uma etapa tocar regra clínica,
seguir `docs/MATRIZ-REGRAS-CLINICAS.md` antes.

Estado na auditoria: `npm test` 64/64 passando. `npm run build` e lint não executados. O `git` recusou comandos
por "dubious ownership" (dono do diretório diferente do usuário atual); resolver isso é decisão do usuário
(`git config --global --add safe.directory ...`) e deve vir antes de qualquer etapa, para conferir `git status` e diffs.

Regras para todas as etapas:

- Uma etapa por vez, com teste que falha antes da correção e passa depois.
- Testes com fixtures sintéticas e `db` falso; nunca em prontuário real nem no Supabase de produção.
- Ao terminar cada etapa: `npm test`, `npm run build`, `git diff --check`, lint nos arquivos alterados; registrar aqui e em `docs/CONTINUIDADE.md`.
- Mudanças no banco vão em nova migração em `supabase/migrations/` e precisam ser rodadas pelo usuário no painel.

---

## Fase 1 — Correção dos problemas encontrados

Ordem por risco: perda de dados primeiro, depois dinheiro, depois estabilidade.

### C1. Logout não pode apagar dados não enviados (achado 1) — PRIORIDADE MÁXIMA

- Arquivo: `src/contexts/AuthContext.tsx` (`handleSaveAndLogout`, `logout`).
- Problema: `syncManager.sync()` não lança erro; o logout limpa o IndexedDB mesmo com registros `pending`
  (assinatura vencida, rede caindo).
- Correção:
  1. Depois do `sync()`, contar `pending` nas 5 tabelas + fila de exclusões.
  2. Se houver pendência: não limpar; manter o modal aberto com a contagem e o botão "Baixar cópia (backup)"
     (`downloadFullBackup` de `src/lib/backup.ts`).
  3. "Apenas sair (ignorar pendências)" passa a mostrar a contagem do que será perdido antes de confirmar.
- Teste: com `db` falso contendo 1 exame `pending` e `sync` que falha, `handleSaveAndLogout` não chama `clear()`.
- Pronto quando: nenhum caminho de logout limpa registros `pending` sem o usuário ver a contagem.

### C2. Link de pagamento de teste não pode ir para produção (achado 2)

- Arquivos: `src/pages/Paywall.tsx:9`, `src/lib/settingsStatus.ts:8`.
- Correção: usar `TEST_CHECKOUT_URL` só quando `import.meta.env.DEV`; em produção sem
  `VITE_DODO_CHECKOUT_URL`, desabilitar o botão e mostrar "Pagamento indisponível — contate o suporte".
- Teste: função pura `resolveCheckoutUrl(envUrl, isDev)` → `null` em produção sem variável.
- Conferir na Vercel que `VITE_DODO_CHECKOUT_URL` e `VITE_DODO_CUSTOMER_PORTAL_URL` estão definidas (tarefa do usuário).

### C3. Edição feita durante o envio não pode ser marcada como enviada (achado 3)

- Arquivo: `src/lib/syncManager.ts:224-238`.
- Pré-requisito: todo lugar que grava `syncStatus: 'pending'` precisa também gravar `updatedAt: Date.now()`.
  Na auditoria, conferir: `Agenda.tsx:616`, `AnamnesisForm.tsx:53`, `NewExam.tsx:142`, `Patients.tsx:140/148`,
  `backup.ts:138` (restauração mantém o `updatedAt` do arquivo — aceitável, pois tudo entra `pending`).
- Correção: marcar `synced` só se o `updatedAt` atual for igual ao enviado
  (`where('id').equals(id).and(x => x.updatedAt === sent.updatedAt).modify({ syncStatus: 'synced' })`).
- Teste: registro editado entre a leitura e o fim do `upsert` continua `pending`.

### C4. Ouvinte de login: travamento, duplicação e limpeza (achado 4)

- Arquivo: `src/contexts/AuthContext.tsx:29-116`.
- Correção:
  1. Uma função `loadProfile(session)` no lugar das duas cópias (linhas 38-56 e 63-83).
  2. Dentro de `onAuthStateChange`, chamar `setTimeout(() => loadProfile(session), 0)` (não `await` no callback — recomendação do Supabase para evitar travamento).
  3. Guardar a `subscription` fora da função `async` e cancelar no `return` do `useEffect`.
- Teste manual: em `npm run dev` (StrictMode), um login dispara um único `pullFromSupabase` (ver console).

### C5. Fila de exclusões: limpeza no logout e dono do item (achado 5)

- Arquivos: `src/lib/syncManager.ts:57-95`, `src/contexts/AuthContext.tsx:224-246`.
- Correção: remover `audiodash_pending_deletions` no logout **somente depois de C1** (o logout só limpa quando
  não há pendência); gravar `user_id` em cada item e ignorar itens de outro usuário em `syncDeletions`.
- Teste: item com `user_id` diferente não é enviado.

### C6. Dependência `uuid` implícita (achado 6)

- Arquivos: `src/contexts/AuthContext.tsx:4,203`, `package.json`.
- Correção: `crypto.randomUUID()`; remover `@types/uuid` de `devDependencies`.
- Atenção: não regenerar `package-lock.json` inteiro (já estava modificado antes); usar `npm uninstall @types/uuid` e conferir o diff do lock.

### C7. Webhook: eventos fora de ordem (achado 7)

- Arquivos: `supabase/functions/dodo-webhook/index.ts`, nova migração.
- Correção: coluna `users.last_webhook_at timestamptz`; o update só aplica se
  `last_webhook_at is null or last_webhook_at < <webhook-timestamp>` e grava o novo valor.
- Teste: extrair a escolha de `updateData` para função pura e testar a ordem (cancelled antigo depois de renewed novo é ignorado).
- Deploy da função e migração: tarefa do usuário, com confirmação.

### C8. Testes dos fluxos que guardam dados (achado 8)

Junto com C1, C3, C5 e C7 (cada um traz o seu). Acrescentar ainda:

- `parseBackup`: recusa id repetido, lista ausente e JSON inválido.
- `restoreBackup`: tudo entra `pending`.
- `verifyLocalPassword`: aceita a senha certa, recusa a errada, migra texto antigo.

### C9. Remover arquivos sem uso (achado 9)

- `gen_template.py`, `test_docx.py`, `translate_routes.cjs`, `public/template.xlsx`.
- Antes de apagar: grep de novo em todo o repositório (incluindo `docs/` e `vite.config.ts`) e confirmar com o usuário.

### C10. Itens menores (agrupados, baixo risco)

- `deleteRecord` devolve `true` mesmo quando a nuvem falha: devolver `'cloud' | 'queued'` e a tela de exclusão avisar "excluído no aparelho, envio pendente".
- `console.log` de rotina em `syncManager.ts` e `supabase.ts` (inclui a URL do projeto): manter só `warn`/`error`.
- `file-saver` (2 usos em `exportExcel.ts`/`exportWord.ts`): opcional trocar pelo padrão `<a download>` de `backup.ts`.

### Verificação pendente fora do código (usuário, no painel do Supabase)

- **Política da tabela `public.users`.** As migrações não mostram essa política. Se o próprio usuário puder fazer
  `update` em `subscription_status`, `subscription_end_date` ou `is_admin`, ele libera acesso pago para si.
  Conferir em Authentication → Policies. Se houver `update` liberado, criar migração que permita ao usuário só ler
  a própria linha; quem grava é o webhook (service role).

---

## Fase 2 — Auditoria das partes não lidas

Na auditoria de 08/11/2026 estas partes não foram lidas a fundo. Cada item é uma auditoria própria
(ler, reportar, só depois corrigir). Ordem por custo de erro.

| # | Área | Arquivos | O que procurar |
|---|------|----------|----------------|
| A1 | Registro de exame | `src/pages/NewExam.tsx`, `src/lib/examForm.ts`, `src/components/exams/*` | perda de digitação ao trocar aba/salvar; NR virando número; campo livre com lateralidade; `updatedAt` em toda gravação (C3) |
| A2 | Exportações | `src/lib/exportPdf.tsx`, `exportWord.ts`, `exportExcel.ts`, `src/components/ExportPdfModal.tsx` | mesmo resultado nas três saídas; rascunho com selo "LAUDO OFICIAL" (já anotado em CONTINUIDADE); cabeçalho; curva ilustrativa só no timpanograma com aviso |
| A3 | Agenda e calendários | `src/pages/Agenda.tsx`, `calendarIntegration.ts`, `calendarSyncService.ts`, `googleCalendar.ts`, `microsoftCalendar.ts`, `CalendarSync.tsx` | fuso horário e horário de verão; eventos duplicados; dados de paciente enviados ao Google/Microsoft (nome no título do evento = dado de saúde em serviço externo); tokens expirados |
| A4 | Pacientes | `src/pages/Patients.tsx` | exclusão em cascata sem transação (exames apagados e paciente não); arquivamento vs. exclusão (Res. CFFa 777); busca por CPF |
| A5 | Configurações e conta | `src/pages/Settings.tsx` | já auditada em 23/10; conferir só o que C1/C5 mudarem no logout e na exclusão |
| A6 | Comparação e evolução | `CompareExams.tsx`, `EvolutionControl.tsx`, `Exams.tsx` | comparação entre exames com referências diferentes; ordenação por data local |
| A7 | Páginas públicas e PWA | `LandingPage`, `components/landing/*`, `Paywall.tsx`, `vite.config.ts` (PWA) | cache do service worker servindo versão antiga após deploy; textos promocionais ou resultados presumidos (preferência do usuário) |
| A8 | Build e lint | — | `npm run build` e `npm run lint`: separar avisos existentes de erros novos |

Saída de cada auditoria: achados numerados, no mesmo formato da auditoria de 08/11, acrescentados como "Fase 2 — resultados" neste arquivo.

---

## Fase 2 — resultados (08/11/2026)

Três auditorias somente leitura (agentes especialistas), achados conferidos no código antes de corrigir.

**Segurança/LGPD (A3, A4):** logout não desconectava Google/Outlook (próxima conta no mesmo navegador enviava
agendamentos ao calendário da anterior); nome do paciente e observações iam para Google/Outlook e para URLs;
exclusão deixava eventos órfãos (vínculo apagado mesmo com falha; exclusão de paciente não tocava calendário);
exclusão sob RLS recusada voltava "com sucesso"; cascata de exclusão do paciente não atômica; regra dos 20 anos só na
tela; lembrete de WhatsApp podia ir para homônimo; mapeamento de eventos só por aparelho (duplicados); cancelado
continua ativo no calendário externo; escopo OAuth amplo.
**Achado extra ao corrigir:** `appointments` não tem índice em `patientId` (db.ts v10); `where('patientId')` lançava
erro na exclusão do paciente DEPOIS de apagar exames e anamneses.

**Clínico (A1, A2, A6):** comparação aplicava NR-7 a qualquer par (criança, exame clínico, transdutores diferentes);
PDF comparativo com cara de laudo final em rascunho; PDF comparativo apagava NR; Word omitia reflexos, campo livre,
mascaramento, complementares, protocolo e IPRF dissílabos/trissílabos; Excel mostrava situação clínica de rascunho;
timpanometria "Inconclusivo" registrada saía como ausente; exportar em Novo Exame usava estado não salvo; Excel
exportava `dif`/`peak`/`limiar` velhos; evolução escondia exames além de 10; nível de NR herdado do valor digitado
(decisão clínica, não corrigido); textos "oficial"/"laudo" em rascunho; empate de data na comparação.
Pré-requisito da C3 conferido: as telas gravam `updatedAt` com `syncStatus: 'pending'`.

**Frontend/PWA/build (A5, A7, A8):** build ok (chunk único de 4,9 MB), lint 0 erros (747 avisos, 732 de pastas de
agentes), 64/64 testes. Assinante sem internet caía em /planos; sessão expirada + outra conta enviava pendências da
anterior; textos promocionais/promessas; app inteiro baixado na landing; service worker sem aviso de versão nova;
manifest com ícones inexistentes e `lang: en`; busca global pesada; /planos sem login quebrado; rewrite da Vercel
devolvendo HTML para JS; fonte proprietária de terceiro; polyfills de Node e `process` falso; lint poluído.

## Execução (08/11/2026, autorizada pelo usuário)

Feito nesta sessão (Claude):

| Item | O que mudou | Arquivos |
|------|-------------|----------|
| C1 | Logout só limpa sem pendências; mostra a contagem, oferece cópia; descarte pede confirmação. Modo local não apaga mais os dados ao sair (era a única cópia). | `AuthContext.tsx` |
| C3 | Marca `synced` só se `updatedAt` não mudou durante o envio, em transação. | `syncManager.ts` |
| C4 | Um único `onAuthStateChange` (sessão inicial incluída), trabalho fora do callback, `unsubscribe` no `useEffect`, perfil montado em `loadProfile`. | `AuthContext.tsx` |
| C5 | Fila de exclusões com `user_id`, itens de outra conta descartados, fila limpa no logout. | `syncManager.ts`, `AuthContext.tsx` |
| C6 | `crypto.randomUUID()`; `@types/uuid` removido (lock editado só nessas linhas). | `AuthContext.tsx`, `package.json`, `package-lock.json` |
| C2 | Link de teste só em desenvolvimento; em produção sem variável, botão desabilitado com aviso. `/planos` sem login vai para `/login`. | `settingsStatus.ts`, `Paywall.tsx` |
| C7 | Webhook aplica só eventos mais novos que `last_webhook_at`. | `dodo-webhook/index.ts`, migração `20261108120000` |
| users | RLS em `public.users`: só leitura da própria linha; sem insert/update/delete para o cliente. | migração `20261108120000` |
| S1 | Logout desconecta Google, Outlook (cache MSAL) e apaga o mapeamento; FAQ corrigido. | `calendarSyncService.ts`, `microsoftCalendar.ts`, `CalendarSync.tsx` |
| S2 | Google/Outlook/URLs recebem só tipo + iniciais; sem observações. FAQ diz o que é enviado. | `calendarIntegration.ts`, `googleCalendar.ts`, `microsoftCalendar.ts` |
| S3 | Vínculo do evento só é apagado sem falha; exclusão de paciente remove eventos; falha aparece na tela. | `calendarSyncService.ts`, `Patients.tsx`, `Agenda.tsx` |
| S5 | Exclusão confirma linhas apagadas; recusa silenciosa do RLS fica na fila. | `syncManager.ts` |
| S6 | Exclusão do paciente: tudo no aparelho em uma transação, depois a nuvem; corrige o índice inexistente. | `Patients.tsx`, `syncManager.ts` |
| S8 | WhatsApp: com `patientId`, só pelo id; pelo nome só se houver um único. | `Agenda.tsx` |
| F1 | Perfil de assinatura guardado por usuário; sem internet usa o último lido com sucesso. | `AuthContext.tsx`, `settingsStatus.ts` |
| F2 | Dono dos dados do aparelho (`audiodash_data_owner`); pendências de outra conta bloqueiam envio/pull e a tela até decidir (sair, baixar cópia, descartar). | `syncManager.ts`, `AuthContext.tsx` |
| F3 | Textos sem promessa nem número sem fonte (meta tags, preços, FAQ, comparação). | `index.html`, `landing/*`, `LandingPage.tsx` |
| F5 | Service worker em modo `prompt` com aviso "nova versão — recarregar" e checagem horária. | `vite.config.ts`, `UpdatePrompt.tsx`, `App.tsx`, `tsconfig.app.json` |
| F6 | Manifest `pt-BR`, descrição em português, só ícones existentes. | `vite.config.ts` |
| F9 | Rewrite não captura `/assets/`. | `vercel.json` |
| F10 | Fonte SF Pro de terceiro removida (pilha de fontes do sistema). | `index.html` |
| F12 | Lint ignora pastas de agentes e `dist`. | `.oxlintrc.json` |

Testes novos: `tests/sync-regressions.cjs` (9; os 6 de sincronização falham com o `syncManager` anterior). `npm test` agora roda os três arquivos de teste.

Correções clínicas (A1/A2/A6), executadas por agente separado e conferidas:

| Item | O que mudou | Arquivos |
|------|-------------|----------|
| 1 | Bloco NR-7 só com os dois exames ocupacionais e paciente ≥ 18 anos em cada data; motivo exibido quando não se aplica; avisos de protocolo diferente/ausente. Contrato **OCU-NR7-03** na matriz (limite de 18 anos é decisão do software — validar). | `examComparison.ts` (novo), `CompareExams.tsx`, `exportPdf.tsx`, `MATRIZ-REGRAS-CLINICAS.md` |
| 2 | REVISADO/RASCUNHO por exame na tela e no PDF; sem "LAUDO" no título com rascunho. | `CompareExams.tsx`, `exportPdf.tsx` |
| 3 | PDF comparativo imprime "NR a X dB NA" (`formatTonalValue`). | `exportPdf.tsx` |
| 4 | Word com protocolo, campo livre, "(M)" de mascaramento, reflexos, complementares e IPRF das três listas; formatadores compartilhados com o PDF. | `exportWord.ts`, `exportFormat.ts` (novo) |
| 5 | Excel: situação clínica só com revisão vigente. | `exportExcel.ts` |
| 6 | "Inconclusivo (informado pelo profissional)" distinto de pendente. | `exportPdf.tsx`, `exportWord.ts` |
| 7 | Novo Exame bloqueia exportar com alterações não salvas. | `NewExam.tsx` |
| 8 | `dif` não é mais gravado nem exportado; "sem pico" apaga a pressão; `limiar` antigo sai como ipsi no Excel quando não há ipsi (ajuste do Claude, para o dado não sumir). | `StapedialReflexExam.tsx`, `TympanometryExam.tsx`, `exportExcel.ts` |
| 9 | Evolução avisa "10 mais recentes de N" e marca revisão e transdutor por coluna. | `EvolutionControl.tsx` |
| 11 | "Baixar PDF"; prefixo `Rascunho_` nos arquivos não revisados. | `ExportPdfModal.tsx`, `exportPdf.tsx`, `exportWord.ts` |
| 12 | Mesma data: base = registrado primeiro, com aviso. | `examComparison.ts`, `CompareExams.tsx` |

Testes: `tests/exports-regressions.cjs` (9). Sem teste automático: bloqueio de exportação no Novo Exame, limpar pico, não gravar `dif`, tela de evolução — conferir visualmente.
Observação de interface (não alterada): o cartão "Exame Atual" em `CompareExams.tsx` usa paleta índigo e ponto pulsante, anteriores a esta etapa.

### Pendente — decisão ou ação do usuário

- **Rodar no Supabase** `supabase/migrations/20261108120000_users_rls_and_webhook_order.sql` (conferir antes as políticas atuais de `users`) e **publicar** a função `dodo-webhook`. A função nova grava `last_webhook_at`: publicar só depois da migração.
- **Vercel:** conferir `VITE_DODO_CHECKOUT_URL` (sem ela o botão de assinar fica desabilitado em produção).
- **Apagar** `gen_template.py`, `test_docx.py`, `translate_routes.cjs`, `public/template.xlsx` (sem uso; a remoção foi bloqueada pela política de permissões desta sessão).
- **Ícones PNG 192/512** da marca em `public/` (o `favicon.svg` atual é o logo padrão do Vite).
- **Nível de NR** herdado do valor digitado antes (achado clínico 10): decidir a regra com a fonoaudióloga.
- **Regra dos 20 anos no banco** (S7): gatilho `BEFORE DELETE` ou RPC — decidir também a exceção "Excluir dados do consultório".

### Não feito (próximas etapas)

- F4 divisão do bundle (`React.lazy` + import sob demanda de PDF/Word/Excel) — depois das correções clínicas, que tocam os mesmos arquivos.
- F7 busca global (Map por id, consultar só com termo).
- F11 polyfills de Node / `process` falso — exige testar exportação Excel sem eles.
- S9 ids de eventos no próprio agendamento (duplicados entre aparelhos), S10 cancelado no calendário externo, S11 escopo OAuth `calendar.app.created` e `fetchGoogleEvents` sem uso.
- C10 `console.log` de rotina.
- Conferência visual no navegador das telas alteradas (logout, aviso de dados de outra conta, /planos).

## Registro

- 08/11/2026 — Plano criado. Nenhuma correção feita.
- 08/11/2026 — Fase 2 auditada; correções de sincronização, login, pagamento, calendários e PWA executadas (tabela acima). Correções clínicas das exportações/comparação incorporadas. Verificação final: `npm test` 82/82 (64 clínicos + 9 sincronização + 9 exportações), `tsc -b` e `npm run build` ok, `oxlint` 0 erros (avisos só `only-export-components` e uma variável descartada já existentes), `git diff --check` sem erros. Conferência no navegador apenas sem login (/planos → /login, sem erros no console). Nada commitado. Nenhuma validação clínica declarada.
