/**
 * GET/POST /api/v1/cron/sync-model-catalog — o catálogo que se atualiza sozinho.
 *
 * A OpenRouter publica ~400 modelos de ~58 fabricantes e a lista muda sozinha.
 * Até aqui, `ai_models` era semeada por migration: a cada modelo novo do
 * mercado, o self-hoster precisava esperar uma release do DeskcommCRM para
 * poder escolhê-lo — e o preço da tabela envelhecia junto, o que não é
 * cosmético: é o número que faz o teto de orçamento da organização disparar na
 * hora certa, ou não disparar.
 *
 * Este cron busca os catálogos públicos OpenRouter e Chutes, sem chave,
 * traduz e concilia cada fonte independentemente. A regra da conciliação vive em
 * `lib/ai/catalogo/sincronizar.ts`; aqui é só borda e I/O.
 *
 * O que ele deliberadamente NÃO faz:
 *
 *  - **não apaga nada.** Modelo que sai da origem recebe `deprecated_at`. A
 *    linha continua referenciada pelo histórico de custo, e apagá-la faria o
 *    relatório do mês passado perder o preço com que a conta foi somada.
 *  - **não toca em linha de outra origem.** `source = 'manual'` é a curadoria
 *    que veio nas migrations; varrer a tabela inteira apagaria os defaults
 *    recomendados sem o operador nunca saber por quê.
 *  - **não aceita resposta suspeita.** Origem devolvendo menos da metade do que
 *    já conhecíamos aborta a rodada — ver o piso de sanidade. Catálogo
 *    desatualizado é recuperável; catálogo esvaziado por um soluço de rede
 *    custa a confiança na tela.
 *
 * Auth: mesmo contrato dos demais crons (Bearer `INTERNAL_CRON_SECRET` |
 * `INTERNAL_SECRET`, fail-closed).
 *
 * NOTA DE DEPLOY: o agendamento vive no serviço `scheduler` do
 * `docker-compose.prod.yml`, como os outros crons — não há `vercel.json` neste
 * repo. Cadência diária basta: modelo novo que demora um dia para aparecer no
 * seletor não quebra ninguém.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { autorizaCron } from "@/lib/auth/cron-auth";
import { fail, ok } from "@/lib/api/wrappers";
import {
  FONTE_OPENROUTER,
  traduzirCatalogo,
  type ModeloDaOpenRouter,
} from "@/lib/ai/catalogo/openrouter";
import {
  CatalogoSuspeitoError,
  planejarSincronizacao,
  type ModeloExistente,
} from "@/lib/ai/catalogo/sincronizar";
import { sincronizarCatalogoChutes } from "@/lib/ai/catalogo/sincronizar-chutes";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ENDPOINT_DO_CATALOGO = "https://openrouter.ai/api/v1/models";
const TIMEOUT_MS = 20_000;

export interface ResultadoDaSincronizacao {
  fonte: string;
  recebidos: number;
  gravados: number;
  depreciados: number;
  ressuscitados: number;
}

/**
 * Separado do handler para o teste exercitar a REGRA sem montar request/auth —
 * mesmo padrão de `recover-stuck-messages`.
 */
export async function sincronizarCatalogo(
  admin: ReturnType<typeof createAdminClient>,
  buscar: () => Promise<ModeloDaOpenRouter[]>,
): Promise<ResultadoDaSincronizacao> {
  const daOrigem = traduzirCatalogo(await buscar());

  const { data: existentes, error: erroLeitura } = await admin
    .from("ai_models")
    .select("model_id, deprecated_at")
    .eq("source", FONTE_OPENROUTER);
  if (erroLeitura) throw new Error(`catalogo_leitura_falhou: ${erroLeitura.message}`);

  const plano = planejarSincronizacao(daOrigem, (existentes ?? []) as ModeloExistente[]);

  const agora = new Date().toISOString();

  if (plano.paraGravar.length > 0) {
    const { error } = await admin.from("ai_models").upsert(
      plano.paraGravar.map((l) => ({ ...l, synced_at: agora, deprecated_at: null })),
      { onConflict: "provider,model_id" },
    );
    if (error) throw new Error(`catalogo_upsert_falhou: ${error.message}`);
  }

  if (plano.paraDepreciar.length > 0) {
    const { error } = await admin
      .from("ai_models")
      .update({ deprecated_at: agora })
      .eq("source", FONTE_OPENROUTER)
      .in("model_id", plano.paraDepreciar);
    if (error) throw new Error(`catalogo_depreciacao_falhou: ${error.message}`);
  }

  // Ressuscitar é feito pelo upsert acima (`deprecated_at: null`); o número é
  // reportado para o log distinguir "voltou" de "entrou agora" — sem isso, um
  // catálogo que oscila pareceria estável.
  return {
    fonte: FONTE_OPENROUTER,
    recebidos: daOrigem.length,
    gravados: plano.paraGravar.length,
    depreciados: plano.paraDepreciar.length,
    ressuscitados: plano.paraRessuscitar.length,
  };
}

async function buscarDaOpenRouter(): Promise<ModeloDaOpenRouter[]> {
  const res = await fetch(ENDPOINT_DO_CATALOGO, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`catalogo_origem_status_${res.status}`);
  const json = (await res.json()) as { data?: ModeloDaOpenRouter[] };
  if (!Array.isArray(json.data)) {
    throw new Error("catalogo_origem_shape_inesperado — a resposta não trouxe `data` como lista");
  }
  return json.data;
}

// Esta rota aceitava SÓ o primeiro segredo definido (`INTERNAL_CRON_SECRET ||
// INTERNAL_SECRET`), e era a única das rotas de cron a fazer isso. O efeito era
// 401 em toda instalação do kit: o `install.sh` gera os DOIS segredos com valores
// diferentes e o `crond` do serviço `scheduler` manda `Bearer $INTERNAL_SECRET`
// (`docker/scheduler/entrypoint.sh`), que não era o esperado aqui. O `curl` do
// crontab descarta a saída, então o 401 diário não aparecia em lugar nenhum.
// Agora usa o mesmo portão das outras: `lib/auth/cron-auth.ts`, que confere o
// Bearer (ou `x-cron-secret`) contra os dois segredos e falha fechado sem nenhum.
// A cerca contra o padrão voltar é `tests/unit/cron-aceita-os-dois-segredos.test.ts`.

/** Somente códigos locais conhecidos: nunca inclui mensagem/payload remoto. */
function motivoDaFalha(erro: unknown): string {
  if (erro instanceof DOMException && (erro.name === "TimeoutError" || erro.name === "AbortError"))
    return "catalogo_timeout";
  if (!(erro instanceof Error)) return "catalogo_falha_nao_classificada";
  if (erro.name === "TimeoutError" || erro.name === "AbortError") return "catalogo_timeout";
  if (erro.name === "ZodError") return "catalogo_schema_invalido";
  const codigo = erro.message.split(":")[0]!;
  if (/^(chutes_catalogo_http_|catalogo_origem_status_)\d{3}$/.test(codigo)) return codigo;
  const conhecidos = new Set([
    "chutes_catalogo_leitura_falhou",
    "chutes_catalogo_persistencia_falhou",
    "chutes_catalogo_content_type_invalido",
    "chutes_catalogo_tamanho_excedido",
    "chutes_catalogo_sem_corpo",
    "chutes_preco_invalido",
    "chutes_preco_fora_da_faixa",
    "chutes_preco_usd_divergente",
    "chutes_id_duplicado",
    "chutes_decimal_original_indisponivel",
    "catalogo_leitura_falhou",
    "catalogo_upsert_falhou",
    "catalogo_depreciacao_falhou",
  ]);
  if (conhecidos.has(codigo)) return codigo;
  if (erro instanceof SyntaxError) return "catalogo_json_invalido";
  if (erro instanceof TypeError) return "catalogo_rede_falhou";
  return "catalogo_falha_nao_classificada";
}

async function handler(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  if (!autorizaCron(req)) {
    return fail("unauthorized", "cron secret ausente ou inválido", 401, { requestId });
  }
  try {
    const admin = createAdminClient();
    const fontes = ["openrouter", "chutes"] as const;
    const rodadas = await Promise.allSettled([
      sincronizarCatalogo(admin, buscarDaOpenRouter),
      sincronizarCatalogoChutes(admin),
    ]);
    const resultados = rodadas.map((rodada, indice) => {
      const fonte = fontes[indice]!;
      if (rodada.status === "fulfilled") {
        logger.info("[sync-model-catalog] concluído", { ...rodada.value, request_id: requestId });
        if (
          rodada.value.gravados > 0 ||
          rodada.value.depreciados > 0 ||
          rodada.value.ressuscitados > 0
        ) {
          void audit({
            action: "ai.catalog_sync",
            organizationId: null,
            bypassedRls: true,
            metadata: { ...rodada.value },
            requestId,
          });
        }
        return rodada.value;
      }
      const erro: unknown = rodada.reason;
      if (erro instanceof CatalogoSuspeitoError) {
        logger.warn("[sync-model-catalog] rodada recusada pelo piso de sanidade", {
          fonte,
          recebidos: erro.recebidos,
          conhecidos: erro.conhecidos,
          request_id: requestId,
        });
        return { fonte, recusado: true, motivo: erro.message };
      }
      // Não devolver mensagens remotas nem detalhes de banco ao chamador.
      logger.error("[sync-model-catalog] fonte falhou", {
        fonte,
        motivo: motivoDaFalha(erro),
        request_id: requestId,
      });
      return { fonte, falhou: true };
    });
    if (resultados.some((r) => "falhou" in r)) {
      return fail("cron_failed", "Falha ao sincronizar catálogo; consulte o log por fonte.", 500, {
        requestId,
      });
    }
    return ok({ fontes: resultados }, { requestId });
  } catch (erro) {
    logger.error("[sync-model-catalog] falhou", {
      motivo: motivoDaFalha(erro),
      request_id: requestId,
    });
    return fail("cron_failed", "Falha ao iniciar sincronização do catálogo.", 500, { requestId });
  }
}

export const GET = handler;
export const POST = handler;
