import { beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "22222222-2222-4222-8222-222222222222";
const USER = "11111111-1111-4111-8111-111111111111";

const h = vi.hoisted(() => ({
  membershipExists: true,
  mfaRequired: false,
  selected: "",
  filters: [] as Array<[string, unknown]>,
  cookieWrites: [] as Array<{ name: string; value: string }>,
  auditCalls: 0,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: (name: string, value: string) => {
      h.cookieWrites.push({ name, value });
    },
  }),
}));

vi.mock("@/lib/auth/server", () => ({
  loadAuthUser: async () => ({ id: USER, support: null }),
  mfaEmDivida: async () => h.mfaRequired,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "user_organizations") throw new Error(`Unexpected table: ${table}`);
      type Query = {
        select: (columns: string) => Query;
        eq: (column: string, value: unknown) => Query;
        is: (column: string, value: unknown) => Query;
        not: (column: string, operator: string, value: unknown) => Query;
        maybeSingle: () => Promise<{ data: object | null; error: null }>;
      };
      const query = {} as Query;
      query.select = (columns) => {
        h.selected = columns;
        return query;
      };
      query.eq = (column, value) => {
        h.filters.push([column, value]);
        return query;
      };
      query.is = (column, value) => {
        h.filters.push([column, value]);
        return query;
      };
      query.not = (column, operator, value) => {
        h.filters.push([column, `${operator}:${String(value)}`]);
        return query;
      };
      query.maybeSingle = async () => ({
        data: h.membershipExists ? { organization_id: ORG } : null,
        error: null,
      });
      return query;
    },
  }),
}));

vi.mock("@/lib/supabase/cookie-secure", () => ({ cookieSecure: () => true }));
vi.mock("@/lib/audit", () => ({
  audit: async () => {
    h.auditCalls += 1;
  },
}));

import { setActiveOrg } from "./setActiveOrg";

beforeEach(() => {
  h.membershipExists = true;
  h.mfaRequired = false;
  h.selected = "";
  h.filters = [];
  h.cookieWrites = [];
  h.auditCalls = 0;
});

describe("setActiveOrg — relacionamento explícito da organização", () => {
  it("consulta a FK correta e troca apenas para uma organização com vínculo ativo", async () => {
    expect(await setActiveOrg(ORG)).toEqual({ ok: true });
    expect(h.selected).toBe(
      "organization_id, organizations!user_organizations_organization_id_fkey!inner(status)",
    );
    expect(h.filters).toContainEqual(["organization_id", ORG]);
    expect(h.filters).toContainEqual(["user_id", USER]);
    expect(h.filters).toContainEqual(["revoked_at", null]);
    expect(h.filters).toContainEqual(["accepted_at", "is:null"]);
    expect(h.filters).toContainEqual(["organizations.status", "active"]);
    expect(h.cookieWrites).toEqual([{ name: "active_org", value: ORG }]);
    expect(h.auditCalls).toBe(1);
  });

  it("não troca a organização quando o vínculo não existe", async () => {
    h.membershipExists = false;
    expect(await setActiveOrg(ORG)).toEqual({ ok: false, error: "forbidden" });
    expect(h.cookieWrites).toEqual([]);
    expect(h.auditCalls).toBe(0);
  });

  it("não consulta o banco nem altera cookie quando a sessão deve MFA", async () => {
    h.mfaRequired = true;
    expect(await setActiveOrg(ORG)).toEqual({ ok: false, error: "mfa_required" });
    expect(h.selected).toBe("");
    expect(h.cookieWrites).toEqual([]);
  });
});
