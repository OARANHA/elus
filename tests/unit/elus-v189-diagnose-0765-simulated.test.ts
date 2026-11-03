import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Executa o diagnoseLedger real com resultados de catálogo simulados.
// Não conecta ao Supabase e não lê statements[] nem dados de tenants.
type Row = Record<string, unknown>;
type Client = { query: (sql: string) => Promise<{ rows: Row[] }> };
type Diagnostic = {
  historicalReceiptsExact: boolean;
  receipt0765Present: boolean;
  receipt0765Exact: boolean;
  rpc0765Present: boolean;
  rpc0765SecurityDefiner: boolean;
  rpc0765PinnedSearchPath: boolean;
  rpc0765ServiceRoleClientsDenied: boolean;
  receipt0765RpcMismatch: boolean;
  rpc0765NamedFunctionsAnySchema: number;
  external9037Exact: boolean;
  receipt0690Exact: boolean;
  guard0690And9037Coexist: boolean;
  guard9037Strict: boolean;
  guard9037ReceiptBodyExact: boolean;
  guardTriggerEnabled: boolean;
  guardTriggerWiringCorrect: boolean;
  guardFunctionInvoker: boolean;
  guardFunctionExecuteRestricted: boolean;
  guarded9037FunctionsExpected: number;
  guarded9037FunctionsPresent: number;
  guarded9037FunctionsLeastPrivilege: number;
  guarded9037DefinitionsObservedMatches: number;
  guarded9037DefinitionsNoDrift: boolean;
  guarded9037FunctionsAllSafe: boolean;
  recoveryCodesRls: boolean;
  recoveryCodesClientDmlDenied: boolean;
  recoveryCodesDenySelectPolicy: boolean;
  gate: string;
};

function loadDiagnostic(): (client: Client) => Promise<Diagnostic> {
  const source = readFileSync("scripts/elus-v189-production-upgrade.mjs", "utf8");
  const start = source.indexOf("async function diagnoseLedger(c){");
  const end = source.indexOf("async function main(){", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const code = `
    const historicalReceiptDiagnostic = async () => ({
      historicalReceiptsMatched: 11,
      historicalReceiptsExpected: 11,
      historicalReceiptsExact: true
    });
    ${source.slice(start, end)}
    diagnoseLedger
  `;
  return runInNewContext(code, {}, { timeout: 1000 }) as (client: Client) => Promise<Diagnostic>;
}

type Scenario = {
  external9037Exact?: number;
  rpc0765SecurityDefiner?: boolean;
  rpc0765PinnedSearchPath?: boolean;
  rpc0765ServiceRoleClientsDenied?: boolean;
  receipt0690Exact?: number;
  guard9037Strict?: boolean;
  guard9037ReceiptBodyExact?: boolean;
  guardTriggerEnabled?: boolean;
  guardTriggerWiringCorrect?: boolean;
  guardFunctionInvoker?: boolean;
  guardFunctionExecuteRestricted?: boolean;
  guarded9037Functions?: { expected: number; present: number; least_privilege: number; observed_definition_matches?: number };
  recoveryCodesRls?: boolean;
  recoveryCodesClientDmlDenied?: boolean;
  recoveryCodesDenySelectPolicy?: boolean;
};

async function evaluate(receipt: number, exact: number, rpcPresent: boolean, scenario: Scenario = {}) {
  const queries: string[] = [];
  const diagnose = loadDiagnostic();
  const result = await diagnose({
    query: async (sql) => {
      queries.push(sql);
      expect(sql.trimStart()).toMatch(/^SELECT\b/i);
      if (sql.includes("AS guard_9037_receipt_body_exact")) {
        return { rows: [{ guard_9037_receipt_body_exact: scenario.guard9037ReceiptBodyExact ?? true }] };
      }
      if (sql.includes("FROM supabase_migrations.schema_migrations")) {
        return {
          rows: [{
            total_receipts: "51",
            external_9037_exact: String(scenario.external9037Exact ?? 1),
            receipt_0690_exact: String(scenario.receipt0690Exact ?? 1),
            receipt_0765: String(receipt),
            receipt_0765_exact: String(exact),
          }],
        };
      }
      if (sql.includes("pg_catalog.pg_proc")) {
        return {
          rows: [{
            rpc_0765_present: rpcPresent,
            rpc_0765_security_definer: scenario.rpc0765SecurityDefiner ?? rpcPresent,
            rpc_0765_pinned_search_path: scenario.rpc0765PinnedSearchPath ?? rpcPresent,
            rpc_0765_service_role_clients_denied: scenario.rpc0765ServiceRoleClientsDenied ?? rpcPresent,
            rpc_0765_any_schema_count: rpcPresent ? "1" : "0",
            guard_9037_strict: scenario.guard9037Strict ?? true,
            guard_trigger_enabled: scenario.guardTriggerEnabled ?? true,
            guard_trigger_wiring_correct: scenario.guardTriggerWiringCorrect ?? true,
            guard_function_invoker: scenario.guardFunctionInvoker ?? true,
            guard_function_execute_restricted: scenario.guardFunctionExecuteRestricted ?? true,
            guarded_9037_functions: {
              expected: scenario.guarded9037Functions?.expected ?? 8,
              present: scenario.guarded9037Functions?.present ?? 8,
              least_privilege: scenario.guarded9037Functions?.least_privilege ?? 8,
              observed_definition_matches: scenario.guarded9037Functions?.observed_definition_matches ?? scenario.guarded9037Functions?.present ?? 8,
            },
            recovery_codes_rls: scenario.recoveryCodesRls ?? true,
            recovery_codes_client_dml_denied: scenario.recoveryCodesClientDmlDenied ?? true,
            recovery_codes_deny_select_policy: scenario.recoveryCodesDenySelectPolicy ?? true,
          }],
        };
      }
      throw Error("UNEXPECTED_DIAGNOSTIC_QUERY");
    },
  });
  expect(queries).toHaveLength(3);
  expect(result.historicalReceiptsExact).toBe(true);
  expect(result.gate).toBe("DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL");
  return result;
}

describe("ELUS v1.89: diagnóstico 0765 simulado, sem acesso ao banco", () => {
  it("detecta recibo íntegro com RPC ausente, sem declarar aceite", async () => {
    const result = await evaluate(1, 1, false);
    expect(result.receipt0765Present).toBe(true);
    expect(result.receipt0765Exact).toBe(true);
    expect(result.rpc0765Present).toBe(false);
    expect(result.rpc0765SecurityDefiner).toBe(false);
    expect(result.rpc0765PinnedSearchPath).toBe(false);
    expect(result.rpc0765ServiceRoleClientsDenied).toBe(false);
    expect(result.rpc0765NamedFunctionsAnySchema).toBe(0);
    expect(result.receipt0765RpcMismatch).toBe(true);
  });

  it("distingue RPC presente, recibo ausente e recibo divergente", async () => {
    const installed = await evaluate(1, 1, true);
    expect(installed.receipt0765RpcMismatch).toBe(false);
    expect(installed.rpc0765Present).toBe(true);
    expect(installed.rpc0765SecurityDefiner).toBe(true);
    expect(installed.rpc0765PinnedSearchPath).toBe(true);
    expect(installed.rpc0765ServiceRoleClientsDenied).toBe(true);

    const noReceipt = await evaluate(0, 0, false);
    expect(noReceipt.receipt0765Present).toBe(false);
    expect(noReceipt.receipt0765RpcMismatch).toBe(false);

    const drifted = await evaluate(1, 0, false);
    expect(drifted.receipt0765Exact).toBe(false);
    expect(drifted.receipt0765RpcMismatch).toBe(true);
  });

  it("identifica RPC presente mas sem protecoes de privilegio e search_path", async () => {
    const drifted = await evaluate(1, 1, true, {
      rpc0765SecurityDefiner: false,
      rpc0765PinnedSearchPath: false,
      rpc0765ServiceRoleClientsDenied: false,
    });
    expect(drifted.rpc0765Present).toBe(true);
    expect(drifted.receipt0765Exact).toBe(true);
    expect(drifted.rpc0765SecurityDefiner).toBe(false);
    expect(drifted.rpc0765PinnedSearchPath).toBe(false);
    expect(drifted.rpc0765ServiceRoleClientsDenied).toBe(false);
    expect(drifted.gate).toBe("DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL");
  });

  it("separa a coexistência 0690/9037 de recibos ausentes ou divergentes", async () => {
    const complete = await evaluate(1, 1, false);
    expect(complete.external9037Exact).toBe(true);
    expect(complete.receipt0690Exact).toBe(true);
    expect(complete.guard0690And9037Coexist).toBe(true);
    expect(complete.guard9037ReceiptBodyExact).toBe(true);

    const no9037 = await evaluate(1, 1, false, { external9037Exact: 0 });
    expect(no9037.external9037Exact).toBe(false);
    expect(no9037.guard0690And9037Coexist).toBe(false);

    const no0690 = await evaluate(1, 1, false, { receipt0690Exact: 0 });
    expect(no0690.receipt0690Exact).toBe(false);
    expect(no0690.guard0690And9037Coexist).toBe(false);
  });

  it("compara o corpo real da guarda 9037 ao recibo, independentemente de ACL e hashes observados", async () => {
    const exact = await evaluate(1, 1, false);
    expect(exact.guard9037ReceiptBodyExact).toBe(true);

    const bodyDrift = await evaluate(1, 1, false, { guard9037ReceiptBodyExact: false });
    expect(bodyDrift.guard9037ReceiptBodyExact).toBe(false);
    expect(bodyDrift.guarded9037FunctionsAllSafe).toBe(true);
    expect(bodyDrift.guarded9037DefinitionsNoDrift).toBe(true);
    expect(bodyDrift.gate).toBe("DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL");
  });

  it("atesta as oito assinaturas da 9037 sem confundir recibo com ACL efetiva", async () => {
    const intact = await evaluate(1, 1, false);
    expect(intact.guarded9037FunctionsExpected).toBe(8);
    expect(intact.guarded9037FunctionsPresent).toBe(8);
    expect(intact.guarded9037FunctionsLeastPrivilege).toBe(8);
    expect(intact.guarded9037FunctionsAllSafe).toBe(true);
    expect(intact.guarded9037DefinitionsObservedMatches).toBe(8);
    expect(intact.guarded9037DefinitionsNoDrift).toBe(true);

    const missing = await evaluate(1, 1, false, {
      guarded9037Functions: { expected: 8, present: 7, least_privilege: 7 },
    });
    expect(missing.guarded9037FunctionsPresent).toBe(7);
    expect(missing.guarded9037FunctionsAllSafe).toBe(false);
    expect(missing.guarded9037DefinitionsNoDrift).toBe(false);

    const exposed = await evaluate(1, 1, false, {
      guarded9037Functions: { expected: 8, present: 8, least_privilege: 7 },
    });
    expect(exposed.guarded9037FunctionsLeastPrivilege).toBe(7);
    expect(exposed.guarded9037FunctionsAllSafe).toBe(false);
    expect(exposed.gate).toBe("DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL");

    // ACL correta nao comprova identidade do corpo SQL instalado.
    const bodyDrift = await evaluate(1, 1, false, {
      guarded9037Functions: { expected: 8, present: 8, least_privilege: 8, observed_definition_matches: 7 },
    });
    expect(bodyDrift.guarded9037FunctionsAllSafe).toBe(true);
    expect(bodyDrift.guarded9037DefinitionsObservedMatches).toBe(7);
    expect(bodyDrift.guarded9037DefinitionsNoDrift).toBe(false);
    expect(bodyDrift.gate).toBe("DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL");
  });

  it("não mascara desvios da guarda 9037, ACL ou isolamento dos códigos", async () => {
    const drifted = await evaluate(1, 1, false, {
      guard9037Strict: false,
      guardTriggerEnabled: false,
      guardTriggerWiringCorrect: false,
      guardFunctionInvoker: false,
      guardFunctionExecuteRestricted: false,
      recoveryCodesRls: false,
      recoveryCodesClientDmlDenied: false,
      recoveryCodesDenySelectPolicy: false,
    });
    expect(drifted.guard9037Strict).toBe(false);
    expect(drifted.guardTriggerEnabled).toBe(false);
    expect(drifted.guardTriggerWiringCorrect).toBe(false);
    expect(drifted.guardFunctionInvoker).toBe(false);
    expect(drifted.guardFunctionExecuteRestricted).toBe(false);
    expect(drifted.recoveryCodesRls).toBe(false);
    expect(drifted.recoveryCodesClientDmlDenied).toBe(false);
    expect(drifted.recoveryCodesDenySelectPolicy).toBe(false);
    expect(drifted.gate).toBe("DIAGNOSTIC_ONLY_NOT_RELEASE_APPROVAL");
  });
});
