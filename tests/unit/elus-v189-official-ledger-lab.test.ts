/**
 * Exercita o gate do ledger OFICIAL em memória, sem Docker, SQL ou rede.
 * O teste importa o módulo Python e substitui somente a leitura de linhas.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const script = join(process.cwd(), "scripts/elus_v189_official_ledger_lab.py");

describe("ELUS v189: histórico do ledger oficial no laboratório", () => {
  it("recusa drift de nomes, versões e replay fora de prefixo", () => {
    const program = [
      "import importlib.util, sys",
      "spec = importlib.util.spec_from_file_location('ledger_lab', sys.argv[1])",
      "m = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(m)",
      "historical = list(zip(m.HISTORICAL, m.HISTORICAL_NAMES))",
      "items = [('20261022000000_alpha.sql', '', b''), ('20261023000000_beta.sql', '', b'')]",
      "def check(records, expected, desired=items, corrupt=False, fragmented=False, wrong_length=False):",
      "    m.rows = lambda: records",
      "    def fingerprint(v):",
      "        sql = next(item[2] for item in desired if item[0][:14] == v)",
      "        return '|'.join([v, '2' if fragmented else '1', str(len(sql) + (1 if wrong_length else 0)), '0'*32 if corrupt else m.hashlib.md5(sql).hexdigest()])",
      "    m.query = lambda _sql: '\\n'.join(fingerprint(v) for v, _ in records if v not in m.HISTORICAL)",
      "    try:",
      "        result = m.progress(desired)",
      "        actual = str(result)",
      "    except SystemExit as exc:",
      "        actual = str(exc)",
      "    assert actual == expected, (actual, expected)",
      "check(historical, '0')",
      "check(historical + [('20261022000000', 'alpha')], '1')",
      "check(historical + [('20261022000000', 'alpha'), ('20261023000000', 'beta')], '2')",
      "check(historical + [('20261022000000', 'wrong')], 'GATE_RED=UNKNOWN_OFFICIAL_VERSION')",
      "check(historical + [('20261022000000', 'alpha'), ('20261022000000', 'alpha')], 'GATE_RED=DUPLICATE_VERSION')",
      "check(historical + [('20261022000000', 'alpha')], 'GATE_RED=OFFICIAL_STATEMENTS_DRIFT', corrupt=True)",
      "check(historical + [('20261022000000', 'alpha')], 'GATE_RED=OFFICIAL_STATEMENTS_DRIFT', fragmented=True)",
      "check(historical + [('20261022000000', 'alpha')], 'GATE_RED=OFFICIAL_STATEMENTS_DRIFT', wrong_length=True)",
      "bad_name = historical.copy()",
      "bad_name[7] = (bad_name[7][0], 'alterado')",
      "check(bad_name, 'GATE_RED=HISTORY_NAME_DRIFT')",
      "check(historical[:-1], 'GATE_RED=HISTORY_DRIFT')",
      "check(historical + [('20261024000000', 'unknown')], 'GATE_RED=UNKNOWN_OFFICIAL_VERSION')",
      "check(historical + [('20261023000000', 'beta')], 'GATE_RED=NONPREFIX_REPLAY')",
      "print('OFFICIAL_LEDGER_UNIT_GREEN=12')",
    ].join("\n");
    const output = execFileSync("python3", ["-c", program, script], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test", PYTHONDONTWRITEBYTECODE: "1" },
    });
    expect(output.trim()).toBe("OFFICIAL_LEDGER_UNIT_GREEN=12");
  });
});
