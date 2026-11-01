/**
 * Contrato estatico do DELETE 0759. Nunca executa SQL nem acessa banco.
 * A estabilidade do predicado NAO autoriza exclusao de codigos legados:
 * exige backup/restauracao, replay isolado e autorizacao independente.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration0759 = "20261023180557_0759_codigos_de_recuperacao_antigos_saem.sql";
const migration0755 = "20261023160010_0755_codigos_de_recuperacao_so_pelo_servidor.sql";
const executor = "scripts/elus-v189-production-upgrade.mjs";

describe("ELUS v1.89 — escopo destrutivo 0759 (somente estatico)", () => {
  it("mantem um unico DELETE limitado aos hashes com tamanho diferente de 32 bytes", () => {
    const sql = readFileSync("supabase/migrations/" + migration0759, "utf8");
    const executable = sql
      .replace(/--[^\r\n]*/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    expect(executable).toBe(
      "delete from public.user_recovery_codes where octet_length(code_hash) <> 32;",
    );
  });

  it("mantem 0755 antes de 0759 no manifesto offline, sem aprovar replay", () => {
    const result = JSON.parse(
      execFileSync(process.execPath, [executor, "manifest"], {
        encoding: "utf8",
        timeout: 20000,
      }),
    );
    expect(result.mode).toBe("offline");
    expect(result.replayClassification.dependencyChains).toContainEqual([
      migration0755,
      migration0759,
    ]);
    expect(result.replayClassification.destructiveMigration).toBe(migration0759);
    expect(result.replayClassification.upstreamBeforeOrAtCut).toHaveLength(11);
    expect(result.replayClassification.upstreamAfterCut).toHaveLength(27);
    expect(result.replayClassification.replayApproved).toBe(false);
  });

  it("bloqueia apply antes da configuracao e conexao produtiva", () => {
    const source = readFileSync(executor, "utf8");
    const block = source.indexOf("if(mode==='apply'){");
    const guard = source.indexOf("sourceGuard();");
    const connection = source.indexOf("const c=new pg.Client(config());");
    expect(block).toBeGreaterThanOrEqual(0);
    expect(guard).toBeGreaterThan(block);
    expect(connection).toBeGreaterThan(guard);
    expect(source).toContain(
      "throw Error('PRODUCTION_APPLY_BLOCKED_PENDING_RESTORE_AND_0759_APPROVAL')",
    );
  });
});
