# Matriz de regras clínicas (E0)

Versão das regras no código: `CLINICAL_RULES_VERSION = '2026-10-21.4'` (`src/lib/examIntegrity.ts`).
Elaborada em 21/10/2026 (revisão científica 2). Fontes conferidas nesta data; links em `src/lib/clinicalEvidence.ts`.

**Situação de validação de todas as regras abaixo: implementada e verificada por testes de software; validação clínica por fonoaudiólogo responsável PENDENTE.** Responsável clínico ainda não identificado. Testes verdes não demonstram validade diagnóstica.

Força das fontes: **N** = norma legal; **R** = recomendação/guia profissional; **C** = convenção descritiva adotada pelo software.

## Fontes de referência

| ID | Fonte | Força | Acesso |
| --- | --- | --- | --- |
| CFFA_GUIA_2023 | Sistema de Conselhos de Fonoaudiologia. Guia de Orientação na Avaliação Audiológica, vol. I, 2ª ed., jul/2023 | R | PDF integral público (fonoaudiologia.org.br, 2023/11). Substitui o manual de 2013 como referência brasileira |
| WHO_2021 | OMS. World Report on Hearing, 2021, tabela de graus | R | Conteúdo reproduzido no Quadro 7 do Guia CFFa 2023; PDF IRIS com bloqueio em consulta anterior |
| NR7_ANEXO2 | NR-7, Anexo II (Portaria SEPRT 6.734/2020) | N | PDF gov.br "atualizada 2022"; conferir publicações posteriores no DOU antes de cada versão |
| SBFA_IMIT_2025 | SBFa. Diretrizes em Imitanciometria, revisão out/2025 | R | PDF integral público |
| BSA_2018 | BSA. Pure-tone audiometry, 2018 (revisão prevista para 2023) | R (estrangeira) | PDF integral |
| ASHA_SRT_1988 | ASHA. Determining Threshold Level for Speech, 1988 | R (estrangeira, histórica) | Página integral |
| CFFA_777_2025 | Resolução CFFa 777/2025 (prontuário) | N (conselho) | Texto integral |

## Regras

### AUD-MED-01 · Médias de via aérea
- Finalidade: cálculo. Unidade: orelha.
- Entradas: VA numérica (dB NA, −10 a 120, passo 5). NR, vazio e inválido tornam a média indisponível; NR nunca é convertido em número.
- Decisão: tritonal = média(500, 1000, 2000); quadritonal = média(500, 1000, 2000, 4000); 3–6 kHz = média(3000, 4000, 6000).
- Arredondamento: apresentação a 0,1 dB. Com limiares em passos de 5 dB, as médias possíveis (x,0; x,33; x,67; x,25; x,5; x,75) não caem entre as fronteiras inteiras das tabelas, então o arredondamento não altera nenhuma classificação. Comparações da NR-7 usam o valor sem arredondamento.
- Elegibilidade (tela, resumo, exportações): `adultTablesEligibility` — idade ≥ 18, referência selecionada, resposta = limiar, confiabilidade boa, método convencional ou lúdico.

### AUD-GRAU-01/02/03 · Faixa de grau por orelha
- Fonte: CFFA_GUIA_2023, Quadros 3 (Lloyd e Kaplan), 7 (OMS 2021); OMS anterior a 2021 mantida para exames antigos (chave histórica `OMS_2014`).
- Unidade: orelha (faixa da média). Não é a classificação global da OMS.
- Decisão OMS 2021 (quadritonal): < 20 dentro do padrão; 20–<35 leve; 35–<50 moderado; 50–<65 moderadamente severo; 65–<80 severo; 80–<95 profundo; ≥ 95 completa.
- Decisão Lloyd e Kaplan (tritonal): ≤ 25 dentro do padrão; 26–40 leve; 41–55 moderado; 56–70 moderadamente severo; 71–90 severo; > 90 profundo.
- OMS anterior a 2021: ≤ 25; 26–40; 41–60; 61–80; ≥ 81. Origem a confirmar documentalmente (não consta do Guia CFFa 2023); não usar em exames novos sem justificativa.
- Saída: "Média dentro do padrão de normalidade (sem grau)" — o Guia diz que não existe "grau normal". Grau nunca é atribuído por frequência isolada.
- Insuficiência: "Grau não calculável: requer limiar numérico de VA em …".
- Demais tabelas do Guia (conferidas no PDF em 21/10/2026): Kaplan, Gladstone e Lloyd 1993 (Quadro 4: normal −10 a 15; discreto 16–25; leve 26–40; moderado 41–55; mod. severo 56–70; severo 71–90; profundo ≥ 91); Davis 1970 (Quadro 5: ≤ 25; 26–40; 41–55; marcado/acentuado 56–70; 71–90; > 90); BIAP 1996 (Quadro 6, média de 4 frequências: ≤ 20; 21–40; moderado I 41–55 / II 56–70; severo I 71–80 / II 81–90; muito severo I 91–100 / II 101–110 / III 111–120; cofose > 120).
- Crianças (< 18 anos): o Guia indica, na seção de audiologia infantil, Northern e Downs 2005 (Quadro 14, média 500/1k/2k: ≤ 15 normal; discreta 16–25; leve 26–30; moderada 31–50; severa 51–70; profunda ≥ 71) e OMS (Quadro 15, mesmas faixas da OMS 2021). Só essas duas geram sugestão para crianças; as demais retornam "selecione referência pediátrica". Northern e Downs não é aplicada a adultos. A sugestão de grau infantil exige limiares (método convencional ou lúdico, resposta = limiar, confiabilidade boa); VRA/observação continuam manuais. O tipo continua manual em crianças (os critérios de Silman e Silverman usam limites adultos).
- Fonoaudióloga consultada pelo usuário (21/10/2026, áudios): nenhuma referência é "mais certa"; o sistema deve permitir escolher a referência; para crianças, a referência é outra/OMS. Concordante com o Guia.

### AUD-GRAU-04 · Classificação global OMS 2021
- Unidade: pessoa. Decisão: grau pela média quadritonal da melhor orelha; "unilateral" quando melhor orelha < 20 e pior ≥ 35.
- Insuficiência: exige quadritonal nas duas orelhas.
- A frase de saída lembra que melhor orelha < 20 não exclui alteração na outra orelha nem em frequências isoladas.

### AUD-TIPO-01 · Tipo de perda (Silman e Silverman, 1997)
- Fonte: CFFA_GUIA_2023, Quadro 2 e item 7.1. Unidade: orelha; analisa frequências, não médias.
- Entradas: VA em 500, 1000, 2000 e 4000 Hz obrigatória; VO nas frequências alteradas entre 500 e 4000 Hz. 3000 Hz entra quando há VO registrada. 250, 6000 e 8000 Hz não determinam tipo.
- Decisão (VA > 25): condutiva = VO ≤ 15 e gap ≥ 15; neurossensorial = VO > 15 e gap ≤ 10; mista = VO > 15 e gap > 10. Todas as frequências alteradas devem concordar.
- Nota: com passos de 5 dB, "gap > 10" e "gap ≥ 15" são equivalentes; a implementação usa a redação do Guia.
- Bloqueios conservadores (decisão do software): NR em qualquer frequência; VO > VA + 10; gap > 10 sem VO mascarada; padrão heterogêneo → "Indeterminado (motivo)".
- Normalidade (≤ 25 dB NA em todos os pontos registrados) é limite adulto; só aplicada a adultos.

### AUD-CONF-01 · Configuração
- Fonte: CFFA_GUIA_2023, Quadro 8 (Silman e Silverman, 1997; Carhart, 1945). Critérios qualitativos por oitava, sem operacionalização numérica completa (por exemplo, como tratar oitavas mistas).
- Decisão do software: mostrar a variação de VA entre oitavas e deixar a classificação ao profissional. Implementar classificação automática somente após definição clínica escrita das regras de agregação.

### OCU-NR7-01 · Avaliação descritiva por orelha (NR-7, Anexo II)
- Força: N. Unidade: orelha. Escopo: exames ocupacionais.
- Entradas: VA numérica em 500, 1000, 2000, 3000, 4000, 6000 e 8000 Hz (item 3.6); VO 500–4000 Hz quando houver alteração (3.6.1).
- Decisão: 5.1 — todos ≤ 25 → aceitável. 5.2 — maior limiar entre 3, 4 e 6 kHz > 25 e maior que todos os limiares de 0,5, 1, 2 e 8 kHz, com o mesmo padrão na VO (3 e/ou 4 kHz alterados > 25 e maiores que 0,5–2 kHz) → sugestivo. VA com padrão e VO ausente → "padrão apenas na VA, completar VO". Demais → não sugestivo (5.2.1).
- Interpretação do software (validar clinicamente): "mais elevados do que nas outras frequências testadas" lido como o maior limiar de 3–6 kHz superior ao maior das demais; a exigência de VO segue a expressão "tanto no teste da via aérea quanto da via óssea".
- Saída sempre acompanhada de: diagnóstico conclusivo e aptidão cabem ao médico do trabalho (item 6).

### OCU-NR7-02 · Desencadeamento e agravamento
- Força: N. Unidade: orelha, exame de referência × sequencial.
- 5.3/5.3.1 (referência ≤ 25 em todas): média 3–6 kHz piora ≥ 10 dB OU piora ≥ 15 dB em 3, 4 ou 6 kHz.
- 5.4 (PAINPSE confirmada; o software verifica referência "sugestiva"): média 0,5–2 kHz ≥ 10 OU média 3–6 kHz ≥ 10 OU piora ≥ 15 em qualquer frequência isolada.
- Limites inclusivos ("iguala ou ultrapassa"). Diferenças calculadas sem arredondamento.
- Escolha da referência: a tela usa o exame mais antigo dos dois selecionados e avisa quando ele não está marcado como "referencial" (itens 4.3.1 e 5.5). Pendente: seleção explícita do exame de referência vigente e atualização automática após desencadeamento/agravamento (5.5.1).
- Requisitos de registro na revisão: VA em 500–8000 Hz e confirmação do repouso auditivo de 14 h (item 3.4).

### AUD-MASC-01 · Alertas de mascaramento (BSA 2018, §8.6)
- Força: R estrangeira, ativada apenas quando o profissional seleciona o protocolo.
- Regra 1: diferença VA/VA sem mascaramento ≥ 40 dB (supra-aural) ou ≥ 55 dB (inserção).
- Regra 2: VO sem mascaramento ≥ 10 dB melhor que a VA de qualquer orelha (corrigido em 21/10/2026: antes só alertava a orelha pior).
- Regra 3: quando a regra 1 não se aplica, VO de uma orelha ≥ 40/55 dB melhor que a VA da outra.
- Usa limiares sem mascaramento preservados (`unmaskedVa/Vo`), inclusive no lançamento pelo gráfico.
- Não calcula platô nem níveis de mascaramento.

### FALA-LRF-01 · LRF × média tritonal
- Fonte: ASHA 1988 espera concordância próxima sem limite numérico; Guia CFFa 2023 não define critério.
- Decisão do software: mostrar a diferença com sinal; sem veredito (o limite anterior de ±10 dB não tinha fonte verificada e foi removido).

### IMIT-TIMP-01 · Timpanometria
- Fonte: SBFA_IMIT_2025. Jerger (A, Ar/As, Ad, B, C) para sonda de 226 Hz em orelhas não operadas; 1000 Hz em recém-nascidos/lactentes (até 6 meses pela BSA; alguns autores até 9) com curva normal ou alterada.
- Decisão: classificação sempre informada pelo profissional, com unidade e referência normativa. Tipo de Jerger com 1000 Hz, ou normal/alterada com 226 Hz, bloqueia a revisão.
- Sem limites numéricos programados: os valores variam por equipamento (a própria SBFa remete aos manuais).

### IMIT-TIMP-02 · Timpanograma ilustrativo
- Força: C (convenção de apresentação; decisão do usuário em 21/10/2026, após pedido da fonoaudióloga consultada).
- Com pico identificável e sonda/unidade válidas: curva em sino padronizada (largura fixa de 60 daPa) que passa exatamente pelo pico registrado (pressão, admitância). Sem pico: linha plana na admitância registrada (ou zero).
- Tela e PDF trazem o aviso "curva ilustrativa — não é o traçado medido". A forma não é usada para classificar a curva; o tipo continua informado pelo profissional.
- Pendente: importação do traçado real do equipamento, quando houver formato de exportação disponível.

### IMIT-REF-01 · Reflexos e critério de Metz
- Fonte: SBFA_IMIT_2025 (p. ~29): recrutamento objetivo de Metz quando VA − reflexo contralateral ≤ 60 dB.
- Entradas: limiar do reflexo contralateral, VA da orelha estimulada e a convenção das colunas (`reflexes.earConvention`: orelha estimulada ou orelha da sonda). Sem convenção → não calculado e revisão bloqueada se houver contralateral registrado.
- Saída: "critério numérico atingido/não atingido" + aviso de interpretação contextual. Não é diagnóstico isolado; o booleano anterior `hasRecruitment` foi removido.
- Diferença ipsi − VA: descritiva.

### REV-NORM-01 · Normalidade bilateral na revisão
- Bloqueia se houver NR ou VA > 25 dB NA (limite adulto); com OMS 2021, se a média quadritonal de qualquer orelha for ≥ 20 dB.
- Exige limiares confiáveis e resultados por orelha (campo livre não determina lateralidade).

### DOC-01 · Documentos emitidos
- Fonte: CFFA_777_2025 arts. 5º, 6º e 8º; CFFA_GUIA_2023 (citar a classificação adotada).
- PDF/Word citam a classificação de grau por extenso e não declaram conformidade normativa; o carimbo informa que a validade depende de assinatura manuscrita ou eletrônica avançada/qualificada. `reviewedSignature` é marcador de integridade, não assinatura.

### DOC-02 · Guarda do prontuário (arquivamento × exclusão)
- Fonte: CFFA_777_2025, art. 7º (guarda pelo profissional), art. 8º, b (prontuário eletrônico de guarda permanente; eliminação possível após 20 anos do último registro), art. 11 (acesso do paciente). Força: N (conselho).
- Paciente: "último registro" = data mais recente entre exames, anamneses e cadastro (`src/lib/recordRetention.ts`). Antes de completar 20 anos, a única ação é arquivar (`patients.archivedAt`): oculto das listas, de novos exames e da agenda; exames e anamneses preservados e sincronizados; reversível. Após 20 anos, a exclusão definitiva é liberada com confirmação.
- Conta inteira: a exclusão (direito do titular/LGPD) exige, na mesma sessão, exportar a cópia completa e declarar que o profissional mantém a guarda.
- Banco: coluna `"archivedAt"` em `public.patients` (`supabase/migrations/20261021190000_patients_archived_at.sql`). Sem a coluna, o arquivamento não sincroniza.

## Decisões pendentes (precisam de responsável clínico)

1. (Parcial em 21/10/2026: Northern e Downs e OMS para crianças implementadas.) Definir com o responsável clínico os limites de normalidade por frequência em crianças e o tipo de perda pediátrico.
2. Operacionalização do Quadro 8 (configuração) e critério de entalhe.
3. Interpretação do item 5.2 da NR-7 (comparação com "outras frequências" e exigência de VO).
4. Seleção do exame de referência vigente e regra de substituição (5.5.1).
5. Manter ou retirar a graduação OMS anterior a 2021 para exames novos.
6. (Resolvida em 21/10/2026: arquivamento + regra dos 20 anos, DOC-02.) Revisar com assessoria jurídica a exclusão da conta inteira e o papel do AudioDash como operador.
7. Provedor de assinatura eletrônica avançada/qualificada.
