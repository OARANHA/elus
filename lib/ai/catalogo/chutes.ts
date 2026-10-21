import { z } from "zod";
import type { LinhaDeCatalogo } from "./openrouter";

export const FONTE_CHUTES = "chutes";
const ENDPOINT = "https://llm.chutes.ai/v1/models";
const LIMITE_BYTES = 1024 * 1024;
const TIMEOUT_MS = 20_000;
const MAX_ESCALADO = 9_999_999_999n; // numeric(10,4), em centavos/1M.

/** USD/1M (documentação Chutes) → centavos/1M. Nenhuma multiplicação em float. */
export function precoChutesParaCentavos(valor: string | number): number {
  const decimal = String(valor);
  const partes = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(decimal);
  if (!partes || decimal.length > 100) throw new Error("chutes_preco_invalido");
  const expoente = Number(partes[3] ?? 0);
  if (!Number.isSafeInteger(expoente) || Math.abs(expoente) > 1000) {
    throw new Error("chutes_preco_fora_da_faixa");
  }
  const fracao = partes[2] ?? "";
  const coeficiente = BigInt(partes[1]! + fracao);
  // x100 para centavos, x10000 para a escala SQL.
  const escala = expoente - fracao.length + 6;
  const divisor = escala < 0 ? 10n ** BigInt(-escala) : 1n;
  const escalado =
    escala < 0 ? (coeficiente + divisor - 1n) / divisor : coeficiente * 10n ** BigInt(escala);
  if (escalado > MAX_ESCALADO) throw new Error("chutes_preco_fora_da_faixa");
  return Number(escalado) / 10_000;
}

// Strings decimais também representam os lexemas numéricos preservados pelo
// transporte; nenhum preço passa por aritmética IEEE754 antes da conversão.
const preco = z.union([z.number().finite().nonnegative(), z.string()]);
const modelo = z.object({
  id: z
    .string()
    .min(1)
    .max(512)
    .refine((id) => id === id.trim()),
  object: z.literal("model"),
  pricing: z.object({ prompt: preco, completion: preco }),
  price: z.object({ input: z.object({ usd: preco }), output: z.object({ usd: preco }) }),
  context_length: z.number().int().positive().max(2_147_483_647).optional(),
  supported_features: z.array(z.string()).optional(),
  input_modalities: z.array(z.string()).optional(),
});
const envelope = z.object({ object: z.literal("list"), data: z.array(modelo).min(1).max(10_000) });

/** Valida o lote inteiro. Nada é descartado silenciosamente. */
export function traduzirCatalogoChutes(payload: unknown): LinhaDeCatalogo[] {
  const { data } = envelope.parse(payload);
  const ids = new Set<string>();
  return data.map((m) => {
    if (ids.has(m.id)) throw new Error("chutes_id_duplicado");
    ids.add(m.id);
    const entrada = precoChutesParaCentavos(m.pricing.prompt);
    const saida = precoChutesParaCentavos(m.pricing.completion);
    if (
      entrada !== precoChutesParaCentavos(m.price.input.usd) ||
      saida !== precoChutesParaCentavos(m.price.output.usd)
    ) {
      throw new Error("chutes_preco_usd_divergente");
    }
    return {
      provider: FONTE_CHUTES,
      source: FONTE_CHUTES,
      model_id: m.id,
      display_name: m.id, // name/description não existem na captura confirmada.
      description: null,
      context_window: m.context_length ?? null,
      input_price_per_million_cents: entrada,
      output_price_per_million_cents: saida,
      supports_tools: m.supported_features?.includes("tools") ?? false,
      supports_vision: m.input_modalities?.includes("image") ?? false,
    };
  });
}

/** Transporte sem configuração por tenant, segredo, redirect ou inferência. */
export async function buscarCatalogoChutes(
  fetchImpl: typeof fetch = fetch,
): Promise<LinhaDeCatalogo[]> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const res = await fetchImpl(ENDPOINT, {
    method: "GET",
    redirect: "error",
    credentials: "omit",
    headers: { accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`chutes_catalogo_http_${res.status}`);
  if (res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    await res.body?.cancel();
    throw new Error("chutes_catalogo_content_type_invalido");
  }
  const tamanho = res.headers.get("content-length");
  if (tamanho !== null && Number(tamanho) > LIMITE_BYTES) {
    await res.body?.cancel();
    throw new Error("chutes_catalogo_tamanho_excedido");
  }
  if (!res.body) throw new Error("chutes_catalogo_sem_corpo");
  const reader = res.body.getReader();
  const cancelar = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  signal.addEventListener("abort", cancelar, { once: true });
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      total += value.byteLength;
      if (total > LIMITE_BYTES) throw new Error("chutes_catalogo_tamanho_excedido");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    signal.removeEventListener("abort", cancelar);
    reader.releaseLock();
  }
  const body = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  const payload: unknown = JSON.parse(
    body,
    (key: string, value: unknown, context?: { source?: string }) => {
      if (
        (key === "prompt" || key === "completion" || key === "usd") &&
        typeof value === "number"
      ) {
        // Node >=22: JSON.parse source text access. Falha fechada em runtime antigo.
        if (!context?.source) throw new Error("chutes_decimal_original_indisponivel");
        return context.source;
      }
      return value;
    },
  );
  return traduzirCatalogoChutes(payload);
}
