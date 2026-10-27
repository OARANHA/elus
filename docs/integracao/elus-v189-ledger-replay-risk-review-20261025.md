# ELUS v1.89.0 — pré-voo de replay e riscos SQL (sem execução)

**Data da inspeção:** 25/10/2026. **Escopo:** revisão estática do lote importado na PR #43, não um procedimento de aplicação. **Estado:** BLOQUEADO para banco real, merge e deploy.

**Atualização somente leitura em 25/10/2026:** o ledger real continua com 11 versões e a consulta ao catálogo PostgreSQL 17.11 confirmou ausência das 16 tabelas novas, divergência da assinatura RPC de aviso de caso e policy de escrita anterior. Evidências, limites e plano de gates em [reconciliação do ledger e catálogo](elus-v189-plano-upgrade-ledger-e-catalogo-20261025.md). Este pré-voo estático permanece histórico e não autoriza replay.

## Evidência e fronteira

- Repositório: `OARANHA/elus`, PR [#43](https://github.com/OARANHA/elus/pull/43), HEAD inspecionado `4fd669d59bcc08b3ebf2ae723e1d8192303ac927`, base da PR #40 `610474d53af17ca44065f239e86643dd6784fc08`. PR aberta, Draft e sem merge na consulta desta data.
- [CI do HEAD](https://github.com/OARANHA/elus/actions/runs/40216526578): `completed/success`; `verify`, `invariants` e PostgreSQL 15/17 GREEN. **Esse resultado não prova upgrade, idempotência, compatibilidade do banco existente nem aceite funcional.**
- Origem fixada: DeskcommCRM v1.85.0 `83aeac8f78aa076f3adfaf3e773c8616229e5cd9` → v1.89.0 `6540929d5ef7a951531dda550db0bf54affa516a`. Os 38 arquivos importados e as quatro migrations próprias estão fixados por blob Git em `tests/unit/elus-v189-import-ledger-integrity.test.ts`. O candidato de `supabase/baseline.sql` é `f9c5de4cdab40c1f73ee4e63f53886c93671e5c2`, guardado por `tests/unit/baseline-integrity.test.ts`.
- O histórico Supabase abaixo é o **snapshot somente leitura de 25/10/2026**, documentado em `elus-v189-banco-real-e-gates-20261025.md`. Não foi reconsultado neste pré-voo. Não há SQL executado, nem E2E/Playwright, merge ou deploy.

## Por que o replay direto está bloqueado

O ledger observado contém **11 versões efetivamente registradas**: preparação `20261018200431`; seis lotes de baseline v1.85.0 `20261018204508`, `20261018204837`, `20261018204851`, `20261018204924`, `20261018204939`, `20261018204955`; e quatro versões ELUS `20261019204449`, `20261021025530`, `20261021025551`, `20261021025613`. Essas quatro versões **não são iguais** aos timestamps dos nomes de seus arquivos SQL. A aplicação por lotes não gerou um registro por cada uma das 516 migrations históricas.

Com corte no último registro `20261021025613`, **11 das 38 migrations upstream importadas têm timestamp anterior ou igual**, e **27 posterior**. A comparação é apenas cronológica: **não** demonstra que a CLI executará, ignorará ou ordenará corretamente qualquer arquivo. Não executar `supabase db push`, `db reset`, `psql` nem editar `supabase_migrations.schema_migrations` para tentar reconciliar o ledger.

### Onze migrations anteriores ao corte — revisão estática do SQL

| Migration importada | Efeito identificado no SQL | Verificação obrigatória antes de um plano de upgrade |
| --- | --- | --- |
| `0593` — `20261007205228` | Colunas/índice e trigger de nome de agenda em `contacts` | Colunas e trigger existentes; reexecução e impacto em contatos anonimizados |
| `0657` — `20261013120000` | Reescreve funções de cascata LGPD e rótulo opaco | Assinaturas, grants, filas de redação e preservação da privacidade |
| `0669` — `20261015090000` | Altera constraint de `platform_smtp_settings` | Compatibilidade do CHECK com os dados já existentes |
| `0655` — `20261019000002` | Amplia CHECK de `agent_inbox_items.kind` | Vocabulário de aplicação e constraint efetiva |
| `0684` — `20261020000001` | Substitui funções de eventos/triggers de mensagens | Comparar com redefinição posterior em `0760`; grants e efeitos de triggers |
| `0687` — `20261020000004` | Altera aviso de caso e RPC de resposta WhatsApp | Assinatura `fn_definir_aviso_de_caso` (7 argumentos), call sites, MFA e RLS |
| `0762` — `20261020000006` | Acrescenta destinatário em `agent_inbox_items` | Origem upstream `0689`; não confundir com `0689` própria ELUS |
| `0763` — `20261020120002` | Altera `external_db_connections` e recria view segura | Origem upstream `0691`; ordem com `0706`, privilégios e projeção segura |
| `0764` — `20261020130000` | Cria histórico de rodízio e substitui RPC de atribuição | Origem upstream `0692`; dependências de CRM/automação e isolamento |
| `0716` — `20261020230856` | Extensa migração de serviços de agenda: novas tabelas, FKs, funções | Verificar pré-condições e ordem antes de `0717` e `0753`; revisão dedicada por amplitude |
| `0693` — `20261021000000` | Amplia CHECK de `passagens_de_atendimento.motivo_codigo` | Paridade do vocabulário `verificacao_manual` |

**Nota:** os três renomes do plano nominal são `0689 → 0762`, `0691 → 0763` e `0692 → 0764`. O arquivo `0763` também usa timestamp substituto `20261020120002` para evitar colisão com a migration ELUS `0690` de `20261020120000`. Esses renomes não são versões já aplicadas no Supabase.

### Vinte e sete migrations posteriores — triagem por risco e dependência

| Área de revisão | Arquivos (número lógico) | Observação estática |
| --- | --- | --- |
| Catálogo e CRM/prospecção | `0703`, `0705`, `0710`, `0722`, `0729`, `0738`, `0743`, `0744`, `0754`, `0756` | DML de catálogo, colunas/constraints, métricas e funções; validar semântica de dados existentes e contratos TypeScript |
| Agenda e banco externo | `0717`, `0706`, `0753` | `0717` altera FK da tabela criada por `0716`; `0706` recria view alterada em `0763`; `0753` cria configuração/histórico e RPC de aviso |
| Mensagens, agentes e importação | `0721`, `0726`, `0731`, `0748`, `0749`, `0760`, `0761` | Novas tabelas com RLS, funções e policies; `0760` redefine funções de eventos de `0684`; `0761` introduz tabela de histórico |
| Autorização, LGPD e credenciais | `0734`, `0747`, `0750`, `0752`, `0755`, `0757`, `0759` | Regras de papel, MFA, retenção, RLS, grants, códigos de recuperação e alteração de funções `SECURITY DEFINER` |

**Risco de efeito destrutivo explicitamente identificado:** `0759_codigos_de_recuperacao_antigos_saem.sql` contém `DELETE FROM public.user_recovery_codes WHERE octet_length(code_hash) <> 32`. A migration upstream documenta o motivo e a intenção de remover formatos legados, mas a decisão de aplicá-la **ao ELUS real** exige avaliação própria de impacto, backup/rollback e autorização específica. Não classificar o lote inteiro como DDL inofensivo nem executar esse DELETE em produção.

**Dependências de ordem que exigem prova de execução:** `0716 → 0717`; `0763 → 0706` (view segura); `0684 → 0760` (substituição de funções de eventos); `0747 → 0757` (MFA/controle de plataforma); `0687 → 0753` (integração de avisos). Setas indicam relação de código a confirmar em plano de upgrade, **não** certificação de ordem/idempotência. Os números lógicos não determinam a ordem; os timestamps de arquivo são distintos no lote, mas não representam o ledger já aplicado.

## Gates pendentes — decisão proibida até evidência

1. **Read-only no banco autorizado:** obter snapshot novo de `supabase_migrations.schema_migrations`, versão/configuração do CLI e catálogo de objetos/colunas/funções/policies/grants relevantes; comparar com os 11 registros acima. Não consultar dados pessoais.
2. **Plano de execução independente:** definir mapeamento explícito entre os 11 registros por lotes e os 38 arquivos upstream, com ordem determinística, pré-condições, mudanças de funções/grants, operações com efeitos sobre dados, checkpoints e recuperação; não modificar versões históricas nem migrations ELUS.
3. **Revisão adversarial:** aprovar separadamente `0759` (DELETE de códigos legados), mudanças LGPD (`0657`, `0750`), MFA/RBAC (`0747`, `0757`), policies (`0752`) e funções privilegiadas. Garantir que VendaERP permaneça READ-ONLY e ISIS/DANFE, Chutes, login e governança não sofram regressões.
4. **Validação permitida agora:** revisão estática, lint, TypeScript e testes unitários. A baseline candidata e a importação possuem hashes e CI GREEN neste HEAD, **mas não há teste de upgrade do banco ativo nem autorização para aplicar migrations**. E2E segue exclusivamente manual (`workflow_dispatch`), sem execução.
5. **Gates operacionais posteriores e separados:** somente após plano, ambiente de ensaio autorizado, revisão de segurança e aceite explícito considerar merge, imagem ou deploy. Este documento não concede nenhuma dessas autorizações.

## Critério de conclusão desta inspeção

**Concluído:** inspeção estática inicial dos 38 arquivos SQL importados, classificação cronológica 11/27 a partir do snapshot e identificação de dependências e de um `DELETE` que exige revisão específica.

**Não concluído:** prova de upgrade, teste de execução SQL, verificação atualizada do banco, revisão semântica exaustiva de cada função/trigger, aceite funcional ou integração final da v1.89.0. A PR #43 deve permanecer Draft enquanto esses gates forem pendentes.
