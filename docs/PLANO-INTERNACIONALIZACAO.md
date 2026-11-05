# Plano — dashboard e internacionalização (04/11/2026)

Análise feita sobre o código (`src/pages/Dashboard.tsx`, `Sidebar`, `Header`, `clinicalOverview.ts`, `audiologyCalculations.ts`, `db.ts`) e conferida no painel logado (Chrome, 1568 px, conta com 2 pacientes e 0 exames). Nada foi implementado ainda. A visão de celular não foi conferida.

Visto na tela (itens 1–3 e o título da aba foram resolvidos em 04/11; ver CONTINUIDADE):
- Conta nova com pacientes, mas sem exames: o painel mostra 4 zeros e 4 caixas vazias, sem orientar o próximo passo. "Primeiros passos" só aparece com zero pacientes.
- A data aparece duas vezes (Header e acima do título), e "Novo Exame" também (botão do Header e item do menu).
- A faixa de filtros ocupa uma linha inteira e precisa de uma frase explicando as etiquetas "Filtros".
- Os quatro cartões têm o mesmo peso visual, e as notas ficam em texto cinza de 11–12 px.
- A aba do navegador mostra o título comercial ("Plataforma Completa de Audiometria & Fonoaudiologia") também dentro do app. O ideal é "Início · AudioDash", por página.

## 1. Dashboard — melhorias por prioridade

1. **Ação direta na agenda.** Os itens da agenda de hoje levam para `/agenda`. O próximo paciente deveria ter "Iniciar exame" (`/exame/novo/:patientId`) e "Abrir prontuário".
2. **Escopo pela estrutura, não por etiquetas.** Hoje cada cartão leva uma etiqueta ("Hoje", "Filtros", "Cadastro"). Proposta: um bloco "Hoje" (agenda, a atender) e um bloco "Período" com os filtros no próprio cabeçalho. Assim, os filtros ficam ao lado do que filtram.
3. **Remover duplicações.** A data aparece no Header e no título da página. O status de sincronização aparece no Header e na Sidebar.
4. **Design tokens.** As cores estão fixas no código (`#0071e3`, `bg-[#f8fafc]`, `slate-*` espalhados). Centralizar em variáveis CSS é requisito para modo escuro, consistência e uma futura marca da clínica.
5. **Sidebar mais compacta.** A largura é de 288 px, com cartão de perfil, a frase "Fonoaudiologia & Saúde" e o rótulo "Menu Principal". Perfil e saída podem ir para um menu da conta, e a barra pode ser recolhível.
6. **Onboarding mensurável.** "Primeiros passos" só aparece sem pacientes. Proposta: uma lista de verificação com cadastro da clínica/timbre, primeiro paciente, primeiro exame e primeiro laudo, que some ao concluir.
7. **Requisitos de venda B2B (Europa e clínicas maiores):** equipe com vários profissionais e papéis, registro de auditoria (quem criou, editou ou revisou), 2FA, portal de assinatura/faturas e página de status.
8. **Bloqueadores já anotados:** bypass do paywall por hostname/e-mail fixo, preço fixo "R$ 50,00", checkout de teste e textos comerciais ("Conforme Normas CFFa").
9. **Escala.** Com "Todo o histórico", o painel carrega todos os pacientes e exames na memória. Isso funciona em consultório, mas fica lento com milhares de exames (índices/contagens no Dexie).

## 2. Internacionalização — o que o código exige

- **Textos:** não há camada de tradução. Há mais de 1.000 trechos com acento em `pages`, `components` e `lib`, e o total real é maior. Recomendação: `i18next` + `react-i18next`, com um arquivo por idioma e por área (shell, dashboard, exames, laudos). Justificativa da dependência: plurais, interpolação e carregamento por idioma em milhares de textos.
- **Datas e números:** `formatDateBr`, `formatLongDatePt`, `toLocaleDateString('pt-BR')` e `date-fns/locale/ptBR` (Agenda). Tudo deve passar a usar a localidade ativa. Para a Europa, usar o inglês `en-GB` (DD/MM/AAAA), e não `en-US`.
- **Resultados clínicos gravados como texto em português:** `classifyLossType` devolve `'Condutiva'`/`'Neurossensorial'`, e `lossTypeRight/Left` são `string`. Para traduzir sem quebrar regras e exames antigos, gravar **códigos** (`conductive`, `sensorineural`, …) e traduzir só na exibição, com migração dos registros existentes e testes. Esta é a etapa de maior risco.
- **Idioma do laudo ≠ idioma da interface.** O laudo (PDF/Word) precisa de idioma próprio, definido por clínica ou por exame. Um exame salvo não deve mudar de idioma sozinho.
- **Terminologia (revisão por audiologista de língua inglesa):** OD/OE → RE/LE, VA/VO → AC/BC, dB NA → dB HL, Logoaudiometria → speech audiometry, LRF → SRT, IPRF → WRS, Meatoscopia → otoscopy, Imitanciometria → immittance.
- **Material de fala é específico de cada língua.** As listas em português não valem para inglês. O exame deve registrar qual material foi usado, sem presumir.
- **Itens só do Brasil:** CPF, CRFa, NR-7, Guia CFFa 2023, LGPD. Proposta: um "perfil de país" (BR / EU) que define o documento de identificação, o registro profissional, a visibilidade da NR-7 e as referências clínicas disponíveis (OMS 2021 e BIAP já existem em `degreeStandard`). Cada regra nova entra antes na `MATRIZ-REGRAS-CLINICAS.md`.
- **Rotas:** as rotas internas (`/painel`, `/pacientes`) podem continuar como estão. Só a landing precisa de `/en` com `hreflang` para SEO.

## 3. Europa — requisitos fora do código (avaliação especializada)

- **Regulação de dispositivo médico.** Na UE, software que fornece informação usada em decisão diagnóstica pode ser dispositivo médico pelo MDR 2017/745, Regra 11 (classe IIa ou superior), com marcação CE por organismo notificado, ISO 13485, IEC 62304 e ISO 14971. A guia de qualificação é o MDCG 2019-11. A classificação automática de grau e tipo e os alertas pesam nessa avaliação. No Brasil, o equivalente é a ANVISA RDC 657/2022 (SaMD). Isso define o cronograma europeu mais do que a tradução.
- **GDPR:** termos e privacidade reescritos (não só traduzidos), DPA para clínicas, lista de suboperadores, hospedagem de dados na UE (região do Supabase) e representante na UE (art. 27), se não houver sede lá.
- **Cobrança:** preço em EUR e IVA. A Dodo Payments atua como merchant of record, o que simplifica o IVA, mas é preciso confirmar no contrato.
- **Mercado de entrada:** Portugal fala português europeu, que difere do pt-BR em termos e textos de laudo. Pode ser o primeiro mercado europeu, com o inglês logo depois.

## 4. Etapas propostas

| Etapa | Conteúdo | Verificação |
|---|---|---|
| I1 | Infra i18n + seletor de idioma + shell (Sidebar, Header, MobileNav), Dashboard e Login em pt-BR/en; datas pela localidade | build, testes, troca de idioma no navegador |
| I2 | Códigos para resultados clínicos + migração + testes de fronteira independentes | `npm test`, exames antigos abrem iguais |
| I3 | Telas de exame, pacientes e agenda em inglês | revisão terminológica |
| I4 | Laudos PDF/Word/Excel com idioma próprio | conferência visual dos arquivos |
| I5 | Perfil de país (BR/EU), campos de ID e registro, NR-7 só BR | testes por perfil |
| I6 | Landing `/en`, preços EUR, termos/privacidade GDPR | revisão jurídica |
| Paralelo | Avaliação regulatória MDR/ANVISA | parecer especializado |
