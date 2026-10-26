# Conferência offline dos sete statements históricos ELUS v1.85

**Estado: ferramenta de pré-voo; NÃO comprova upgrade v1.89.** Complementa `elus-v189-ensaio-upgrade-isolado-20261026.md` da PR #43.

O ledger Supabase contém sete registros históricos de preparação e baseline v1.85 (um statement por registro) e quatro migrations próprias ELUS. A consulta de 26/10/2026 documentou tamanho e fingerprint MD5 dos sete statements. A ferramenta `scripts/verificar-ledger-v185-offline.mjs` compara uma exportação **privada** com esses metadados, sem executar SQL, acessar rede, gravar arquivos ou imprimir seu conteúdo.

## Contrato de entrada privada

O operador autorizado prepara, fora do repositório e fora de qualquer log, um arquivo UTF-8 com formato `{ "rows": [{ "version": "...", "statements": ["..."] }] }`. Incluir **somente os sete registros históricos** `20261018200431` a `20261018204955`, em ordem crescente. Não incluir os quatro registros próprios ELUS, credenciais, dados de clientes ou cópias da base inteira. A extração deve ocorrer apenas por canal privado autorizado, com inspeção de possíveis segredos embutidos e controles de acesso locais. Não anexar a exportação a PR, issue, CI, Hindsight, chat ou artefato público.

Execução local, sem rede: `node scripts/verificar-ledger-v185-offline.mjs /caminho/privado/ledger-v185.json`.

Saída `LEDGER_V185_FINGERPRINT_OK registros=7` confirma apenas correspondência de versão, ordem, quantidade de statements, bytes UTF-8 e MD5 histórico. Qualquer divergência resulta em `LEDGER_V185_FINGERPRINT_RED` e código de saída diferente de zero; a ferramenta nunca exibe SQL ou caminho do arquivo. MD5 é fingerprint de reconciliação, **não certificação criptográfica**. O SQL privado não é distribuído com este PR.

## Gates que permanecem obrigatórios

Conferir equivalência semântica do catálogo v1.85, obter prova de origem e SHA256 independente dos lotes, inspecionar SQL quanto a segredos e efeitos, executar o replay apenas em PostgreSQL 15/17 descartável com dados sintéticos, validar rollback e ledger, revisar `0759` destrutiva e permissões/RLS. Preservar as quatro migrations ELUS e as integrações VendaERP somente leitura, ISIS/DANFE, Chutes, login, governança e deploy. Nenhum E2E/Playwright, merge, imagem, deploy ou alteração de banco real faz parte desta etapa.
