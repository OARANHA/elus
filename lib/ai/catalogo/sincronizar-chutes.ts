import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarCatalogoChutes } from "./chutes";
import type { LinhaDeCatalogo } from "./openrouter";
import { planejarSincronizacao } from "./sincronizar";

const tarifa = z
  .number()
  .finite()
  .min(0)
  .max(999999.9999)
  .refine((n) => Number(n.toFixed(4)) === n);
const linhasValidas = z
  .array(
    z
      .object({
        provider: z.literal("chutes"),
        source: z.literal("chutes"),
        model_id: z
          .string()
          .min(1)
          .max(512)
          .refine((id) => id.trim() === id),
        display_name: z.string().min(1),
        description: z.string().nullable(),
        context_window: z.number().int().positive().max(2_147_483_647).nullable(),
        input_price_per_million_cents: tarifa,
        output_price_per_million_cents: tarifa,
        supports_tools: z.boolean(),
        supports_vision: z.boolean(),
      })
      .strict(),
  )
  .min(1)
  .max(10_000)
  .refine((linhas) => new Set(linhas.map((l) => l.model_id)).size === linhas.length);
const existentesValidos = z.array(
  z.object({ model_id: z.string(), deprecated_at: z.string().nullable() }),
);
const resultadoValido = z.object({
  fonte: z.literal("chutes"),
  recebidos: z.number().int().nonnegative(),
  gravados: z.number().int().nonnegative(),
  depreciados: z.number().int().nonnegative(),
  ressuscitados: z.number().int().nonnegative(),
});

/** Catálogo é global: não lê nem escreve tabelas/configurações de tenant. */
export async function sincronizarCatalogoChutes(
  admin: SupabaseClient,
  buscar: () => Promise<LinhaDeCatalogo[]> = buscarCatalogoChutes,
): Promise<z.infer<typeof resultadoValido>> {
  const linhas = linhasValidas.parse(await buscar());
  const { data, error } = await admin
    .from("ai_models")
    .select("model_id, deprecated_at")
    .eq("provider", "chutes")
    .eq("source", "chutes");
  if (error) throw new Error(`chutes_catalogo_leitura_falhou: ${error.message}`);
  // Leitura inconclusiva não é catálogo vazio.
  const existentes = existentesValidos.parse(data);
  const plano = planejarSincronizacao(linhas, existentes);
  // Uma única transação. O banco revalida ownership e piso sob lock, inclusive
  // contra mudanças concorrentes entre este SELECT e a chamada RPC.
  const { data: resultado, error: erroEscrita } = await admin.rpc(
    "fn_sincronizar_catalogo_chutes",
    {
      p_modelos: plano.paraGravar,
    },
  );
  if (erroEscrita) throw new Error(`chutes_catalogo_persistencia_falhou: ${erroEscrita.message}`);
  return resultadoValido.parse(resultado);
}
