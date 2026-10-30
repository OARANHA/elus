# ELUS v1.89 — inventário estático comparativo das baselines (29/10/2026)

**Escopo:** comparação exclusivamente de leitura de três blobs Git imutáveis. Não houve execução de SQL, reconstrução nesta rodada, restauração, teste de instalação ou mudança de baseline. Este documento é evidência **estática**, não aceite funcional nem autorização de upgrade.

## Fontes fixadas

| Baseline | Blob Git SHA-1 | Caracteres retornados | Linhas |
|---|---|---:|---:|
| `melgarafael/DeskcommCRM` tag `v1.85.0`, `supabase/baseline.sql` | `6b64d8bb5769f23a4983834e8fdeacfb1b3f4f38` | 2.978.681 | 57.873 |
| `melgarafael/DeskcommCRM` tag `v1.89.0`, `supabase/baseline.sql` | `07af36ef379f341559318ca5cd2cadc7a5740797` | 3.307.272 | 63.245 |
| `OARANHA/elus` `main` em `a44e039390577c3adc279aa9168c18e99bb64a93`, `supabase/baseline.sql` | `0269eee11299e0492f489ab6d690eb88b91e30b1` | 3.335.831 | 63.854 |

As três fontes foram lidas por blob SHA (não por uma resposta vazia da API de arquivo grande). As contagens são do texto UTF-8 retornado pelo conector; os blobs Git são a identidade versionada. A baseline ELUS já contém uma **candidata reconstruída**, protegida por `tests/unit/baseline-integrity.test.ts`, que fixa o blob e a posição da migration `0765` antes da varredura de permissões anon. Isso **não prova** replay ou compatibilidade com o banco vivo.

## Inventário por nomes de declarações DDL

Método: extração textual, insensível a maiúsculas, de declarações em início de linha `CREATE TABLE`, `CREATE [OR REPLACE] FUNCTION`, `CREATE POLICY ... ON` e `CREATE TRIGGER`, com schema `public` opcional. Para tabelas, funções e triggers foram contados **nomes distintos**; para policies, **pares tabela/policy distintos**. Não é parser SQL completo e não compara assinaturas, corpos, ACL, RLS efetiva, dependências ou efeitos de execução.

| Categoria | Upstream v1.85 | Upstream v1.89 | ELUS candidata | Ausentes na ELUS em relação à v1.89 |
|---|---:|---:|---:|---:|
| Tabelas (nomes) | 157 | 174 | 177 | 0 |
| Funções (nomes) | 315 | 351 | 357 | 0 |
| Policies (pares tabela/policy) | não apurado nesta régua | 259 | 259 | 0 |
| Triggers (nomes) | 158 | 166 | 167 | 0 |

Entre v1.85 e v1.89, o inventário encontrou **17 novos nomes de tabela**, **36 novos nomes de função** e **8 novos nomes de trigger**, sem remoção de nomes nessas três categorias. Para o inventário por **nome simples** de policy (não por par), o upstream passou de 241 para 256 nomes distintos: 17 novos e 2 removidos. O inventário ELUS tem os mesmos 256 nomes distintos e os mesmos 259 pares tabela/policy da v1.89. Essa equivalência **não prova equivalência de predicados de autorização**.

Objetos declarados na candidata ELUS e não encontrados por nome na baseline upstream v1.89:

- **Tabelas (3):** `erp_admin_whatsapp_bindings`, `erp_connections`, `erp_customer_identity_links`.
- **Funções (6):** `fn_elus_rotacionar_codigos_recuperacao`, `fn_guard_organizations_ai_autonomy`, `fn_integracoes_erp_invalidar_vinculo_cliente`, `fn_integracoes_erp_provisionar`, `fn_integracoes_erp_vincular_cliente`, `fn_sincronizar_catalogo_chutes`.
- **Trigger (1):** `trg_guard_organizations_ai_autonomy`.

A comparação é compatível, **somente no nível de nomes extraídos**, com a baseline upstream v1.89 acrescida de objetos próprios ELUS. Não demonstra que a baseline foi montada corretamente nem que todas as 38 migrations importadas foram executadas ou reproduzidas semanticamente.

## Divergências materiais não resolvidas

1. **RPC 0765:** a candidata `supabase/baseline.sql` declara `fn_elus_rotacionar_codigos_recuperacao` e o teste estático verifica a inclusão integral da migration `0765`. Entretanto, a última evidência documentada do banco vivo registra recibo `0765` sem a função no catálogo. Inventário da baseline e catálogo vivo são provas diferentes; não reaplicar a migration por inferência.
2. **Sobreposição 0690/9037:** a baseline ELUS contém `fn_guard_organizations_ai_autonomy` da trilha `0690`; a migration externa `9037`, documentada separadamente, possui guarda mais restritiva. O inventário de nomes não detecta essa divergência semântica. Um replay que sobrescreva `9037` com `0690` pode regredir a proteção. Não incluir automaticamente `9037` no manifesto v1.89.
3. **Ledger vivo:** a última fotografia documentada possui 51 recibos (11 históricos + 39 do upgrade + 9037), enquanto o executor fail-closed admite no máximo 50. A baseline estática não autoriza elevar esse limite.
4. **Gates independentes:** falta prova de restauração em ambiente descartável e replay histórico PostgreSQL 15/17, revisão de ACL/RLS e isolamento multi-tenant, reconciliação da 0765 e aprovação independente da operação destrutiva 0759.

**Conclusão:** o inventário não identificou **nomes ausentes** nas quatro categorias examinadas, mas não constitui comparação semântica integral nem validação de instalação. A baseline candidata já está versionada; não a reescrever sem trilha separada de testes. **NO-GO** para aplicação produtiva, merge ou deploy sem os gates específicos. E2E/Playwright permanece manual e não foi executado.
