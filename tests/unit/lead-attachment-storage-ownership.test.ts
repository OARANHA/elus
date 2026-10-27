import { describe, expect, it } from "vitest";

import {
  isLeadAttachmentPathOwnedBy,
  isMediaPathOwnedBy,
} from "@/lib/messaging/media/upload-validation";

const ORG = "11111111-1111-4111-8111-111111111111";
const OUTRA_ORG = "22222222-2222-4222-8222-222222222222";
const LEAD = "33333333-3333-4333-8333-333333333333";
const OUTRO_LEAD = "44444444-4444-4444-8444-444444444444";

describe("posse de anexos de negócios (DeskcommCRM v1.89.0)", () => {
  it("aceita arquivo e subpasta do lead da organização correta", () => {
    expect(isLeadAttachmentPathOwnedBy(`${ORG}/leads/${LEAD}/contrato.pdf`, ORG, LEAD)).toBe(true);
    expect(isLeadAttachmentPathOwnedBy(`${ORG}/leads/${LEAD}/docs/2026/nota.pdf`, ORG, LEAD)).toBe(true);
  });

  it("rejeita arquivos de outra organização, outro lead ou outra conversa", () => {
    expect(isLeadAttachmentPathOwnedBy(`${OUTRA_ORG}/leads/${LEAD}/contrato.pdf`, ORG, LEAD)).toBe(false);
    expect(isLeadAttachmentPathOwnedBy(`${ORG}/leads/${OUTRO_LEAD}/contrato.pdf`, ORG, LEAD)).toBe(false);
    expect(isLeadAttachmentPathOwnedBy(`${ORG}/${LEAD}/contrato.pdf`, ORG, LEAD)).toBe(false);
  });

  it("rejeita prefixo sem arquivo, segmentos vazios, traversal e barra invertida", () => {
    const prefixo = `${ORG}/leads/${LEAD}/`;
    for (const sufixo of ["", "../segredo.pdf", "./contrato.pdf", "docs//contrato.pdf", "docs/../../segredo.pdf", "docs\\segredo.pdf"]) {
      expect(isLeadAttachmentPathOwnedBy(prefixo + sufixo, ORG, LEAD)).toBe(false);
    }
  });

  it("preserva o contrato anterior para mídia de conversas", () => {
    expect(isMediaPathOwnedBy(`${ORG}/${LEAD}/arquivo.pdf`, ORG, LEAD)).toBe(true);
    expect(isMediaPathOwnedBy(`${ORG}/${LEAD}/../arquivo.pdf`, ORG, LEAD)).toBe(false);
  });
});
