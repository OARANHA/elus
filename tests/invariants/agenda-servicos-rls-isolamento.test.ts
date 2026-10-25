/**
 * Recorte da prova comportamental de isolamento das oito tabelas de serviço
 * do DeskcommCRM v1.89.0 (upstream tests/invariants/agenda-servicos.test.ts).
 * Exercita PostgreSQL efêmero, JWT de duas organizações, controle positivo e
 * INSERT/UPDATE/DELETE recusados. Não substitui os testes de negócio do módulo.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// Próxima terça-feira: a reserva usa o relógio real do banco, não uma data que vence no CI.
const diaDaAula = new Date();
diaDaAula.setUTCHours(0, 0, 0, 0);
diaDaAula.setUTCDate(diaDaAula.getUTCDate() + ((2 - diaDaAula.getUTCDay() + 7) % 7 || 7));
function em(hora: string, dias = 0): string {
  const dia = new Date(diaDaAula);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return `${dia.toISOString().slice(0, 10)}T${hora}`;
}

const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL ?? `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT ?? 54329}/postgres` });
const tenant = () => ({ org: randomUUID(), manager: randomUUID(), viewer: randomUUID() });
const tenants = [tenant(), tenant()] as const;
const at = em("17:00:00Z");
beforeAll(async () => {
  for (const tenant of tenants) {
    await pool.query("insert into organizations(id,slug,legal_name,display_name) values($1::uuid,$1::text,'Serviços fictícios','Serviços fictícios')", [tenant.org]);
    for (const role of ["manager", "viewer"] as const) {
      await pool.query("insert into auth.users(id,email) values($1,$2)", [tenant[role], `${tenant[role]}@example.test`]);
      await pool.query("insert into user_organizations(organization_id,user_id,role,accepted_at) values($1,$2,$3,now())", [tenant.org, tenant[role], role]);
    }
  }
});
afterAll(() => pool.end());

async function service(mode = "collective_unlimited", capacity: number | null = null) {
  const id = randomUUID();
  await pool.query("insert into calendar_event_types(id,organization_id,name,slug,duration_minutes,minimum_notice_minutes,service_enabled,booking_mode,service_capacity) values($1::uuid,$2,'Atividade fictícia',$1::text,40,0,true,$3,$4)", [id, tenants[0].org, mode, capacity]);
  await pool.query("insert into calendar_service_schedule(organization_id,event_type_id,weekday,timing_kind,start_minute) values($1,$2,2,'fixed',840)", [tenants[0].org, id]);
  return id;
}
async function contact() {
  const id = randomUUID();
  await pool.query("insert into contacts(id,organization_id,display_name) values($1,$2,'Participante fictício')", [id, tenants[0].org]);
  return id;
}
async function book(id: string, contactId: string, operationKey = randomUUID(), fields: Record<string, unknown> = {}) {
  const { rows } = await pool.query("select fn_calendar_service_book($1,$2,$3) r", [tenants[0].org, { type: "user", id: tenants[0].manager }, { event_type_id: id, starts_at: at, contact_id: contactId, operation_key: operationKey, ...fields }]);
  return rows[0].r;
}
async function withUser<T>(user: string, run: (db: pg.PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("begin"); await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: user, role: "authenticated", aal: "aal1" })]);
    return await run(client);
  } finally { await client.query("rollback"); client.release(); }
}
describe("agenda de serviços — oito tabelas isoladas entre organizações", () => {
  it("as oito tabelas novas isolam JWTs de duas organizações e recusam escrita direta", async () => {
    const org = tenants[0].org, id = await service(), resource = randomUUID(), conn = randomUUID(), cal = randomUUID();
    await pool.query("insert into calendar_resources(id,organization_id,name,capacity) values($1,$2,'Recurso fictício',1)", [resource, org]);
    await pool.query("insert into calendar_service_resources(organization_id,event_type_id,resource_id,units) values($1,$2,$3,1)", [org, id, resource]);
    await book(id, await contact());
    await pool.query("insert into calendar_service_professionals(organization_id,event_type_id,user_id) values($1,$2,$3)", [org, id, tenants[0].manager]);
    await pool.query("insert into calendar_connections(id,organization_id,user_id,account_email,status) values($1,$2,$3,$4,'healthy')", [conn, org, tenants[0].manager, `${conn}@example.test`]);
    await pool.query("insert into calendar_connection_calendars(id,organization_id,connection_id,external_calendar_id,name,access_role,available,counts_for_conflicts) values($1::uuid,$2,$3,$1::text,'Fonte fictícia','owner',true,false)", [cal, org, conn]);
    await pool.query("insert into calendar_service_calendar_sources(organization_id,event_type_id,calendar_id) values($1,$2,$3)", [org, id, cal]);
    await pool.query("insert into calendar_service_blocks(organization_id,event_type_id,scope_kind,starts_at,ends_at,reason,operation_key) values($1,$2,'service',$3,$4,'Bloqueio fictício',$5)", [org, id, at, em("17:40:00Z"), randomUUID()]);
    const tables = ["calendar_resources", "calendar_service_schedule", "calendar_service_professionals", "calendar_service_resources", "calendar_service_calendar_sources", "calendar_service_occurrences", "calendar_service_occurrence_resources", "calendar_service_blocks"] as const;
    for (const table of tables) {
      const own = await withUser(tenants[0].viewer, db => db.query(`select count(*)::int n from ${table} where organization_id=$1`, [org]));
      expect(own.rows[0].n, table).toBeGreaterThan(0);
      const foreign = await withUser(tenants[1].viewer, db => db.query(`select count(*)::int n from ${table} where organization_id=$1`, [org]));
      expect(foreign.rows[0].n, table).toBe(0);
      for (const sql of [`insert into ${table} select * from ${table} where false`, `update ${table} set organization_id=organization_id where false`, `delete from ${table} where false`])
        await expect(withUser(tenants[0].manager, db => db.query(sql))).rejects.toMatchObject({ code: "42501" });
    }
  });
});
