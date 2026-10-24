import { describe, expect, expectTypeOf, it } from "vitest";
import type { ChannelSendInput } from "@/lib/agent-engine/channel-adapter";
import type { SendMessageInput } from "@/lib/agent-engine/edge/crm/send-message";
import type { TipoDeMidiaComLegenda } from "@/lib/messaging/media/midia-com-legenda";

type MediaPorUrl<T> = Extract<NonNullable<T>, { url: string }>;
type MediaDoStorage<T> = Extract<NonNullable<T>, { storagePath: string }>;

/**
 * Port seletivo v1.89.0: o tipo de mídia de URL deve vir do classificador único.
 * O ELUS conserva, de propósito, o envio de DOCUMENTO pelo Storage — usado
 * por integrações próprias, inclusive a entrega de DANFE.
 * Teste unitário/de tipos: não chama o canal nem executa Playwright/E2E.
 */
describe("ELUS: contrato de mídia do agente sem regressão fiscal", () => {
  it("ambas as bordas usam o tipo central para mídia por URL", () => {
    expectTypeOf<MediaPorUrl<ChannelSendInput["media"]>["type"]>()
      .toEqualTypeOf<TipoDeMidiaComLegenda>();
    expectTypeOf<MediaPorUrl<SendMessageInput["media"]>["type"]>()
      .toEqualTypeOf<TipoDeMidiaComLegenda>();

    const url: MediaPorUrl<SendMessageInput["media"]> = {
      url: "https://example.invalid/catalogo.pdf",
      mime: "application/pdf",
      type: "document",
    };
    expect(url.type).toBe("document");
  });

  it("preserva documento por storagePath nos dois contratos", () => {
    const storageCanal: MediaDoStorage<ChannelSendInput["media"]> = {
      storagePath: "org/conversa/danfe.pdf",
      mime: "application/pdf",
      type: "document",
    };
    const storageEnvio: MediaDoStorage<SendMessageInput["media"]> = storageCanal;
    expect(storageEnvio.type).toBe("document");
    expect(storageEnvio.storagePath).toBe("org/conversa/danfe.pdf");
  });
});
