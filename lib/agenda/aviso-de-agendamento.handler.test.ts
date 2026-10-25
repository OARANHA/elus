/**
 * O adapter mantém os três eventos no mesmo consumidor e só mapeia os
 * desfechos do núcleo, sem rede ou banco durante os testes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/agenda/aviso-de-agendamento", () => ({
  aplicaAvisoDeAgendamento: vi.fn(),
  createSupabaseAvisoDeAgendamentoDb: vi.fn(() => ({})),
}));
vi.mock("@/lib/escalacao/aviso-ao-suporte", () => ({ createSupabaseAvisoDb: vi.fn(() => ({})) }));
vi.mock("@/lib/escalacao/aviso-ao-suporte.handler", () => ({
  criarTransporteDoAviso: vi.fn(async () => ({})),
}));
vi.mock("@/lib/agent-engine/pacing/ledger-supabase", () => ({
  criarPacingDoCanal: vi.fn(async () => ({})),
}));
vi.mock("@/lib/event-log/origem-do-dreno", () => ({ origemDoDreno: vi.fn(() => "worker") }));

import { aplicaAvisoDeAgendamento } from "./aviso-de-agendamento";
import {
  AVISO_DE_AGENDAMENTO_HANDLER_KEY,
  avisoDeAgendamentoNoWhatsAppHandler,
} from "./aviso-de-agendamento.handler";

function evento() {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    organization_id: "11111111-1111-4111-8111-111111111111",
    event_type: "appointment.created",
    entity_kind: "calendar_appointment",
    entity_id: "33333333-3333-4333-8333-333333333333",
    payload: { appointment_id: "33333333-3333-4333-8333-333333333333" },
    metadata: {},
    consumed_by: [],
    attempts: 0,
    created_at: "2026-10-25T12:00:00.000Z",
  } as Parameters<typeof avisoDeAgendamentoNoWhatsAppHandler.handle>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("aviso de agendamento — adapter do event_log", () => {
  it("registra os três eventos no mesmo consumidor, que pula organizações paradas", () => {
    expect(avisoDeAgendamentoNoWhatsAppHandler.key).toBe(AVISO_DE_AGENDAMENTO_HANDLER_KEY);
    expect(avisoDeAgendamentoNoWhatsAppHandler.naOrgParada).toBe("pula");
    expect(avisoDeAgendamentoNoWhatsAppHandler.events).toEqual([
      "appointment.created",
      "appointment.rescheduled",
      "appointment.cancelled",
    ]);
  });

  it("sem configuração não é erro nem dispara envio", async () => {
    vi.mocked(aplicaAvisoDeAgendamento).mockResolvedValueOnce({
      status: "skipped",
      detail: "sem_configuracao",
    });
    const resposta = await avisoDeAgendamentoNoWhatsAppHandler.handle(evento());
    expect(resposta).toEqual({
      consumer_key: AVISO_DE_AGENDAMENTO_HANDLER_KEY,
      status: "skipped",
      detail: "sem_configuracao",
    });
    expect(aplicaAvisoDeAgendamento).toHaveBeenCalledOnce();
  });

  it("propaga adiamento do anti-ban ao dispatcher", async () => {
    vi.mocked(aplicaAvisoDeAgendamento).mockResolvedValueOnce({
      status: "retry",
      retry_at: "2026-10-25T12:05:00.000Z",
      detail: "espacamento",
    });
    expect(await avisoDeAgendamentoNoWhatsAppHandler.handle(evento())).toEqual({
      consumer_key: AVISO_DE_AGENDAMENTO_HANDLER_KEY,
      status: "retry",
      retry_at: "2026-10-25T12:05:00.000Z",
      detail: "espacamento",
    });
  });

  it("somente defeito inesperado do núcleo vira error", async () => {
    vi.mocked(aplicaAvisoDeAgendamento).mockRejectedValueOnce(new Error("falha_programa"));
    expect(await avisoDeAgendamentoNoWhatsAppHandler.handle(evento())).toEqual({
      consumer_key: AVISO_DE_AGENDAMENTO_HANDLER_KEY,
      status: "error",
      detail: "falha_programa",
    });
  });
});
