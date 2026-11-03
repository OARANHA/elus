/**
 * ELUS v1.89 — reconstrução offline e sem escrita da baseline candidata.
 *
 * A baseline upstream v1.89.0 foi fixada no commit
 * 6540929d5ef7a951531dda550db0bf54affa516a.
 * Este teste recupera a baseline upstream removendo SOMENTE o bloco local
 * conhecido e exige o blob upstream original, antes de remontar o candidato.
 * Não consulta rede/banco, não executa SQL e não autoriza replay.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const UPSTREAM_BLOB = "07af36ef379f341559318ca5cd2cadc7a5740797";
const ELUS_BLOB = "0269eee11299e0492f489ab6d690eb88b91e30b1";
const ANCHOR = "-- ---- VARREDURA anon:";
const OWN_FILES = [
  "20261019120000_0689_integracoes_erp_vendaerp.sql",
  "20261020120000_0690_org_ai_autonomy_protected.sql",
  "20261020120001_0691_chutes_chat_catalog.sql",
  "20261020230000_0692_chutes_catalog_sync.sql",
  "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql",
] as const;

const candidate = readFileSync(new URL("../../supabase/baseline.sql", import.meta.url), "utf8");

function readOwn(file: string): string {
  return readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
}

function gitBlobSha(content: string): string {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1")
    .update(`blob ${bytes.length}\\0`)
    .update(bytes)
    .digest("hex");
}

function localBlock(): string {
  const four = OWN_FILES.slice(0, 4)
    .map((file) => `-- ELUS exclusivo: ${file}\\n${readOwn(file)}\\n`)
    .join("");
  return (
    four +
    "\\n-- ---- ELUS 0765: complemento local de rotacao MFA (fora do lote upstream v1.89) ----\\n" +
    readOwn(OWN_FILES[4]) +
    "\\n"
  );
}

function reconstructUpstream(): { upstream: string; insertion: string; at: number } {
  const insertion = localBlock();
  const at = candidate.indexOf(insertion);
  expect(at).toBeGreaterThan(-1);
  expect(candidate.indexOf(insertion, at + 1)).toBe(-1);
  return {
    upstream: candidate.slice(0, at) + candidate.slice(at + insertion.length),
    insertion,
    at,
  };
}

describe("ELUS v1.89: reconstrução independente da baseline (offline)", () => {
  it("recupera o upstream fixado removendo apenas os cinco SQLs locais", () => {
    const { upstream, at } = reconstructUpstream();
    expect(upstream.indexOf(ANCHOR)).toBe(at);
    expect(upstream.indexOf(ANCHOR, at + 1)).toBe(-1);
    expect(Buffer.byteLength(upstream, "utf8")).toBe(3_364_899);
    expect(gitBlobSha(upstream)).toBe(UPSTREAM_BLOB);
  });

  it("remonta byte a byte o candidato sem truncagem e sem alterar o upstream", () => {
    const { upstream, insertion, at } = reconstructUpstream();
    const rebuilt = upstream.slice(0, at) + insertion + upstream.slice(at);
    expect(rebuilt).toBe(candidate);
    expect(Buffer.byteLength(rebuilt, "utf8")).toBe(3_393_613);
    expect(gitBlobSha(rebuilt)).toBe(ELUS_BLOB);
  });
});
