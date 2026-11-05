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
      "items_39 = [(f'20261022{i:06d}_migration_{i:02d}.sql', '', f'sql-{i}'.encode()) for i in range(39)]",
      "records_39 = historical + [(name[:14], name[15:-4]) for name, _, _ in items_39]",
      "check(records_39, '39', desired=items_39)",
      "check(records_39 + [('20261023999999', 'extra')], 'GATE_RED=LEDGER_COUNT_DRIFT', desired=items_39)",
      "print('OFFICIAL_LEDGER_UNIT_GREEN=14')",
    ].join("\n");
    const output = execFileSync("python3", ["-c", program, script], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test", PYTHONDONTWRITEBYTECODE: "1" },
    });
    expect(output.trim()).toBe("OFFICIAL_LEDGER_UNIT_GREEN=14");
  });

  it("recusa drift dos 11 statements historicos sem ler SQL real", () => {
    const program = [
      "import importlib.util, sys",
      "spec = importlib.util.spec_from_file_location('ledger_lab', sys.argv[1])",
      "m = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(m)",
      "sqls = [f'SELECT {i}; -- fixture'.encode() for i in range(11)]",
      "md5s = [m.hashlib.md5(sql).hexdigest() for sql in sqls]",
      "m.PRIVATE_HISTORICAL_FINGERPRINTS = {v:(len(sqls[i]),m.hashlib.md5(md5s[i].encode('ascii')).hexdigest()) for i,v in enumerate(m.HISTORICAL[:7])}",
      "m.ELUS_HISTORICAL_FINGERPRINTS = {v:(len(sqls[i+7]),md5s[i+7]) for i,v in enumerate(m.HISTORICAL[7:])}",
      "lines = [f'{v}|1|{len(sqls[i])}|{md5s[i]}' for i,v in enumerate(m.HISTORICAL)]",
      "def check(data, expected):",
      "    def fake_query(sql):",
      "        assert sql.lstrip().startswith('SELECT ')",
      "        assert 'FROM supabase_migrations.schema_migrations' in sql",
      "        return '\\n'.join(data)",
      "    m.query = fake_query",
      "    try:",
      "        m.verify_historical_statements()",
      "        actual = 'PASS'",
      "    except SystemExit as exc:",
      "        actual = str(exc)",
      "    assert actual == expected, (actual, expected)",
      "check(lines, 'PASS')",
      "red = 'GATE_RED=HISTORY_STATEMENT_DRIFT'",
      "check([lines[0].replace(md5s[0], '0'*32)] + lines[1:], red)",
      "check(lines[:8] + [lines[8].replace(md5s[8], '0'*32)] + lines[9:], red)",
      "check([lines[0].replace('|1|', '|2|')] + lines[1:], red)",
      "check([lines[0].replace(str(len(sqls[0])), '999')] + lines[1:], red)",
      "check(lines[1:], red)",
      "check(lines + [lines[0]], red)",
      "check(lines + ['20990101000000|1|8|' + '0'*32], red)",
      "check([lines[0].rsplit('|',1)[0] + '|invalid'] + lines[1:], red)",
      "print('HISTORICAL_STATEMENTS_UNIT_GREEN=9')",
    ].join("\n");
    const output = execFileSync("python3", ["-c", program, script], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test", PYTHONDONTWRITEBYTECODE: "1" },
    });
    expect(output.trim()).toBe("HISTORICAL_STATEMENTS_UNIT_GREEN=9");
  });
  it("bloqueia metacomandos psql sem executar SQL e preserva os 39 blobs pinados", () => {
    const program = "import importlib.util, sys\nspec = importlib.util.spec_from_file_location('ledger_lab', sys.argv[1])\nm = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\nallowed = [\n    b'SELECT 1;',\n    rb\"SELECT '\\!';\",\n    rb\"SELECT E'\\\\!';\",\n    rb\"DO $body$ BEGIN RAISE NOTICE '\\!'; END $body$;\",\n    b'-- \\\\! ignored\\nSELECT 1;',\n    rb'/* \\! ignored /* nested */ */ SELECT 1;',\n    rb'SELECT \"\\field\" FROM t;',\n]\nblocked = [\n    rb'\\! echo foo',\n    rb'SELECT 1 \\gexec',\n    rb'\\copy x from y',\n    rb'SELECT 1; \\connect postgres',\n    rb'/* comment */ \\i /tmp/x.sql',\n]\nfor sql in allowed:\n    m.reject_psql_meta_commands(sql)\nfor sql in blocked:\n    try:\n        m.reject_psql_meta_commands(sql)\n    except SystemExit as exc:\n        assert str(exc) == 'GATE_RED=PSQL_META_COMMAND', str(exc)\n    else:\n        raise AssertionError('PSQL_META_COMMAND_NOT_BLOCKED')\nassert len(m.manifest()) == 39\nprint('PSQL_GUARD_GREEN=12;MANIFEST_GREEN=39')";
    const output = execFileSync("python3", ["-c", program, script], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 20000,
      env: { PATH: process.env.PATH, NODE_ENV: "test", PYTHONDONTWRITEBYTECODE: "1" },
    });
    expect(output.trim()).toBe("PSQL_GUARD_GREEN=12;MANIFEST_GREEN=39");
  });

  it("rejeita SQL incompatível com transação antes do replay oficial", () => {
    const program = [
      "import importlib.util, sys",
      "spec = importlib.util.spec_from_file_location('ledger_lab', sys.argv[1])",
      "m = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(m)",
      "allowed = [b'CREATE INDEX idx ON t(id);', b'CREATE UNIQUE INDEX idx ON t(id);', b'REINDEX INDEX idx;', b'REINDEX (VERBOSE) INDEX idx;', b'SELECT 1;']",
      "blocked = [",
      "    b'CREATE INDEX CONCURRENTLY idx ON t(id);',",
      "    b'CREATE UNIQUE INDEX CONCURRENTLY idx ON t(id);',",
      "    b'DROP INDEX CONCURRENTLY idx;',",
      "    b'REINDEX INDEX CONCURRENTLY idx;',",
      "    b'CREATE DATABASE example;',",
      "    b'DROP DATABASE example;',",
      "    b'CREATE TABLESPACE ts LOCATION \\'/tmp\\';',",
      "    b'DROP TABLESPACE ts;',",
      "    b'REINDEX (CONCURRENTLY) INDEX idx;',",
      "    b'REINDEX (VERBOSE, CONCURRENTLY) TABLE t;',",
      "    b'REINDEX (CONCURRENTLY, VERBOSE) SCHEMA public;',",
      "]",
      "for sql in allowed:",
      "    m.reject_nontransactional_migration(sql)",
      "for sql in blocked:",
      "    try:",
      "        m.reject_nontransactional_migration(sql)",
      "    except SystemExit as exc:",
      "        assert str(exc) == 'GATE_RED=NONTRANSACTIONAL_MIGRATION', str(exc)",
      "    else:",
      "        raise AssertionError('UNBLOCKED_NONTRANSACTIONAL_SQL')",
      "print('TRANSACTION_GUARD_GREEN=16')",
    ].join("\n");
    const output = execFileSync("python3", ["-c", program, script], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 15000,
      env: { PATH: process.env.PATH, NODE_ENV: "test", PYTHONDONTWRITEBYTECODE: "1" },
    });
    expect(output.trim()).toBe("TRANSACTION_GUARD_GREEN=16");
  });
});
