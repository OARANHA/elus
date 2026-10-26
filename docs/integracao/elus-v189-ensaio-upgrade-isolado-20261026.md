# ELUS v1.85 → v1.89 — protocolo do ensaio isolado (26/10/2026)

**Estado: PROPOSTO / NÃO EXECUTADO.** PR #43 `feat/elus-v189-migrations-20261025`. Este documento NÃO autoriza execução no Supabase real, nem merge, nem deploy. Complementa `elus-v189-plano-upgrade-ledger-e-catalogo-20261025.md` e `elus-v189-ledger-replay-risk-review-20261025.md`.

## Problema preciso

O Supabase ELUS (PostgreSQL 17.11) possui 11 registros no ledger: preparação, seis lotes da baseline v1.85 e quatro migrations ELUS. As 38 migrations upstream v1.89 têm 11 arquivos com timestamp anterior ou igual ao último registro e 27 posteriores. Timestamps e nomes das quatro migrations ELUS locais não correspondem aos seus registros reais. Uma lista cronológica não é plano de replay e `supabase db push` não pode ser considerado seguro.

`scripts/test-db.sh` já aplica `supabase/baseline.sql` em modo instalação e atualização sobre PostgreSQL efêmero (matriz pg15/pg17). Esse teste **não é** um ensaio de upgrade com ledger v1.85 existente. O teste `tests/invariants/elus-mfa-0765-rotacao-atomica.test.ts` comprova aspectos da RPC em banco efêmero, não a migração de uma instalação existente.

## Gates do ensaio — nenhum executado por este documento

1. **Ambiente:** banco PostgreSQL 15 e 17 descartável, sem conectividade/configuração de credenciais de produção; recriar o banco a cada tentativa. Não usar `db reset`, `db push`, `psql` ou DDL/DML contra o projeto Supabase real.
2. **Ponto de partida comprovado:** reconstruir baseline v1.85 exatamente do SHA fixado `83aeac8f78aa076f3adfaf3e773c8616229e5cd9`, aplicar em seis lotes segundo artefatos verificáveis da instalação; aplicar as quatro migrations ELUS equivalentes e reproduzir os onze registros históricos **somente no banco descartável**. Se os seis lotes originais não estiverem disponíveis/integralmente verificáveis, parar: banco v1.85 inventado não comprova upgrade.
3. **Inventário antes da mutação:** exportar catálogo normalizado (tabelas/colunas/constraints/índices/triggers/functions/assinaturas/views/RLS/policies/ACL), os onze registros e contagens agregadas de tabelas afetadas. Não copiar PII ou hashes reais; semear dados sintéticos de pelo menos dois tenants.
4. **Plano determinístico:** mapear os 38 arquivos por timestamp e hash, as colisões `0689→0762`, `0691→0763`, `0692→0764`, e as dependências `0716→0717→0753`, `0763→0706`, `0684→0760`, `0747→0757`. Revisar um a um os onze arquivos anteriores ao corte; não descartá-los automaticamente nem reexecutá-los por suposição. Registrar pré-condição, idempotência e efeito esperado de cada SQL.
5. **Gate destrutivo 0759:** semear sinteticamente `user_recovery_codes` com hashes legados e hashes SHA256 válidos; registrar contagens e provar impacto de `DELETE ... WHERE octet_length(code_hash) <> 32`. Exigir decisão explícita sobre perda de códigos legados; backup e restauração integral testada. `0755` deve preceder `0759`.
6. **Replay e falha induzida:** executar o plano apenas no clone e parar imediatamente ao primeiro erro SQL (ON_ERROR_STOP); registrar migration e motivo. Testar interrupção/recomeço em checkpoints **sem** registrar migrations como aplicadas quando seus efeitos não foram comprovados.
7. **Comparação pós-upgrade:** confrontar esquema efetivo com baseline v1.89 candidata e com invariantes, inclusive presença única da RPC `0765` e o bloco final de varredura de `anon`. Investigar diferenças esperadas de ACL/default privileges. Exigir isolamento multi-tenant, teste negativo `anon/authenticated` para RPC `0765`, permissões de `service_role` e ausência de bypass por funções `SECURITY DEFINER`.
8. **Critério de aceite:** PG15 e PG17 completos; dados sintéticos preservados ou explicitamente transformados; ledger consistente; rollback restaurado e conferido; lint, TypeScript e unitários pertinentes sem regressões. Evidência de instalação limpa do baseline NÃO substitui upgrade. Só depois propor, em operação separada, decisão sobre aplicação real.

## Bloqueios atuais verificáveis

- Não existe evidência de reconstrução dos seis lotes v1.85 no ambiente de ensaio.
- Replay real do ledger v1.85 → v1.89 não foi executado.
- `0759` contém DELETE deliberado; contagem previamente observada em produção não elimina risco futuro.
- No Supabase ativo a RPC `fn_elus_rotacionar_codigos_recuperacao(uuid,text[])` ainda está ausente.
- PR #44 depende do HEAD de PR #43 anterior à correção `0765`; reconciliar a pilha antes de integrar.

**Proibições:** sem E2E/Playwright automático, VendERP real, alteração de ledger/banco ativo, merge, publicação, deploy ou canário neste gate. Nunca registrar GREEN de upgrade por testes estáticos.


## Evidência adicional do ledger real — 26/10/2026 (somente leitura)

O catálogo `information_schema.columns` confirmou que `supabase_migrations.schema_migrations` possui as colunas `statements` e `rollback` como arrays de texto. Consulta agregada, sem retornar **nenhum SQL, dado pessoal ou segredo**, comprovou que cada um dos seis lotes aplicados possui **um statement preservado no ledger**. Portanto, o SQL historicamente aplicado está disponível **no banco original** para eventual exportação controlada, sem inferir os pontos de divisão do Git.

| Registro | Statements | Bytes SQL | Fingerprint MD5 agregada |
| --- | ---: | ---: | --- |
| preparação `20261018200431` | 1 | 174 | `72db224ba3b80c474d771d66cb593668` |
| parte 01 `20261018204508` | 1 | 508044 | `a1bfe00566688f95f316e4e37ffeb97c` |
| parte 02 `20261018204837` | 1 | 509703 | `f7e534e726ec192c1db7fe984cf5c2a3` |
| parte 03 `20261018204851` | 1 | 510397 | `df7399b2361471a32f6baebb5a51823b` |
| parte 04 `20261018204924` | 1 | 510108 | `f3a0b9ea9d0cce746c2d403f9a04dd7f` |
| parte 05 `20261018204939` | 1 | 509661 | `e6038fa04f2faa45f9416dc462beeb52` |
| parte 06 `20261018204955` | 1 | 484187 | `dab84f1d8332894d78cf737b28488450` |

Todos os sete registros acima têm `rollback_count=0`. Essas impressões digitais são **identificadores de comparação, não certificação criptográfica do conteúdo**. Um `statement` pode conter SQL sensível ou dados embutidos: **não extrair esses valores diretamente para resposta, logs, GitHub, Hindsight ou artefatos públicos**. Também não confundir ausência do array `rollback` com impossibilidade absoluta de restauração por backup.

**Gate desbloqueado parcialmente:** existe fonte concreta dos seis lotes originais. **Gate ainda pendente:** especificar canal privado e ambiente autorizado para exportar, inspecionar por segredos, recompor e executar as instruções num banco descartável; verificar equivalência do catálogo v1.85 e incorporar com cautela as quatro migrations próprias. O trabalho com conteúdo SQL real não ocorreu nesta inspeção. Proibir `db push` e alteração do banco produtivo.

**Precisão histórica:** `92d37f6ec0036162470a3f1beab013440310071b` é commit existente no fork ELUS, mas seu hash no nome das migrations **não prova** equivalência byte a byte com o SQL armazenado no ledger. O SHA de upstream v1.85 referido em docs anteriores não foi resolvido como commit local do fork na consulta GitHub; não usá-lo como artefato reconstruído sem verificar no upstream correto.

## Guarda adicional da exportação privada — 26/10/2026

O exportador `scripts/exportar-lotes-v185-privado.mjs` foi reforçado para rejeitar um destino aparentemente externo cujo diretório-pai resolva, por symlink, para dentro do checkout. Após criar o diretório privado, confirma o caminho canônico; antes de cada escrita, revalida identidade e permissões do diretório. Um teste unitário usa checkout temporário e symlink para exigir recusa **antes de conectar ao banco**, sem SQL nem credenciais reais.

**Escopo desta alteração:** proteção do procedimento futuro de exportação dos sete registros v1.85, não exportação efetiva. Os sete statements históricos continuam no Supabase; não foram copiados, executados, versionados nem inspecionados. O ensaio v1.85→v1.89, a revisão de `0759` e o aceite de upgrade continuam pendentes.
