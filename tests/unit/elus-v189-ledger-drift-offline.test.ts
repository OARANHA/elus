import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const script = join(root, "scripts/elus-v189-ledger-drift-offline.mjs");
const matrix = JSON.parse(readFileSync(
  join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json"), "utf8",
)) as {
  ledger_snapshot: { versions: string[] };
  migrations: Array<{ version: string; logical_number: string }>;
};
const historical = matrix.ledger_snapshot.versions;
const all = [...historical, ...matrix.migrations.map((m) => m.version), "20261026010000"];

function inspect(input: unknown, mode = "inspect") {
  const run = spawnSync(process.execPath, [script, mode], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
    input: JSON.stringify(input),
    env: { PATH: process.env.PATH, NODE_ENV: "test" },
  });
  return { ...run, data: run.status === 0 ? JSON.parse(run.stdout) : null };
}

describe("ELUS v1.89 — comparação offline de recibos não comprova DDL", () => {
  it("impede mudar matriz e hashes SQL em conjunto sem atualizar a âncora aprovada", () => {
    const probe = [
      'import { verifyMatrixSourceBlob } from ' + JSON.stringify(pathToFileURL(script).href) + ';',
      'import { readFileSync } from "node:fs";',
      'const original = readFileSync(' +
        JSON.stringify(join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json")) + ');',
      'verifyMatrixSourceBlob(original);',
      'for (const candidate of [Buffer.concat([original, Buffer.from(" ")]), Buffer.alloc(0)]) {',
      '  try { verifyMatrixSourceBlob(candidate); process.stdout.write("UNSAFE"); process.exitCode = 1; }',
      '  catch (error) {',
      '    if (error.message !== "MATRIX_SOURCE_BLOB_DRIFT") throw error;',
      '    process.stdout.write("BLOCKED\\n");',
      '  }',
      '}',
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", probe], {
      cwd: root, encoding: "utf8", timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("BLOCKED\nBLOCKED\n");
    expect(result.stderr).toBe("");
  });

  it("classifica as 11 versões históricas sem confundir imports ausentes com executados", () => {
    const result = inspect({ versions: historical, publicTables: 191 });
    expect(result.status).toBe(0);
    expect(result.data.decision).toBe("NO_GO");
    expect(result.data.counts.importedPresent).toBe(0);
    expect(result.data.differences.importedMissing).toHaveLength(38);
    expect(result.data.differences.additionalMissing).toEqual(["20261026010000"]);
    expect(result.data.signals.sqlExecutionProven).toBe(false);
  });

  it("não declara prontidão mesmo com 50 recibos e 208 tabelas reportadas", () => {
    const result = inspect({ versions: [...all].reverse(), publicTables: 208 });
    expect(result.status).toBe(0);
    expect(result.data.receiptPattern).toBe("EXPECTED_SET_RECORDED_UNVERIFIED");
    expect(result.data.decision).toBe("NO_GO");
    expect(result.data.counts).toMatchObject({ expected: 50, observedRows: 50, observedUnique: 50 });
    expect(result.data.signals.receipt0759Recorded).toBe(true);
    expect(result.data.signals.receipt0765Recorded).toBe(true);
    expect(result.data.signals.schemaObjectsProven).toBe(false);
    expect(result.data.signals.destructive0759Approved).toBe(false);
    expect(result.data.remainingGates).toContain("READONLY_SCHEMA_AND_0765_FUNCTION_ATTESTATION");
  });

  it("expõe lacunas, duplicatas e versões desconhecidas sem inferir replay", () => {
    const skipped = matrix.migrations[0]!.version;
    const result = inspect({ versions: [...all.filter((v) => v !== skipped), all[0], "20990101000000"] });
    expect(result.status).toBe(0);
    expect(result.data.decision).toBe("NO_GO");
    expect(result.data.differences.importedMissing).toContain(skipped);
    expect(result.data.differences.duplicateVersions).toEqual([all[0]]);
    expect(result.data.differences.unexpected).toEqual(["20990101000000"]);
    expect(result.data.receiptPattern).not.toBe("EXPECTED_SET_RECORDED_UNVERIFIED");
  });

  it("distingue recibos importados fora de prefixo de um replay completo", () => {
    const ordered = matrix.migrations.map((m) => m.version).sort();
    const result = inspect({
      versions: [...historical, ordered[1], "20261026010000"],
      publicTables: 208,
    });
    expect(result.status).toBe(0);
    expect(result.data.receiptPattern).toBe("NONPREFIX_IMPORT_RECEIPTS");
    expect(result.data.counts.importedPresent).toBe(1);
    expect(result.data.differences.importedMissing).toContain(ordered[0]);
    expect(result.data.decision).toBe("NO_GO");
    expect(result.data.signals.sqlExecutionProven).toBe(false);
  });

  it("expõe dependência registrada sem recibo antecedente e separa imports pré/pós-cutoff", () => {
    const required = matrix.migrations.find((m) => m.logical_number === "0755")!.version;
    const result = inspect({ versions: all.filter((v) => v !== required), publicTables: 208 });
    expect(result.status).toBe(0);
    expect(result.data.decision).toBe("NO_GO");
    expect(result.data.receiptPattern).toBe("DEPENDENCY_RECEIPT_GAPS");
    expect(result.data.differences.dependencyReceiptGaps).toContainEqual({ before: "0755", after: "0759" });
    expect(result.data.counts.preCutoffImportsPresent).toBe(11);
    expect(result.data.counts.postCutoffImportsPresent).toBe(26);
    expect(result.data.signals.receipt0759Recorded).toBe(true);
    expect(result.data.signals.destructive0759Approved).toBe(false);
  });

  it("falha fechado quando uma dependência crítica da matriz é substituída", () => {
    // 0755 -> 0760 respeita a ordem cronológica, mas não é a aresta aprovada 0755 -> 0759.
    const probe = [
      `import { reconcileLedgerSnapshot } from ${JSON.stringify(pathToFileURL(script).href)};`,
      'import { readFileSync } from "node:fs";',
      `const matrix = JSON.parse(readFileSync(${JSON.stringify(join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json"))}, "utf8"));`,
      'matrix.known_dependency_edges = matrix.known_dependency_edges.map((edge) =>',
      '  edge.before === "0755" && edge.after === "0759"',
      '    ? { before: "0755", after: "0760" } : edge);',
      'try { reconcileLedgerSnapshot({ versions: [] }, matrix); process.stdout.write("UNSAFE"); process.exitCode = 1; }',
      'catch (error) { if (error.message !== "MATRIX_CONTRACT_DRIFT") throw error; process.stdout.write("MATRIX_CONTRACT_DRIFT"); }',
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", probe], {
      cwd: root, encoding: "utf8", timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("MATRIX_CONTRACT_DRIFT");
    expect(result.stderr).toBe("");
  });

  it("recusa alterações nas três colisões e nos quatro blobs ELUS protegidos", () => {
    const probe = [
      `import { reconcileLedgerSnapshot } from ${JSON.stringify(pathToFileURL(script).href)};`,
      'import { readFileSync } from "node:fs";',
      `const matrix = JSON.parse(readFileSync(${JSON.stringify(join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json"))}, "utf8"));`,
      'const changes = [',
      '  (m) => { const key = Object.keys(m.collision_renames)[0]; m.collision_renames[key] = "supabase/migrations/unsafe.sql"; },',
      '  (m) => { m.protected_elus_migrations[0].git_blob_sha1 = "0".repeat(40); },',
      '];',
      'for (const change of changes) {',
      '  const changed = structuredClone(matrix); change(changed);',
      '  try { reconcileLedgerSnapshot({ versions: [] }, changed); process.stdout.write("UNSAFE"); process.exitCode = 1; }',
      '  catch (error) { if (error.message !== "MATRIX_CONTRACT_DRIFT") throw error; process.stdout.write("MATRIX_CONTRACT_DRIFT\\n"); }',
      '}',
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", probe], {
      cwd: root, encoding: "utf8", timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("MATRIX_CONTRACT_DRIFT\nMATRIX_CONTRACT_DRIFT\n");
    expect(result.stderr).toBe("");
  });

  it("verifica os quatro blobs SQL reais e recusa adulteração ou ausência sem alterar arquivos", () => {
    const probe = [
      `import { verifyProtectedElusMigrationBlobs } from ${JSON.stringify(pathToFileURL(script).href)};`,
      'import { readFileSync } from "node:fs";',
      'import { join } from "node:path";',
      `const root = ${JSON.stringify(root)};`,
      `const matrix = JSON.parse(readFileSync(${JSON.stringify(join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json"))}, "utf8"));`,
      'const readOriginal = (file) => readFileSync(join(root, "supabase/migrations", file));',
      'verifyProtectedElusMigrationBlobs(matrix);',
      'for (const mode of ["altered", "missing"]) {',
      '  try {',
      '    verifyProtectedElusMigrationBlobs(matrix, (file) => {',
      '      if (file.includes("_0689_")) {',
      '        if (mode === "missing") throw new Error("ENOENT");',
      '        return Buffer.from("conteudo alterado");',
      '      }',
      '      return readOriginal(file);',
      '    });',
      '    process.stdout.write("UNSAFE"); process.exitCode = 1;',
      '  } catch (error) {',
      '    if (error.message !== "PROTECTED_ELUS_BLOB_DRIFT") throw error;',
      '    process.stdout.write("PROTECTED_ELUS_BLOB_DRIFT\\n");',
      '  }',
      '}',
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", probe], {
      cwd: root, encoding: "utf8", timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("PROTECTED_ELUS_BLOB_DRIFT\nPROTECTED_ELUS_BLOB_DRIFT\n");
    expect(result.stderr).toBe("");
  });

  it("recusa volume excessivo e contagens que não são inteiros seguros", () => {
    for (const input of [
      { versions: Array(501).fill(all[0]) },
      { versions: all, publicTables: 1.5 },
      { versions: all, publicTables: Number.MAX_SAFE_INTEGER + 1 },
      { versions: all, publicTables: null },
    ]) {
      const result = inspect(input);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("GATE_RED=SANITIZED_SNAPSHOT_REQUIRED");
      expect(result.stdout).toBe("");
    }
  });

  it("rejeita stdin acima de 64 KiB antes de fazer parse do JSON", () => {
    const result = inspect({ versions: all, padding: "x".repeat(65536) });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("GATE_RED=SNAPSHOT_TOO_LARGE");
    expect(result.stdout).toBe("");
    const normal = inspect({ versions: all });
    expect(normal.status).toBe(0);
    expect(normal.data.decision).toBe("NO_GO");
  });

  it("recusa entradas com campos não sanitizados, versões inválidas e modo mutante", () => {
    for (const input of [
      { versions: all, statements: ["SELECT 1"] },
      { versions: ["invalid"] },
      { versions: all, publicTables: -1 },
      { versions: "20261026010000" },
    ]) {
      const result = inspect(input);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("GATE_RED=SANITIZED_SNAPSHOT_REQUIRED");
      expect(result.stdout).toBe("");
    }
    const apply = inspect({ versions: all }, "apply");
    expect(apply.status).not.toBe(0);
    expect(apply.stderr).toContain("GATE_RED=INSPECT_ONLY");
  });

  it("verifica os 38 SQLs importados e falha fechado com arquivo, hash ou caminho alterado", () => {
    const probe = [
      'import { verifyImportedMigrationBlobs } from ' + JSON.stringify(pathToFileURL(script).href) + ';',
      'import { readFileSync } from "node:fs";',
      'import { join } from "node:path";',
      'const root = ' + JSON.stringify(root) + ';',
      'const matrix = JSON.parse(readFileSync(' +
        JSON.stringify(join(root, "docs/integracao/elus-v189-ledger-replay-matrix.json")) + ', "utf8"));',
      'const readOriginal = (file) => readFileSync(join(root, "supabase/migrations", file));',
      'verifyImportedMigrationBlobs(matrix);',
      'for (const mode of ["changed", "missing", "sha", "path"]) {',
      '  const altered = structuredClone(matrix);',
      '  if (mode === "sha") altered.migrations[0].git_blob_sha1 = "0".repeat(40);',
      '  if (mode === "path") altered.migrations[0].file = "../escape.sql";',
      '  const reader = (file) => {',
      '    if (file === matrix.migrations[0].file && mode === "missing") throw new Error("ENOENT");',
      '    if (file === matrix.migrations[0].file && mode === "changed") return Buffer.from("altered");',
      '    return readOriginal(file);',
      '  };',
      '  try { verifyImportedMigrationBlobs(altered, reader); process.stdout.write("UNSAFE"); process.exitCode = 1; }',
      '  catch (error) {',
      '    if (error.message !== "IMPORTED_SQL_BLOB_DRIFT") throw error;',
      '    process.stdout.write("BLOCKED\\n");',
      '  }',
      '}',
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", probe], {
      cwd: root, encoding: "utf8", timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("BLOCKED\n".repeat(4));
    expect(result.stderr).toBe("");
  });

  it("não contém cliente de banco, conexão de rede ou escrita de migrations", () => {
    const source = readFileSync(script, "utf8");
    expect(source).not.toMatch(/from ["']pg["']|new pg\.Client|fetch\(|https?:\/\/|execFile|spawnSync/);
    expect(source).not.toMatch(/INSERT INTO|UPDATE supabase_migrations|DELETE FROM|db push/);
    expect(source).toContain('decision: "NO_GO"');
  });
});
