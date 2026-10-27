/** Port seletivo v1.89.0: nota de voz AAC do iPhone sem alterar anexos comuns. */
import { writeFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  precisaTranscodificar,
  transcodificarNotaDeVoz,
  VOICE_MIME,
} from "@/lib/messaging/media/voice-transcode";

const original = Buffer.from("audio-de-teste");

describe("compatibilidade de notas de voz v1.89.0", () => {
  it("mantém webm do Chrome no fluxo de remux sem precisar da marca", () => {
    expect(precisaTranscodificar("audio/webm;codecs=opus")).toBe(true);
    expect(precisaTranscodificar("video/webm")).toBe(true);
  });

  it("preserva áudio AAC enviado como anexo sem marca de nota de voz", async () => {
    const run = vi.fn(async () => {});
    const resultado = await transcodificarNotaDeVoz({ buffer: original, mime: "audio/mp4" }, { run });
    expect(resultado).toEqual({ buffer: original, mime: "audio/mp4", convertido: false });
    expect(run).not.toHaveBeenCalled();
  });

  it("reencoda áudio AAC do iPhone marcado como nota de voz usando libopus", async () => {
    const run = vi.fn(async (args: string[]) => {
      await writeFile(args.at(-1)!, Buffer.from("opus-convertido"));
    });
    const resultado = await transcodificarNotaDeVoz(
      { buffer: original, mime: "audio/mp4", notaDeVoz: true },
      { run },
    );
    expect(resultado.convertido).toBe(true);
    expect(resultado.mime).toBe(VOICE_MIME);
    expect(resultado.buffer.toString()).toBe("opus-convertido");
    expect(run).toHaveBeenCalledOnce();
    const args = run.mock.calls[0]![0];
    expect(args).toContain("libopus");
    expect(args).toContain("-protocol_whitelist");
    expect(args).toContain("-format_whitelist");
  });

  it("mantém cópia de codec para WebM/Opus mesmo com marca", async () => {
    const run = vi.fn(async (args: string[]) => {
      await writeFile(args.at(-1)!, Buffer.from("ogg-convertido"));
    });
    const resultado = await transcodificarNotaDeVoz(
      { buffer: original, mime: "audio/webm", notaDeVoz: true },
      { run },
    );
    expect(resultado.convertido).toBe(true);
    const args = run.mock.calls[0]![0];
    expect(args).toContain("copy");
    expect(args).not.toContain("libopus");
  });

  it("não tenta transcodificar vídeo mp4 com marca inesperada", async () => {
    expect(precisaTranscodificar("video/mp4", true)).toBe(false);
  });

  it("falha do ffmpeg preserva os bytes e o MIME originais", async () => {
    const run = vi.fn(async () => { throw new Error("ffmpeg indisponível"); });
    const resultado = await transcodificarNotaDeVoz(
      { buffer: original, mime: "audio/mp4", notaDeVoz: true },
      { run },
    );
    expect(resultado).toEqual({ buffer: original, mime: "audio/mp4", convertido: false });
  });
});
