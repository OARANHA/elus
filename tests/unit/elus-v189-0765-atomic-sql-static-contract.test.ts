/**
 * Contrato estatico da migration adicional 0765 (rotacao MFA).
 * Nao executa SQL, nao acessa banco e nao comprova atomicidade, ACL efetiva
 * ou existencia da RPC em producao. Recibo 0765 != objeto instalado.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../supabase/migrations/20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql",
    import.meta.url,
  ),
  "utf8",
);
const executable = sql.replace(/--[^\r\n]*/g, "").replace(/\s+/g, " ").trim();

describe("ELUS v1.89 — contrato SQL estatico da RPC 0765", () => {
  it("mantem SECURITY DEFINER com search_path vazio e EXECUTE somente de servico", () => {
    expect(executable).toMatch(/SECURITY DEFINER SET search_path = ''/i);
    expect(executable).toMatch(
      /REVOKE ALL ON FUNCTION public\.fn_elus_rotacionar_codigos_recuperacao\(uuid, text\[\]\) FROM PUBLIC, anon, authenticated;/i,
    );
    expect(executable).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.fn_elus_rotacionar_codigos_recuperacao\(uuid, text\[\]\) TO service_role;/i,
    );
  });

  it("recusa entrada parcial, hash fora do formato e hashes repetidos", () => {
    expect(executable).toMatch(/p_user_id IS NULL OR p_hashes_hex IS NULL/i);
    expect(executable).toMatch(/pg_catalog\.cardinality\(p_hashes_hex\) <> 10/i);
    expect(executable).toContain("c.hex_hash !~ '^[0-9a-f]{64}$'");
    expect(executable).toMatch(/count\(DISTINCT c\.hex_hash\).*?<> 10/i);
    expect(executable).toMatch(/RAISE EXCEPTION 'invalid recovery rotation input'/i);
    expect(executable).toMatch(/RAISE EXCEPTION 'invalid recovery hashes'/i);
  });

  it("mantem lock transacional, DELETE limitado ao usuario e 10 insercoes verificadas", () => {
    expect(executable).toMatch(/pg_catalog\.pg_advisory_xact_lock\(/i);
    expect(executable).not.toMatch(/\bpg_advisory_lock\(/i);
    expect(executable.match(/\bDELETE\s+FROM\b/gi)).toHaveLength(1);
    expect(executable).toMatch(
      /DELETE FROM public\.user_recovery_codes WHERE user_id = p_user_id;/i,
    );
    expect(executable.match(/\bINSERT\s+INTO\b/gi)).toHaveLength(1);
    expect(executable).toMatch(
      /INSERT INTO public\.user_recovery_codes \(user_id, code_hash\) SELECT p_user_id, pg_catalog\.decode\(c\.hex_hash, 'hex'\)/i,
    );
    expect(executable).toMatch(/GET DIAGNOSTICS v_inseridos = ROW_COUNT;/i);
    expect(executable).toMatch(/IF v_inseridos <> 10 THEN RAISE EXCEPTION/i);
  });
});
