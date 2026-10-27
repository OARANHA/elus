import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
const script = "scripts/elus-v189-official-ledger-review.mjs";

describe("ledger v189: revisão offline, nunca executor", () => {
  it("enumera 39 unidades com registro oficial bloqueado", () => {
    const raw = execFileSync(process.execPath,[script,"inspect"],{
      cwd:process.cwd(),encoding:"utf8",timeout:15000,
      env:{PATH:process.env.PATH,NODE_ENV:"test"},
    });
    const plan=JSON.parse(raw);
    expect(plan.mode).toBe("offline-inspection-only");
    expect(plan.status).toBe("NO_GO");
    expect(plan.executeAllowed).toBe(false);
    expect(plan.historicalLedgerEntries).toBe(11);
    expect(plan.count).toBe(39);
    expect(plan.units).toHaveLength(39);
    expect(plan.units.map((u:{name:string})=>u.name)).toEqual(
      [...plan.units.map((u:{name:string})=>u.name)].sort());
    for(const u of plan.units){
      expect(u.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(u.ledgerRegistration).toBe("BLOCKED_OFFICIAL_LEDGER_CONTRACT_UNVERIFIED");
    }
  });
  it("recusa comandos com semântica de escrita", () => {
    for(const command of ["apply","run","commit","repair","preflight"]){
      expect(()=>execFileSync(process.execPath,[script,command],{
        cwd:process.cwd(),encoding:"utf8",timeout:15000,
        env:{PATH:process.env.PATH},stdio:["ignore","pipe","pipe"],
      })).toThrow();
    }
  });
});
