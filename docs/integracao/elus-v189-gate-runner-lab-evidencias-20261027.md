# ELUS v1.89 — evidências do runner isolado (27/10/2026)

**Status: TESTADO SOMENTE EM LABORATÓRIO. NÃO É AUTORIZAÇÃO DE DEPLOY.**

Fonte das observações: saídas de terminal fornecidas pelo operador da VPS Vigia. Arquivo `scripts/elus_v189_lab_runner.py` v3 ainda **não** estava no GitHub quando este documento foi criado; atualmente reside em checkout local `/root/elus-v189-lab`. Não confundir com runner produtivo.

## Evidência
- Base restaurada: `elus_restore_v3`, 191 tabelas públicas, 191 com RLS, 11 entradas no ledger histórico; `pg_restore --exit-on-error` OK.
- Primeira aplicação SQL exploratória: 38 migrations importadas; 208 tabelas públicas, todas com RLS; zero índices inválidos; histórico original inalterado.
- Migration adicional ELUS `0765`: RPC presente; `anon` e `authenticated` sem EXECUTE; `service_role` com EXECUTE.
- Runner de laboratório: `RUNNER_LAB_GREEN=39`, `LEDGER_VERIFIED=39/39`, nova aplicação `RESUME_FROM=39`.
- Laboratório adversarial: parada intencional após 7 migrations; falha na oitava; `LEDGER_VERIFIED=7/39`; retomada `RESUME_FROM=7`, conclusão `39/39`; repetição `RESUME_FROM=39`.
- Concorrência local de dois processos na mesma VPS: segunda chamada retornou `GATE_RED=CONCURRENT_RUNNER_BLOCKED`; primeira concluiu `RUNNER_LAB_GREEN=39`; recibos `39/39`.
- ACL de tabelas novas deliberadamente sem policies: `lgpd_marcas_de_apagamento` e `mfa_trusted_devices`; ausência de policies não equivale a bypass.

## Escopo e limites
- `elus_v189_lab_runner.py` foi projetado para **container com rede desabilitada**, um conjunto restrito de nomes de banco e SHA fixo; não é um executor para Supabase produtivo.
- Diário de recibos próprio NÃO substitui `supabase_migrations.schema_migrations`. Foram preservadas as 11 versões históricas, mas **o plano de registro transacional no ledger oficial e sua compatibilidade com a Supabase CLI continuam pendentes**.
- Não foram validados nesta rodada: isolamento funcional entre dois tenants sintéticos, execução concorrente entre hosts, comparativo de catálogo final com baseline, cadeia das PRs 40/43/44/45, imagens publicadas e deploy saudável.
- Não reexecutar SQL destrutivo ou `supabase db push` em produção a partir deste relatório. `0759` remove formatos legados de códigos MFA; requer autorização específica.

## Próxima ação concreta
1. Versionar e revisar runner local na mesma branch da PR #43, sem reescrever arquivos históricos.
2. Garantir que testes e controles de GitHub não executem runner de laboratório contra produção.
3. Conceber e revisar procedimento produtivo separado para a transição do ledger histórico v1.85 para v1.89.
4. Confirmar CI do novo HEAD por evento (sem polling), reconciliar PRs e só depois publicar imagens e implantar com rollback.

**Classificação:** código local TESTADO no laboratório, evidência documental adicionada ao GitHub; produção SEM ALTERAÇÕES.
