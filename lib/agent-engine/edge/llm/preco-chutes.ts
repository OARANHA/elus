/**
 * Tarifa nativa Chutes: o id sozinho não identifica o preço de um roteador.
 * A linha exata (provider, model_id) é a única autoridade. Falha de leitura,
 * preço ausente, inválido ou depreciado recusam ANTES do egress.
 * O snapshot retornado também calcula o custo após a chamada, impedindo
 * que pricing.ts ou ai_pricing de outro gateway substituam a tarifa Chutes.
 */
import type pg from "pg";
import type { TokenUsage } from "./pricing";
import { custoComPrecoDaInstalacao } from "./pricing-do-catalogo";

export interface TarifaChutes {
  entradaCentsPorMilhao: number;
  saidaCentsPorMilhao: number;
}

export async function resolverTarifaChutes(
  db: Pick<pg.Pool, "query">,
  model: string,
): Promise<TarifaChutes> {
  const { rows } = await db.query<{
    input_price_per_million_cents: number | string | null;
    output_price_per_million_cents: number | string | null;
  }>(
    `select input_price_per_million_cents, output_price_per_million_cents
       from public.ai_models
      where provider = 'chutes' and model_id = $1 and deprecated_at is null
      limit 2`,
    [model],
  );
  if (rows.length !== 1) throw new Error("chutes_model_without_verified_pricing");
  const row = rows[0]!;
  if (
    row.input_price_per_million_cents == null ||
    row.output_price_per_million_cents == null
  ) throw new Error("chutes_model_without_verified_pricing");
  const entrada = Number(row.input_price_per_million_cents);
  const saida = Number(row.output_price_per_million_cents);
  if (!Number.isFinite(entrada) || !Number.isFinite(saida) || entrada < 0 || saida < 0) {
    throw new Error("chutes_model_without_verified_pricing");
  }
  return { entradaCentsPorMilhao: entrada, saidaCentsPorMilhao: saida };
}

export function custoChutesCents(tarifa: TarifaChutes, usage: TokenUsage): number {
  // Sem desconto de cache presumido: catálogo Chutes só comprova entrada/saída.
  return custoComPrecoDaInstalacao({ ...tarifa, origem: "catalogo" }, usage);
}
