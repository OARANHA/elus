/**
 * Gate REAL do complemento ELUS 0765 num PostgreSQL efêmero pg15/pg17.
 * Reutiliza o harness oficial pnpm test:db, que já aplica baseline e recria
 * um banco independente por arquivo. Nunca conectar ao Supabase real.
 *
 * Este teste prova a função isolada sobre o baseline atual: NÃO aprova o
 * replay das 38 migrations v1.89 nem substitui o futuro teste de upgrade.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { beforeAll, afterEach, describe, expect, it } from "vitest";

import { lastLine, sql } from "./gov-helpers";

const MIGRATION = join(
  process.cwd(), "supabase", "migrations",
  "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql",
);
const USER_A = "76050000-0000-4000-8000-000000000001";
const USER_B = "76050000-0000-4000-8000-000000000002";
const fn = "public.fn_elus_rotacionar_codigos_recuperacao";
const hashes = (prefix: string) => Array.from(
  { length: 10 }, (_, i) => (i.toString(16).padStart(2, "0") + prefix.repeat(62)).slice(0, 64),
);
const A = hashes("a");
const B = hashes("b");
const C = hashes("c");

function literalHex(v: string[]): string {
  // Todos os elementos são gerados por helper interno; nenhuma entrada externa.
  return "ARRAY[" + v.map((h) => "'" + h + "'").join(",") + "]::text[]";
}
function call(user: string, values: string[]): string {
  return `select ${fn}('${user}'::uuid, ${literalHex(values)});`;
}
function count(user: string): number {
  return Number(lastLine(sql(
    `select count(*) from public.user_recovery_codes where user_id = '${user}';`,
  )));
}
function stored(user: string): string[] {
  const result = sql(
    `select encode(code_hash, 'hex') from public.user_recovery_codes
       where user_id = '${user}' order by 1;`,
  );
  return result ? result.split("\n").sort() : [];
}
function db(): Client {
  if (!process.env.TEST_DB_CONTAINER || !process.env.DESKCOMM_INVARIANTS_DB_RESET) {
    throw new Error("Teste exige banco efêmero do harness oficial");
  }
  const port = Number(process.env.TEST_DB_PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("TEST_DB_PORT ausente/inválida");
  }
  return new Client({
    host: "127.0.0.1",
    port,
    user: "postgres",
    password: "postgres",
    database: "postgres",
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });
}

beforeAll(() => {
  // A migration é aplicada APENAS no banco efêmero recriado pelo setupFile.
  sql(readFileSync(MIGRATION, "utf8"));
  sql(`
    insert into auth.users(id, email) values
      ('${USER_A}', 'elus-0765-a@invariant.test'),
      ('${USER_B}', 'elus-0765-b@invariant.test');
  `);
});
afterEach(() => {
  sql(`delete from public.user_recovery_codes where user_id in ('${USER_A}', '${USER_B}');`);
});

describe("ELUS 0765 — PostgreSQL real efêmero", () => {
  it("aceita exatamente dez hashes e substitui sem acumular lotes", () => {
    expect(Number(lastLine(sql(call(USER_A, A))))).toBe(10);
    expect(stored(USER_A)).toEqual([...A].sort());
    expect(Number(lastLine(sql(call(USER_A, B))))).toBe(10);
    expect(stored(USER_A)).toEqual([...B].sort());
    expect(count(USER_B)).toBe(0);
  });

  it("isola usuários e não altera códigos de outra conta", () => {
    sql(call(USER_A, A));
    sql(call(USER_B, B));
    sql(call(USER_A, C));
    expect(stored(USER_B)).toEqual([...B].sort());
    expect(stored(USER_A)).toEqual([...C].sort());
  });

  it("nega execução para anon/authenticated e permite service_role", () => {
    expect(lastLine(sql(`
      select has_function_privilege('anon', '${fn}(uuid,text[])', 'EXECUTE'),
             has_function_privilege('authenticated', '${fn}(uuid,text[])', 'EXECUTE'),
             has_function_privilege('service_role', '${fn}(uuid,text[])', 'EXECUTE');
    `))).toBe("f|f|t");

    for (const role of ["anon", "authenticated"]) {
      let rejected = false;
      try {
        sql(`begin; set local role ${role}; ${call(USER_A, A)} rollback;`);
      } catch (error) {
        rejected = /permission denied for function/.test(String(error));
      }
      expect(rejected, role + " conseguiu EXECUTE ou falhou por outro motivo").toBe(true);
    }
    expect(count(USER_A)).toBe(0);
  });

  it("entrada inválida preserva lote anterior", () => {
    sql(call(USER_A, A));
    for (const invalid of [A.slice(0, 9), [...A.slice(0, 9), ...A.slice(0, 1)], [...A.slice(0, 9), "zz".repeat(32)]]) {
      expect(() => sql(call(USER_A, invalid))).toThrow();
      expect(stored(USER_A)).toEqual([...A].sort());
    }
  });

  it("falha DENTRO do INSERT desfaz o DELETE anterior", () => {
    sql(call(USER_A, A));
    sql(`
      create function public.elus_0765_rejeita_insert() returns trigger
      language plpgsql as $test$
      begin
        if encode(new.code_hash, 'hex') = '${B[0]}' then
          raise exception 'elus_0765_simulated_failure';
        end if;
        return new;
      end
      $test$;
      create trigger elus_0765_rejeita_insert before insert
        on public.user_recovery_codes for each row
        execute function public.elus_0765_rejeita_insert();
    `);
    try {
      expect(() => sql(call(USER_A, B))).toThrow(/elus_0765_simulated_failure/);
      expect(stored(USER_A)).toEqual([...A].sort());
    } finally {
      sql(`
        drop trigger elus_0765_rejeita_insert on public.user_recovery_codes;
        drop function public.elus_0765_rejeita_insert();
      `);
    }
  });

  it("duas sessões concorrentes mantêm somente o ÚLTIMO lote (nunca 20 códigos)", async () => {
    const lock = db();
    const first = db();
    const second = db();
    try {
      await Promise.all([lock.connect(), first.connect(), second.connect()]);
      await lock.query("BEGIN");
      // Prende ambas as chamadas até que as duas estejam em voo.
      await lock.query(
        "select pg_advisory_xact_lock(hashtextextended($1, 0))",
        ["elus:recovery:" + USER_A],
      );
      const q1 = first.query(`select ${fn}($1::uuid, $2::text[])`, [USER_A, B]);
      const q2 = second.query(`select ${fn}($1::uuid, $2::text[])`, [USER_A, C]);
      // Promessas em voo aguardam o mesmo lock transacional.
      await new Promise((resolve) => setTimeout(resolve, 70));
      await lock.query("COMMIT");
      const [r1, r2] = await Promise.all([q1, q2]);
      expect(r1.rows[0]?.fn_elus_rotacionar_codigos_recuperacao).toBe(10);
      expect(r2.rows[0]?.fn_elus_rotacionar_codigos_recuperacao).toBe(10);
      const final = stored(USER_A);
      expect(final).toHaveLength(10);
      expect(
        JSON.stringify(final) === JSON.stringify([...B].sort()) ||
        JSON.stringify(final) === JSON.stringify([...C].sort()),
      ).toBe(true);
    } finally {
      // Nunca deixar transação aberta prender o container para o próximo caso.
      await lock.query("ROLLBACK").catch(() => undefined);
      await Promise.allSettled([lock.end(), first.end(), second.end()]);
    }
  });
});
