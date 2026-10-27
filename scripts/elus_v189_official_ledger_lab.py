#!/usr/bin/env python3
"""ELUS v1.89: integração do ledger OFICIAL em clone local sem rede.

Reutiliza o manifesto e SQLs pinados pelo runner já testado. NÃO é executor de
produção. Só permite banco descartável, nome fixo, imagem fixa e Docker network=none.
A execução produtiva continua exigindo autorização e revisão operacional próprias.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys

REPO = Path(__file__).resolve().parents[1]
CONTAINER = "elus-supabase-restore-test"
DATABASE = "elus_upgrade_official_ledger_v189"
SOURCE = "elus_restore_v3"
EXPECTED_ANCESTOR = "19938ef296b110a60d66265e349930e2573cc31d"
ACK = "isolated-official-ledger-39"
HISTORICAL = (
    "20261018200431", "20261018204508", "20261018204837",
    "20261018204851", "20261018204924", "20261018204939",
    "20261018204955", "20261019204449", "20261021025530",
    "20261021025551", "20261021025613",
)
HISTORICAL_NAMES = (
    "elus_v185_preparar_extensoes_92d37f6",
    "elus_v185_baseline_92d37f6_p01_of_06",
    "elus_v185_baseline_92d37f6_p02_of_06",
    "elus_v185_baseline_92d37f6_p03_of_06",
    "elus_v185_baseline_92d37f6_p04_of_06",
    "elus_v185_baseline_92d37f6_p05_of_06",
    "elus_v185_baseline_92d37f6_p06_of_06",
    "integracoes_erp_vendaerp_0689",
    "elus_0690_org_ai_autonomy_protected",
    "elus_0691_chutes_chat_catalog",
    "elus_0692_chutes_catalog_sync",
)

EXTRA = "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql"
EXTRA_BLOB = "a05333f5b12b78c334181887f089b39398d9aa50"


def fail(reason: str) -> None:
    raise SystemExit("GATE_RED=" + reason)


def run(args: list[str], data: bytes | None = None) -> bytes:
    result = subprocess.run(args, input=data, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, check=False)
    if result.returncode:
        fail("COMMAND_FAILED")
    return result.stdout


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def query(sql: str) -> str:
    return run(["docker", "exec", "-i", CONTAINER, "psql", "-X", "-q", "-t",
                "-A", "-v", "ON_ERROR_STOP=1", "-U", "supabase_admin", "-d",
                DATABASE], sql.encode()).decode().strip()


def guard() -> None:
    if os.environ.get("ELUS_V189_LAB_DB") != DATABASE:
        fail("EXPLICIT_LAB_DB_REQUIRED")
    if run(["docker", "inspect", "-f", "{{.HostConfig.NetworkMode}}", CONTAINER]).decode().strip() != "none":
        fail("NETWORK_NOT_ISOLATED")
    if run(["docker", "inspect", "-f", "{{.Config.Image}}", CONTAINER]).decode().strip() != "supabase/postgres:17.6.1.136":
        fail("IMAGE_MISMATCH")
    if subprocess.run(["git", "-C", str(REPO), "merge-base", "--is-ancestor",
                       EXPECTED_ANCESTOR, "HEAD"], stdout=subprocess.DEVNULL,
                      stderr=subprocess.DEVNULL, check=False).returncode:
        fail("SOURCE_ANCESTRY_MISMATCH")
    if run(["git", "-C", str(REPO), "status", "--porcelain"]).strip():
        fail("WORKTREE_DIRTY")


def manifest() -> list[tuple[str, str, bytes]]:
    source = (REPO / "tests/unit/elus-v189-import-ledger-integrity.test.ts").read_text()
    imported = source.split("const IMPORTADAS:", 1)[1].split("const ELUS_PROPRIAS:", 1)[0]
    pairs = re.findall(r'"(\d{14}_[^"]+\.sql)":\s*"([a-f0-9]{40})"', imported)
    if len(pairs) != 38:
        fail("MANIFEST_COUNT")
    pairs.append((EXTRA, EXTRA_BLOB))
    result = []
    for name, blob in sorted(pairs):
        content = (REPO / "supabase/migrations" / name).read_bytes()
        observed = hashlib.sha1(b"blob " + str(len(content)).encode() + b"\x00" + content).hexdigest()
        if observed != blob:
            fail("BLOB_MISMATCH")
        if re.search(rb"(?im)^\s*(?:BEGIN\s*;|COMMIT\s*;|ROLLBACK\s*;|START\s+TRANSACTION\b|VACUUM\b|ALTER\s+SYSTEM\b)", content):
            fail("NONTRANSACTIONAL_MIGRATION")
        result.append((name, hashlib.sha256(content).hexdigest(), content))
    if len(result) != 39 or len({n[:14] for n, _, _ in result}) != 39:
        fail("VERSION_COLLISION")
    return result


def clone_if_absent() -> None:
    count = run(["docker", "exec", CONTAINER, "psql", "-X", "-t", "-A",
                 "-U", "supabase_admin", "-d", "postgres", "-c",
                 "SELECT count(*) FROM pg_database WHERE datname=" + sql_literal(DATABASE)]).decode().strip()
    if count == "0":
        run(["docker", "exec", CONTAINER, "createdb", "-U", "supabase_admin",
             "--template=" + SOURCE, "--owner=supabase_admin", DATABASE])
        print("CLONE_CREATED")
    elif count != "1":
        fail("UNEXPECTED_DATABASE_STATE")


def rows() -> list[tuple[str, str]]:
    records = query("SELECT version || '|' || coalesce(name,'') FROM supabase_migrations.schema_migrations ORDER BY version")
    return [tuple(line.split("|", 1)) for line in records.splitlines() if line]


def progress(items: list[tuple[str, str, bytes]]) -> int:
    actual = rows()
    historical = [(v, n) for v, n in actual if v in HISTORICAL]
    if [v for v, _ in historical] != list(HISTORICAL):
        fail("HISTORY_DRIFT")
    if historical != list(zip(HISTORICAL, HISTORICAL_NAMES)):
        fail("HISTORY_NAME_DRIFT")
    if len(actual) < 11 or len(actual) > 50:
        fail("LEDGER_COUNT_DRIFT")
    desired = [(name[:14], name[15:-4]) for name, _, _ in items]
    # Official ledger sorts chronologically, including 11 imports predating
    # the last historical record; never use a cutoff-based suffix comparison.
    seen = [(v, n) for v, n in actual if v not in HISTORICAL]
    if len(seen) != len(set(v for v, _ in seen)):
        fail("DUPLICATE_VERSION")
    known = {v: n for v, n in desired}
    if any(v not in known or known[v] != n for v, n in seen):
        fail("UNKNOWN_OFFICIAL_VERSION")
    prefix = {v for v, _ in desired[:len(seen)]}
    if {v for v, _ in seen} != prefix:
        fail("NONPREFIX_REPLAY")
    return len(seen)


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in ("preflight", "apply", "verify"):
        fail("USAGE")
    guard()
    items = manifest()
    if sys.argv[1] == "preflight":
        print("MANIFEST_GREEN=39")
        print("PRODUCTION_ACCESS=NONE")
        return
    if sys.argv[1] == "apply":
        if os.environ.get("ELUS_V189_LAB_ACK") != ACK:
            fail("ACK_REQUIRED")
        clone_if_absent()
    done = progress(items)
    if sys.argv[1] == "verify":
        print("OFFICIAL_LEDGER_VERIFIED=" + str(done) + "/39")
        return
    print("RESUME_FROM=" + str(done))
    for i in range(done, len(items)):
        name, sha, sql = items[i]
        version = name[:14]
        shortname = name[15:-4]
        # SQL and its official Supabase registration are one transaction.
        # A transaction-scoped advisory lock provides DB-side serialization.
        statement = (
            "BEGIN;\nSELECT pg_advisory_xact_lock(76050002);\n"
            "DO $gate$ BEGIN IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version="
            + sql_literal(version) + ") THEN RAISE EXCEPTION 'duplicate version'; END IF; END $gate$;\n"
        ).encode()
        receipt = (
            "\nINSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ("
            + sql_literal(version) + "," + sql_literal(shortname)
            + ",ARRAY[" + sql_literal(sql.decode("utf8")) + "]::text[]);\nCOMMIT;\n"
        ).encode()
        result = subprocess.run(["docker", "exec", "-i", CONTAINER, "psql", "-X", "-q",
                                 "-v", "ON_ERROR_STOP=1", "-U", "supabase_admin", "-d",
                                 DATABASE], input=statement + sql + receipt,
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        if result.returncode:
            fail("MIGRATION_OR_OFFICIAL_LEDGER_FAILED_" + str(i+1))
        if progress(items) != i + 1:
            fail("OFFICIAL_RECEIPT_MISMATCH")
        print("APPLIED=" + str(i+1) + "/39")
    print("OFFICIAL_LEDGER_GREEN=39")


if __name__ == "__main__":
    main()
