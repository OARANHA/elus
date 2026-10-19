# Chutes — etapa 1: embeddings gerenciados pela instalacao

Escopo: reutiliza o adaptador offline Qwen3 do antigo ELUS sem alterar os indices existentes.

## Autoridade
- Adapter de referencia: `OARANHA/crm-wandora@8fae964`, `lib/ai/embeddings/chutes-qwen3-tee.ts`.
- Doc Chutes: `https://chutes.ai/docs/models/chutes-qwen-qwen3-embedding-8b-tee`.
- Contrato do vetor: `chutes/Qwen3-Embedding-8B-TEE:mrl1536-l2-v1`, 1536 floats, projecao MRL + L2, query com instrucao, documento sem instrucao.
- URL HTTPS fixa: `https://chutes-qwen-qwen3-embedding-8b-tee.chutes.ai/v1/embeddings`; nenhum override por tenant.

## Configuracao da instalacao (Portainer Vigia)
- `CHUTES_API_KEY`: senha unica da instalacao, aplicada por segredo protegido ao app/worker; nunca por SQL, navegador, log ou GitHub.
- `ELUS_EMBEDDING_DEFAULT=chutes`: opt-in explicito apenas para bases novas sem familia nem indice; valor ausente preserva o comportamento preexistente.
- A troca de familia/indexacao antiga exige reindexacao governada e prova de indexacao e consulta pelo mesmo modelo. O indice `vector(1536)` nao deve misturar familias.
- A UI de clientes exibe a familia como IA gerenciada pelo ELUS, nunca a chave.

## Limites
- Esta etapa **nao** habilita modelos Chutes de conversa. A ligacao do motor conversacional central (incluindo precos no catalogo e tetos por plano) exige gate separado.
- Nenhuma chave real ou consulta Chutes foi executada no desenvolvimento. CI e canario de indexacao/consulta ainda pendentes.
