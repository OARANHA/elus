import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("DANFE administrativa em conversa ISIS", () => {
  const raiz = process.cwd();
  const ferramentas = fs.readFileSync(
    path.join(raiz, "lib/agent-engine/edge/crm/mcp-tools.ts"),
    "utf8",
  );
  const turno = fs.readFileSync(
    path.join(raiz, "lib/agent-engine/agent/inbound-turn.ts"),
    "utf8",
  );

  it("prepara o documento apenas no turno administrativo autorizado", () => {
    expect(ferramentas).toContain("resolverAutoridadeAdminWhatsapp");
    expect(ferramentas).toContain("prepararDanfeAdminWhatsapp");
    expect(ferramentas).toContain("onAdminDocumentPrepared");
  });

  it("entrega o PDF pelo fluxo canônico de envio e auditoria", () => {
    expect(turno).toContain("documentoAdminPreparado");
    expect(turno).toContain("type: 'document'");
    expect(turno).toContain("runBeforeSend");
  });

  it("não instala sender alternativo de WhatsApp no módulo ERP", () => {
    const fontes = [
      "lib/integracoes-erp/autoridade-admin-whatsapp.ts",
      "lib/mcp/tools/integracoes-erp.ts",
    ].map((arquivo) => fs.readFileSync(path.join(raiz, arquivo), "utf8").toLowerCase());
    expect(fontes.join("\n")).not.toMatch(/sendfile|sendtext|lib\/waha/);
  });
});
