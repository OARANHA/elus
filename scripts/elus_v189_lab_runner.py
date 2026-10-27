#!/usr/bin/env python3
"""ELUS v1.89: runner de ensaio, SOMENTE clone local isolado (nunca produção).

Uso: python3 scripts/elus_v189_lab_runner.py preflight|apply|verify
Exige ELUS_V189_LAB_ACK=isolated-clone-39 na execução apply.
Atenção: não substitui o ledger oficial supabase_migrations e não é deploy.
"""
from __future__ import annotations

import hashlib
import fcntl
import os
from pathlib import Path
import re
import subprocess
import sys
import time

REPO = Path(__file__).resolve().parents[1]
CONTAINER = "elus-supabase-restore-test"
DATABASE = os.environ.get("ELUS_V189_LAB_DB", "")
ALLOWED_DATABASES = {"elus_upgrade_runner_v189_concurrency"}
SOURCE = "elus_restore_v3"
EXPECTED_SHA = "19938ef296b110a60d66265e349930e2573cc31d"
LEDGER = "elus_upgrade_gate.executions"
EXTRA = "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql"
EXTRA_BLOB = "a05333f5b12b78c334181887f089b39398d9aa50"
ACK = "isolated-clone-39"


def call(argv: list[str], *, data: bytes | None = None) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(argv, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)


def fail(reason: str) -> None:
    raise SystemExit("GATE_RED=" + reason)


def checked(argv: list[str], *, data: bytes | None = None) -> bytes:
    result = call(argv, data=data)
    if result.returncode:
        fail("COMMAND_FAILED")  # Never leak SQL, stderr or customer data.
    return result.stdout


def db(sql: str, *, single: bool = False) -> str:
    args = ["docker", "exec", "-i", CONTAINER, "psql", "-X", "-q", "-t", "-A",
            "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "supabase_admin", "-d", DATABASE]
    if single:
        args.append("--single-transaction")
    return checked(args, data=sql.encode()).decode().strip()


def sql_literal(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def check_environment() -> None:
    if DATABASE not in ALLOWED_DATABASES:
        fail("DATABASE_NOT_ALLOWLISTED")
    if not re.fullmatch(r"elus_upgrade_runner_v189_concurrency", DATABASE):
        fail("DATABASE_INVALID")
    if call(["git", "-C", str(REPO), "merge-base", "--is-ancestor", EXPECTED_SHA, "HEAD"]).returncode:
        fail("SOURCE_ANCESTRY_MISMATCH")
    status = checked(["git", "-C", str(REPO), "status", "--porcelain"]).decode().splitlines()
    allowed = "?? scripts/elus_v189_lab_runner.py"
    if any(line != allowed for line in status):
        fail("WORKTREE_DIRTY")
    if checked(["docker", "inspect", "-f", "{{.HostConfig.NetworkMode}}", CONTAINER]).decode().strip() != "none":
        fail("NETWORK_NOT_ISOLATED")
    image_name = checked(["docker", "inspect", "-f", "{{.Config.Image}}", CONTAINER]).decode().strip()
    if image_name != "supabase/postgres:17.6.1.136":
        fail("IMAGE_MISMATCH")


def migrations() -> list[tuple[str, str, bytes]]:
    src = (REPO / "tests/unit/elus-v189-import-ledger-integrity.test.ts").read_text()
    segment = src.split("const IMPORTADAS:", 1)[1].split("const ELUS_PROPRIAS:", 1)[0]
    items = re.findall(r'"(\d{14}_[^"]+\.sql)":\s*"([0-9a-f]{40})"', segment)
    if len(items) != 38 or len(set(n for n, _ in items)) != 38:
        fail("MANIFEST_INVALID")
    items.append((EXTRA, ""))
    paths = []
    for name, expected_blob in sorted(items):
        path = REPO / "supabase/migrations" / name
        data = path.read_bytes()
        blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        if blob != (expected_blob or EXTRA_BLOB):
            fail("BLOB_MISMATCH")
        # Transaction-control statements in migrations require manual review.
        # Conservative: matches commands beginning on separate lines, including in comments.
        if re.search(rb"(?im)^\s*(?:BEGIN\s*;|COMMIT\s*;|ROLLBACK\s*;|START\s+TRANSACTION\b|VACUUM\b|CREATE\s+DATABASE\b|ALTER\s+SYSTEM\b)", data):
            fail("NONTRANSACTIONAL_MIGRATION")
        paths.append((name, hashlib.sha256(data).hexdigest(), data))
    if len(paths) != 39:
        fail("COUNT_INVALID")
    return paths


def clone_if_absent() -> None:
    # Never adopt an existing unrelated DB and never overwrite one.
    sql = "SELECT count(*) FROM pg_database WHERE datname=" + sql_literal(DATABASE) + ";"
    exists = checked(["docker", "exec", CONTAINER, "psql", "-X", "-t", "-A", "-U", "supabase_admin", "-d", "postgres", "-c", sql]).decode().strip()
    if exists == "0":
        checked(["docker", "exec", CONTAINER, "createdb", "-U", "supabase_admin",
                 "--template=" + SOURCE, "--owner=supabase_admin", DATABASE])
        print("CLONE_CREATED")
    elif exists != "1":
        fail("CLONE_QUERY_INVALID")


def ensure_ledger() -> None:
    db("""BEGIN;
    CREATE SCHEMA IF NOT EXISTS elus_upgrade_gate;
    CREATE TABLE IF NOT EXISTS elus_upgrade_gate.executions (
      version text PRIMARY KEY,
      file_name text NOT NULL UNIQUE,
      sha256 char(64) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
    );
    COMMIT;""")


HISTORICAL_VERSIONS = (
    "20261018200431", "20261018204508", "20261018204837",
    "20261018204851", "20261018204924", "20261018204939",
    "20261018204955", "20261019204449", "20261021025530",
    "20261021025551", "20261021025613",
)


def assert_history() -> None:
    versions = db("SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;")
    if tuple(versions.splitlines()) != HISTORICAL_VERSIONS:
        fail("HISTORY_CHANGED")


def assert_ledger(manifest: list[tuple[str, str, bytes]]) -> int:
    rows = db("SELECT version || '|' || file_name || '|' || sha256 FROM " + LEDGER + " ORDER BY version;")
    known = {name[:14]: (name, sha) for name, sha, _ in manifest}
    found: set[str] = set()
    for line in rows.splitlines() if rows else []:
        version, name, sha = line.split("|", 2)
        if version not in known or known[version] != (name, sha):
            fail("LEDGER_DRIFT")
        found.add(version)
    order = [name[:14] for name, _, _ in manifest]
    if found != set(order[:len(found)]):
        fail("NONPREFIX_REPLAY")
    return len(found)


def apply(manifest: list[tuple[str, str, bytes]]) -> None:
    if os.environ.get("ELUS_V189_LAB_ACK") != ACK:
        fail("ACK_REQUIRED")
    # Exclusive lock across all local runner invocations.  A second process fails
    # closed instead of replaying from a stale snapshot.  The per-file PostgreSQL
    # advisory transaction lock remains as defense in depth.
    lockpath = Path("/root/elus-backups/elus-v189-concurrency.lock")
    if not lockpath.parent.is_dir() or lockpath.is_symlink():
        fail("LOCK_DIRECTORY_UNAVAILABLE")
    lockfd = os.open(str(lockpath), os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        try:
            fcntl.flock(lockfd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            fail("CONCURRENT_RUNNER_BLOCKED")
        _apply_locked(manifest)
    finally:
        os.close(lockfd)


def _apply_locked(manifest: list[tuple[str, str, bytes]]) -> None:
    hold = os.environ.get("ELUS_V189_TEST_HOLD_LOCK_SECONDS", "")
    if hold:
        if not hold.isdigit() or not 1 <= int(hold) <= 15:
            fail("BAD_LOCK_HOLD")
        time.sleep(int(hold))
    clone_if_absent()
    assert_history()
    # A copied source must match the proven 191-table v1.85 baseline.
    existing_gate = db("SELECT to_regclass('elus_upgrade_gate.executions') IS NOT NULL;")
    if existing_gate == "f":
        tables = db("SELECT count(*) FROM pg_tables WHERE schemaname='public';")
        if tables != "191":
            fail("UNEXPECTED_START_SCHEMA")
    ensure_ledger()
    count = assert_ledger(manifest)
    print("RESUME_FROM=" + str(count))
    inject_at = os.environ.get("ELUS_V189_LAB_TEST_STOP_AFTER", "")
    if inject_at:
        if DATABASE != "elus_upgrade_runner_v189_concurrency" or not inject_at.isdigit() or not 1 <= int(inject_at) <= 38:
            fail("BAD_FAULT_INJECTION")
        if count >= int(inject_at):
            fail("EXPECTED_STOP_AFTER_" + inject_at)
    rollback_at = os.environ.get("ELUS_V189_LAB_TEST_ROLLBACK_AT", "")
    if rollback_at and (DATABASE != "elus_upgrade_runner_v189_concurrency"
                        or not rollback_at.isdigit() or not 1 <= int(rollback_at) <= 39):
        fail("BAD_ROLLBACK_INJECTION")
    for i in range(count, 39):
        name, sha, content = manifest[i]
        version = name[:14]
        # One dedicated postgres connection and one transaction per file.
        # Advisory transaction lock protects this transaction from concurrent runner calls.
        # INSERT and SQL are atomic: a SQL failure leaves no success receipt.
        statement = ("BEGIN;\nSELECT pg_advisory_xact_lock(76050001);\n"
                     "DO $gate$ BEGIN IF EXISTS (SELECT 1 FROM " + LEDGER + " WHERE version=" + sql_literal(version) + ") "
                     "THEN RAISE EXCEPTION 'duplicate gate execution' USING ERRCODE='23505'; END IF; END $gate$;\n").encode()
        receipt = ("\nINSERT INTO " + LEDGER + "(version,file_name,sha256) VALUES ("
                   + ",".join(map(sql_literal, [version, name, sha])) + ");\nCOMMIT;\n").encode()
        argv = ["docker", "exec", "-i", CONTAINER, "psql", "-X", "-q",
                "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "supabase_admin", "-d", DATABASE]
        inject_rollback = i + 1 == int(rollback_at) if rollback_at else False
        if inject_rollback:
            content += b"\nDO $elus_gate_fault$ BEGIN RAISE EXCEPTION 'lab rollback injection' USING ERRCODE='P0001'; END $elus_gate_fault$;\n"
        result = call(argv, data=statement + content + receipt)
        if result.returncode:
            if inject_rollback:
                fail("EXPECTED_ROLLBACK_AT_" + str(i + 1))
            fail("MIGRATION_FAILED_AT_" + str(i + 1))
        assert_history()
        if assert_ledger(manifest) != i + 1:
            fail("RECEIPT_MISMATCH")
        print("APPLIED=" + str(i + 1) + "/39")
        if inject_at and i + 1 == int(inject_at):
            fail("EXPECTED_STOP_AFTER_" + inject_at)
    print("RUNNER_LAB_GREEN=39")


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in ("preflight", "apply", "verify"):
        fail("USAGE")
    check_environment()
    files = migrations()
    if sys.argv[1] == "preflight":
        print("MANIFEST_GREEN=39")
        print("PROD_ACCESS=NONE")
        return
    if sys.argv[1] == "apply":
        apply(files)
        return
    assert_history()
    count = assert_ledger(files)
    print("LEDGER_VERIFIED=" + str(count) + "/39")


if __name__ == "__main__":
    main()
