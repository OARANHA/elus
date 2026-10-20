---
title: Design — sincronização do catálogo Chutes
status: proposta para revisão do proprietário
date: 2026-10-20
target: OARANHA/elus — PR #18
---

# Sincronização do catálogo Chutes

## Estado e limite

Esta especificação cobre a descoberta e sincronização de modelos Chutes usados em conversa. Ela não autoriza alterar `PUT /api/v1/ai/providers`: a tentativa anterior de escrita nessa rota foi bloqueada pela ferramenta, e esse bloqueio permanece vigente. A autorização granular do PUT segue como NO-GO separado.

Não altera o provedor de embeddings Chutes, defaults de organização, credenciais de instalação ou configuração de tenant. Não executa migration real, chamada de inferência paga, merge ou deploy.

## Evidência atual

- Na PR #18, `lib/ai/catalogo/openrouter.ts` traduz uma resposta de fornecedor para `LinhaDeCatalogo`; `lib/ai/catalogo/sincronizar.ts` contém o planejador puro `planejarSincronizacao`, escopado por `source`, com depreciação sem DELETE, ressurreição e piso de sanidade de 50%.
- O diretório `lib/ai/catalogo/` não tem hoje tradutor ou sincronizador Chutes com I/O.
- A migration `20261020120001_0691_chutes_chat_catalog.sql` semeia dois modelos Chutes em `ai_models`. As linhas precisam ter posse de fonte definida antes de o sincronizador atualizá-las.
- O Agent Hub da Chutes documenta o endpoint público `GET https://llm.chutes.ai/v1/models`, que fornece IDs, preços, contexto e capacidades. O guia consultado descreve `pricing.prompt` e `pricing.completion` em USD por milhão de tokens, `supported_features` e `input_modalities`. O JSON bruto atual da API não ficou disponível na leitura web; a captura e validação de um payload real, sem segredo, é pré-condição da implementação.

## Desenho proposto

### 1. Tradução pura

Adicionar um tradutor específico em `lib/ai/catalogo/chutes.ts`, com tipos e validação próprios. Não reutilizar diretamente a conversão OpenRouter, porque as unidades de preço são diferentes.

Mapeamento proposto, sujeito à confirmação com um payload real:

| Campo Chutes documentado | Destino em `LinhaDeCatalogo` |
|---|---|
| `id` | `model_id` |
| `name` | `display_name`, com fallback para `id` |
| `description` | descrição curta |
| `context_length` | `context_window` |
| `pricing.prompt` | preço de entrada |
| `pricing.completion` | preço de saída |
| `supported_features` contém `tools` | `supports_tools` |
| `input_modalities` contém `image` | `supports_vision` |
| não comprovado pelo catálogo | `supports_embedding = false` quando persistido |

O preço de cada lado deve ser finito e não negativo. Zero é preço conhecido; campo ausente, texto não numérico, Infinity, NaN ou valor negativo não equivale a zero e deve impedir a atualização do lote. Converter USD por milhão para centavos por milhão multiplicando por 100 e arredondando sempre para cima na precisão `numeric(10,4)` existente, sem usar ponto flutuante para truncar tarifa. O valor convertido deve permanecer finito e caber no tipo SQL.

A captura real precisa confirmar também o envelope do JSON, nulabilidade e formato numérico. Nenhum formato de envelope será inferido só porque a API é OpenAI-compatible.

### 2. Busca pública e segura

Adicionar uma função de transporte pequena no domínio do catálogo, injetável nos testes. Ela fará somente GET no endpoint fixo acima, sem `Authorization`, `CHUTES_API_KEY`, URL configurável por tenant ou credencial do banco.

A requisição deve ter timeout limitado, rejeitar redirect, exigir resposta HTTP de sucesso e JSON válido, limitar o tamanho recebido e validar a resposta completa antes de qualquer escrita. Erro de rede, status inesperado, formato inválido, IDs duplicados ou tarifa inválida abortam a rodada sem alterar o catálogo.

### 3. Planejamento e persistência

Traduzir e validar o lote inteiro antes de consultar/escrever. Buscar em `ai_models` somente as linhas de `provider='chutes'` e `source='chutes'`; passar esse recorte ao `planejarSincronizacao`. Aplicar o plano somente depois de todas as validações, dentro do padrão de I/O já usado pelo catálogo.

- Novos modelos e preços atualizados usam `source='chutes'`.
- Modelo ausente na origem é depreciado, não excluído.
- Modelo reaparecido é reativado pelo planejador.
- Se o piso de sanidade rejeitar a resposta, não fazer gravação parcial.
- Linhas de outras fontes nunca são selecionadas para atualização/depreciação.
- Não alterar `organizations.settings.llm`, bindings, `ai_pricing` de outros providers nem histórico de chamadas.
- Uma tarifa nova não modifica o custo de chamadas antigas.

### 4. Posse dos dois modelos semeados

Antes da primeira sincronização, os dois seeds da migration 0691 precisam pertencer explicitamente a `source='chutes'`; caso contrário, o sincronizador não pode tomar posse de uma linha manual por conflito no índice `(provider, model_id)`.

Proposta: migration forward-only e alteração correspondente no baseline, usando IDs exatos dos dois seeds e condicionando a mudança ao estado esperado. Se a origem encontrada não for a prevista, a migração deve falhar fechada para revisão. Não reescrever migration já aplicada nem executar migration real nesta etapa.

### 5. Acionamento

Reutilizar o mecanismo canônico de jobs/scheduler que já existir para manutenção de catálogos. A inspeção de implementação deve localizar esse ponto antes de codificar. Não criar cron, worker, endpoint público ou scheduler paralelo. Se não houver ponto de entrada compatível, deixar o sincronizador invocável pelo serviço existente e abrir essa decisão antes de criar nova infraestrutura.

## Testes de aceitação da implementação

### Tradução e preço
- Traduzir fixture capturada e sanitizada do endpoint; validar todos os campos suportados.
- Converter preço em USD/1M para centavos/1M exatamente, inclusive frações, com arredondamento para cima na escala de quatro casas.
- Distinguir zero conhecido de preço desconhecido; rejeitar ausente, negativo, inválido e fora de faixa.
- Falhar para envelope inesperado e IDs duplicados, sem escolher silenciosamente uma cópia.
- Derivar tools e vision somente dos campos de capacidade documentados; nunca inferir pelo nome.

### Transporte e segurança
- Provar URL fixa e método GET; nenhum header de autenticação ou segredo enviado.
- Timeout, redirect, HTTP não-2xx, corpo excessivo, JSON inválido e esquema inválido abortam sem persistência.
- Não aceitar URL/base endpoint vindo do request, banco ou configuração do tenant.

### Planejamento, isolamento e persistência
- Upsert/depreciação/ressurreição ficam limitados a `provider='chutes' AND source='chutes'`.
- Seeds Chutes transferidos explicitamente para a fonte gerenciada; linhas manuais de outros providers permanecem byte a byte inalteradas.
- Lote abaixo do piso de sanidade e qualquer erro prévio não geram escrita parcial.
- Gravar preço Chutes não atualiza defaults, bindings, credenciais nem preços de outros providers.
- Preço desconhecido continua bloqueando seleção/egress pelos gates Chutes existentes.

Testes usam fixtures offline; não chamam inferência e não dependem de rede. Na validação posterior, rodar os testes focalizados e gates do repositório no ambiente de desenvolvimento autorizado. Não fazer polling de Actions; aguardar GREEN/RED do proprietário.

## Decisões ainda abertas antes do código

1. Capturar e validar o payload real atual do endpoint, incluindo envelope, campos opcionais e escala máxima de preço.
2. Confirmar no baseline e na migration 0691 o valor atual/default de `source` e a estratégia de migration forward-only para os dois seeds.
3. Identificar o ponto canônico atual de agendamento de catálogo e o modo seguro de chamar esta sincronização.
4. Confirmar se o banco já dispõe de uma coluna canônica para registrar instante/origem de atualização. Não adicionar tabela nem misturar esta data com `llm_calls` sem evidência de necessidade.

## Gate separado: autorização do PUT

A correção do PUT não integra esta especificação. Seu bloqueio de segurança permanece. Quando houver uma via autorizada para essa alteração, ela precisa comparar binding anterior e solicitado sob a organização autenticada, falhar fechado quando a leitura for inconclusiva e exigir os grants independentes para cada mudança efetiva: provider, model, credential; classificar explicitamente `base_url` e `is_enabled`. Testes negativos requeridos: grant parcial, revogação, modelo apenas, credencial apenas, ausência de binding, tenant cruzado, leitura inconclusiva e sucesso autorizado. Não relaxar RLS, suporte read-only, auditoria nem preço Chutes.
