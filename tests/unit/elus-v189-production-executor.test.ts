import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = "scripts/elus-v189-production-upgrade.mjs";

describe("ELUS v1.89: executor produtivo guardado", () => {
  it("verifica offline os 39 SQLs por SHA Git + SHA256", () => {
    const stdout = execFileSync(process.execPath, [script, "manifest"], {
      encoding: "utf8",
      timeout: 20000,
    });
    const result = JSON.parse(stdout);
    expect(result.mode).toBe("offline");
    expect(result.count).toBe(39);
    expect(result.files).toHaveLength(39);
    expect(new Set(result.files.map((entry: { file: string }) => entry.file))).toHaveLength(39);
    expect(result.files.every((entry: { sha256: string }) => /^[a-f0-9]{64}$/.test(entry.sha256))).toBe(true);
  });

  it("exige assinatura operacional e preserva guardas do ledger e rollback", () => {
    const source = readFileSync(script, "utf8");
    expect(source).toContain("ADMIN_APPROVAL_REQUIRED");
    expect(source).toContain("VERIFIED_BACKUP_REQUIRED");
    expect(source).toContain("ROLLBACK_DIGEST_DRIFT");
    expect(source).toContain("DB_TARGET_MISMATCH");
    expect(source).toContain("NONPREFIX_LEDGER");
    expect(source).toContain("RECEIPT_HASH_DRIFT");
    expect(source).toContain("pg_advisory_lock");
    expect(source).toContain("ROLLBACK");
    expect(source).toContain("MFA_LEGACY_ROWS_REQUIRE_SEPARATE_APPROVAL");
  });
});
