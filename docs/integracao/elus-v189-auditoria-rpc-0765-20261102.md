# ELUS v1.89 — auditoria somente leitura da divergência RPC 0765

**Data:** 2026-11-02. **Escopo:** projeto Supabase `elus` (PostgreSQL 17.11), branch `fix/elus-v189-executor-failclosed-20261028-0127`, PR #62, HEAD de referência `f76a234c85c49599e0850a2f6700e5c542013dfe`. **Decisão:** NO-GO; nenhuma aplicação SQL, migração, merge ou deploy autorizados.

## Evidências verificadas nesta inspeção

1. O ledger `supabase_migrations.schema_migrations` contém **51 registros**, acima do teto de **50** do executor; exatamente um registro com nome contendo `0765` e um contendo `9037`.
2. O recibo `20261026010000 / 0765_elus_rotacao_atomica_codigos_recuperacao` registra **um statement de 2.747 bytes**, MD5 `add7a7db36db87cd213fd7a7d0f81db7`. O texto registrado corresponde ao padrão `CREATE OR REPLACE FUNCTION public.fn_elus_rotacionar_codigos_recuperacao` e não corresponde ao padrão `DROP FUNCTION`.
3. A consulta a `pg_catalog.pg_proc`, sem restringir schema, não encontrou **nenhuma** função cujo nome contenha `recuper` ou `rotacion`. Portanto, a função esperada não está presente no catálogo observado.
4. A busca por **referência literal** a `fn_elus_rotacionar_codigos_recuperacao` em todos os `statements[]` dos **51 recibos** encontrou **apenas** a entrada 0765. Não foi identificada outra migration registrada que cite literalmente a função.
5. A migration versionada `supabase/migrations/20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql` define a RPC com `SECURITY DEFINER`, `pg_advisory_xact_lock`, validação de dez hashes, `REVOKE` de `PUBLIC/anon/authenticated` e `GRANT` a `service_role`. Seu blob Git observado foi `a05333f5b12b78c334181887f089b39398d9aa50`. **Não foi demonstrada equivalência byte a byte entre arquivo e recibo**, apenas a presença do padrão CREATE no recibo.
6. O CI do HEAD de referência concluiu `success` na execução `41500885100`, com **10/10 jobs aprovados**, inclusive invariantes PostgreSQL 15/17. Esse CI não comprova a presença da RPC no banco ativo nem aceite funcional.

## Limite da inferência

O recibo comprova a existência de uma entrada no histórico, **não** a permanência do objeto no catálogo. A busca literal não exclui `DROP` indireto/dinâmico, mudança manual fora do ledger, divergência entre ambientes, restauração posterior ou outro mecanismo não registrado. **A causa raiz continua indeterminada.** Não executar `CREATE FUNCTION`, `DROP FUNCTION`, reparo de ledger, `db push` ou correção direta no banco ativo.

## Próximas provas obrigatórias

- Correlacionar backups, logs de DDL/auditoria e histórico de restaurações, se disponíveis, **sem consultar dados pessoais**.
- Verificar por comparação independente a identidade integral do SQL 0765 registrado versus a migration versionada e os checkpoints anteriores/posteriores.
- Planejar reconciliação dos **51 recibos** com o executor, incluindo a entrada externa 9037, sem elevar arbitrariamente o teto nem editar histórico produtivo.
- Somente após autorização separada: ensaio de replay/restauração em PostgreSQL 15/17 descartável, testes negativos de ACL/RLS/tenancy, revisão 0690/9037 e autorização específica para o DELETE 0759.

**Guardas mantidas:** E2E/Playwright somente manual; sem SQL mutante, migrations, merge, imagens ou deploy nesta inspeção.

## Evidência adicional — identidade integral do recibo 0765 (02/11/2026)

**Método:** consulta exclusivamente `SELECT` no projeto Supabase `elus`, sem exportar `statements[]` ou dados de usuários. O hash Git foi reconstituído diretamente no PostgreSQL com `digest(convert_to('blob ' || octet_length(convert_to(statements[1], 'UTF8'))::text, 'UTF8') || decode('00','hex') || convert_to(statements[1], 'UTF8'), 'sha1')`. O prefixo binário `blob <bytes>\\0` segue a identidade de objeto Git; a comparação usa o blob do arquivo versionado na PR #62.

- Recibo `20261026010000` (`0765_elus_rotacao_atomica_codigos_recuperacao`): **1 statement, 2.747 bytes**.
- SHA-1 de blob Git calculado sobre os bytes integrais do statement: **`a05333f5b12b78c334181887f089b39398d9aa50`**, idêntico ao blob Git de `supabase/migrations/20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql` no HEAD `4804a555385ec4bcc916c1f7007c03c647b50003`.
- Catálogo `pg_proc`: **0** funções com nome exato `fn_elus_rotacionar_codigos_recuperacao`. Ledger: **51** recibos.
- Consulta agregada ao fluxo `postgres_logs` de **26/10/2026 00:00 UTC a 27/10/2026 00:00 UTC**: **133 eventos**, **0** menções textuais à RPC, **0** ocorrências textuais de `CREATE FUNCTION` ou `DROP FUNCTION` nos atributos pesquisados. Esta ausência **não** prova que o DDL não foi executado: logging pode estar desabilitado, filtrado, incompleto ou fora da janela.

**Conclusão limitada:** foi eliminada a hipótese de divergência de conteúdo entre o único statement registrado no recibo 0765 e o arquivo SQL versionado no HEAD analisado. **Não** se demonstrou execução bem-sucedida desse statement, permanência da função após a execução, nem causa do desaparecimento. A divergência recibo/catálogo continua bloqueante; não reparar o banco nem editar o ledger sem gates separados.

## Reconciliação integral dos 51 recibos por identidade — 02/11/2026, 18h BRT

**Método:** leitura do manifesto imutável `tests/unit/elus-v189-import-ledger-integrity.test.ts` no HEAD `c49585222146042d05041344db9dd007b189dbd4`, seguida de consultas **exclusivamente SELECT** no Supabase `elus`. Nenhum `statements[]` foi exportado. A comparação dos 39 SQLs oficiais calculou dentro do PostgreSQL o SHA-1 do objeto Git `blob <tamanho>\\0<conteúdo>` de cada statement; exigiu um único statement por recibo, mesma versão, mesmo nome e hash exato do manifesto.

- **39/39 recibos oficiais identificados:** 38 migrations upstream v1.89 importadas mais a migration adicional 0765; **39/39 nomes exatos e 39/39 hashes Git de conteúdo exatos**, sem divergências.
- **11/11 recibos históricos v1.85 identificados:** versão, nome, cardinalidade de um statement, comprimento e fingerprints esperadas conferem. Os sete lotes privados foram confrontados por comprimento e MD5(MD5(SQL)); os quatro ELUS por comprimento e MD5(SQL). Essas fingerprints são verificadores de identidade do ledger, **não** prova de execução, replay ou restauração.
- **1/1 recibo externo 9037 identificado:** versão `20261029104815`, nome `elus_9037_ai_autonomy_guarded`, um statement de 34.985 bytes e MD5 `10df3c797779f8cb4461631cb22676d2`. Não faz parte do manifesto de 39 migrations oficiais.
- **Total reconciliado: 11 + 39 + 1 = 51 recibos.** Não foram encontrados recibos fora dessas três classes na contagem observada. O executor mantém seu limite de 50 e o bloqueio `LEDGER_COUNT_DRIFT`; a identidade da 9037 **não autoriza** ignorá-la, alterar o histórico ou ampliar o teto.
- **Divergência de catálogo persiste:** `to_regprocedure('public.fn_elus_rotacionar_codigos_recuperacao(uuid,text[])')` retornou ausente, apesar de o recibo 0765 coincidir byte a byte com o SQL versionado. A função `fn_guard_organizations_ai_autonomy()` da guarda 9037 está presente. Recibos exatos **não** comprovam que seus efeitos persistem no banco.

**Conclusão operacional:** o bloqueio deixou de ser uma identidade desconhecida dos 51 recibos e passou a exigir investigação de **estado efetivo do catálogo**, causa da ausência da RPC 0765 e plano específico para a migration externa 9037. Nenhum aceite funcional, autorização do DELETE 0759, restauração PG15/17 ou replay histórico foi obtido. Preservar `apply` bloqueado, E2E somente manual e produção NO-GO.
