import { describe, expect, it, vi } from "vitest";

import { listarTenants } from "./_lista";

function clienteComResposta(data: unknown[], error: { message: string } | null = null) {
  const query = {
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
  };
  const select = vi.fn().mockReturnValue(query);
  const from = vi.fn().mockReturnValue({ select });
  return { admin: { from } as never, from, select, query };
}

describe("listarTenants — relacionamento explícito com FK da versão de referência", () => {
  it("conta membros pela FK correta sem alterar a contagem de conversas", async () => {
    const db = clienteComResposta([]);

    const resultado = await listarTenants(db.admin, { limit: 10 });

    expect(db.from).toHaveBeenCalledWith("organizations");
    expect(db.select).toHaveBeenCalledTimes(1);
    const projecao = String(db.select.mock.calls[0]?.[0] ?? "");
    expect(projecao).toContain(
      "user_count:user_organizations!user_organizations_organization_id_fkey(count)",
    );
    expect(projecao).not.toContain("user_count:user_organizations(count)");
    expect(projecao).toContain("conversations_count:conversations(count)");
    expect(db.query.limit).toHaveBeenCalledWith(11);
    expect(resultado).toEqual({ page: [], has_more: false, nextCursor: null, error: null });
  });

  it("mantém o erro de consulta explícito em vez de apresentar contagem vazia", async () => {
    const erro = { message: "falha simulada na consulta" };
    const db = clienteComResposta([], erro);

    const resultado = await listarTenants(db.admin, { limit: 10 });

    expect(resultado).toEqual({ page: [], has_more: false, nextCursor: null, error: erro });
  });
});
