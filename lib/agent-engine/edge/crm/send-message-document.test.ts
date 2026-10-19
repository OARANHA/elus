import { describe, expect, it } from "vitest";

import { corpoDoEnvio } from "./send-message";

describe("sender canônico de documento administrativo", () => {
  it("envia PDF privado como documento pelo handler de mensagens", () => {
    const body = corpoDoEnvio(
      {
        tenantId: "org",
        leadId: "contact",
        jobId: "job",
        seq: 1,
        conversationId: "conversation",
        body: "Segue a DANFE.",
        media: { storagePath: "org/conversation/danfe.pdf", mime: "application/pdf", type: "document" },
      },
      "idempotency-key",
    );

    expect(body).toMatchObject({
      type: "document",
      media_storage_path: "org/conversation/danfe.pdf",
      media_mime: "application/pdf",
      body: "Segue a DANFE.",
      metadata: { idempotency_key: "idempotency-key" },
    });
  });
});
