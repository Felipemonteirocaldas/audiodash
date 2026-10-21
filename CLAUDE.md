# AudioDash — continuidade do trabalho clínico

Leia primeiro `docs/CONTINUIDADE.md` e depois `docs/PLANO-IMPLEMENTACAO-CLINICA.md`.
Esses arquivos registram o contexto da colaboração e as etapas pendentes. As instruções atuais do usuário prevalecem sobre este documento.

O plano está na revisão científica 2. As regras implementadas estão em `docs/MATRIZ-REGRAS-CLINICAS.md`; antes de implementar ou alterar uma regra, preencher/atualizar seu contrato ali. Referência brasileira principal: Guia CFFa 2023 (não o manual de 2013). Distinguir a classificação global pela melhor orelha da análise por orelha, manter campo livre sem lateralidade e documentar a razão/contexto de NR. A validação clínica acompanha a especificação e cada etapa; não começa apenas em E8. Resultados esperados de testes devem ser independentes da função implementada.

## Escopo e preferências do usuário

- Sistema profissional de audiologia para adultos e crianças, em português brasileiro.
- Usar medidas reais registradas e regras clínicas com fonte, versão e população aplicável.
- Interface objetiva, sem brilhos, decoração genérica, textos promocionais ou resultados presumidos.
- Curvas: o audiograma mostra só dados medidos. Timpanograma: por decisão do usuário (21/10/2026, a pedido da fonoaudióloga consultada), é desenhada uma curva ILUSTRATIVA que passa pelo pico registrado, sempre com aviso de que não é o traçado medido (`illustrativeTympanogram`). Não criar outras curvas simuladas (reflexograma, PEATE, EOA, função desempenho–intensidade).
- O gráfico de IPRF acrescentado recentemente não era o gráfico que o usuário lembrava. Isso não autoriza adicionar outros gráficos por tentativa.
- Não tratar recomendações da análise do Gemini como especificação aprovada: a avaliação crítica está no plano.

## Estado do repositório

Há alterações locais extensas, ainda sem commit, que precisam ser preservadas. Leia `git status` e os diffs antes de editar. Não use reset/clean/checkout para descartar trabalho. `package-lock.json` já estava modificado antes das intervenções deste chat; não normalizar nem regenerar sem necessidade demonstrada.

## Trabalho por etapas

1. Identifique a próxima etapa incompleta no plano e confira o código atual.
2. Para regras clínicas, leia a seção da fonte original e registre os limites de aplicação antes de programar.
3. Faça uma etapa coerente, com testes de fronteira e conferência das exportações afetadas.
4. Atualize o plano e `docs/CONTINUIDADE.md` ao terminar ou antes de trocar de agente.
5. Diferencie implementação de software, validação clínica e requisitos normativos. Não declare certificação ou validação clínica apenas porque os testes passaram.

Não crie resultados em prontuários reais para testar. Use fixtures sintéticas e não salve os testes visuais em pacientes cadastrados. Não envie dados de pacientes a serviços externos.

Não substitua NR por limiar numérico no registro original; convenções de cálculo, quando previstas, devem ficar separadas e identificadas. Não transforme "não analisado" em resultado negativo. Não aplique uma tabela adulta indiscriminadamente a crianças.

O marcador interno de revisão usa serialização de dados; não constitui assinatura eletrônica avançada ou qualificada.

Comandos de verificação: `npm test`, `npm run build`, `git diff --check`. Use lint nos arquivos alterados; registre avisos existentes separadamente dos erros novos.

O pedido que criou estes documentos foi planejar a implementação e permitir continuidade por outro agente. A criação deste arquivo não é, por si só, autorização para iniciar todas as etapas: siga o pedido da sessão em que estiver atuando.
