/**
 * Nota de voz gravada no browser → o formato que o WhatsApp aceita.
 *
 * ─── O defeito, medido em produção ──────────────────────────────────────────
 *
 * O `MediaRecorder` do Chrome não sabe gravar `audio/ogg`. Ele aceita o pedido,
 * cai no fallback `audio/webm;codecs=opus`, e o áudio sai do CRM nesse
 * container. O canal oficial recusa depois de aceitar o envio:
 *
 *   131053 — Media upload error — WhatsApp could not download the media
 *   attachment. Make sure the media URL is publicly accessible and in a
 *   supported format.
 *
 * A mensagem culpa a URL, e a URL estava certa: `webm` simplesmente não está na
 * lista de formatos de áudio aceitos (MP3, OGG, AMR, AAC). O operador vê
 * "falhou" numa nota de voz que gravou normalmente, sem nada dizendo o motivo
 * real.
 *
 * ─── Por que converter no UPLOAD, e não no envio ────────────────────────────
 *
 * Convertendo uma vez, ao guardar, TODO canal recebe um arquivo válido — e o
 * mesmo áudio pode ser reenviado, encaminhado ou usado por outro canal depois
 * sem repetir o trabalho. Converter no envio faria a mesma gravação ser
 * transcodificada a cada destinatário, e deixaria o arquivo guardado num
 * formato que só um canal aceita.
 *
 * ─── Por que não simplesmente mandar sem `voiceNote` ────────────────────────
 *
 * Porque não resolve: `webm` não é aceito nem como anexo comum. E porque a nota
 * de voz É o formato — chegar como arquivo anexo, sem a bolha e sem a onda,
 * muda o que a pessoa recebe.
 *
 * O codec já é opus dos dois lados; o que muda é o CONTAINER. Por isso
 * `-c:a copy`: sem reencodar, sem perda, e rápido o bastante para caber no
 * caminho do upload.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * O que o WhatsApp aceita como nota de voz.
 *
 * O `codecs=opus` NÃO é enfeite: a doc do canal oficial lista
 * `audio/ogg (OPUS codecs only; base audio/ogg not supported)`. Guardar o
 * arquivo como `audio/ogg` puro faz o Storage servir esse Content-Type, e a
 * plataforma recusa o download com o MESMO `131053` que o cabeçalho deste
 * arquivo descreve — a conversão acertava o container e errava a etiqueta.
 *
 * O defeito só aparecia no Chrome, e é por isso que passou: o Firefox grava
 * direto em `audio/ogg;codecs=opus` (`AudioRecorder.tsx`, `PREFERRED_MIMES`),
 * não passa por aqui, e a nota de voz dele sempre chegou. Esta é literalmente a
 * mesma string que o browser usa quando sabe gravar ogg.
 */
export const VOICE_MIME = "audio/ogg;codecs=opus";

/** Teto de segurança: nota de voz é curta, e acima disto é outra coisa. */
const MAX_BYTES = 16 * 1024 * 1024;
/** Não permitir que ffmpeg prenda o processo por tempo indefinido. */
const PRAZO_FFMPEG_MS = 30_000;

/**
 * Precisa converter? Só `webm` com opus — o resto ou já serve, ou não é nosso
 * problema resolver aqui.
 */
export function precisaTranscodificar(mime: string, notaDeVoz = false): boolean {
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "audio/webm" || base === "video/webm") return true;
  // Só reencodar áudio AAC/MP4 quando o gravador o identificou como nota de voz.
  // Arquivos de áudio enviados normalmente devem permanecer intactos.
  return notaDeVoz && base.startsWith("audio/") && base !== "audio/ogg" && base !== "audio/opus";
}

export interface Transcodificacao {
  buffer: Buffer;
  mime: string;
  /** `false` = devolvido intacto, porque não precisava (ou não deu). */
  convertido: boolean;
}

/** Roda ffmpeg; rejeita se sair diferente de zero. Injetável para teste. */
async function runFfmpeg(args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-nostdin", "-y", ...args], { cwd });
    const prazo = setTimeout(() => proc.kill("SIGKILL"), PRAZO_FFMPEG_MS);
    proc.on("close", () => clearTimeout(prazo));
    proc.on("error", () => clearTimeout(prazo));
    let erro = "";
    proc.stderr?.on("data", (d: Buffer) => {
      // Só o fim interessa: ffmpeg escreve muito e o erro vem por último.
      erro = (erro + d.toString()).slice(-500);
    });
    proc.on("error", (err) => reject(new Error(`ffmpeg_spawn_failed: ${err.message}`)));
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg_exit_${code}: ${erro}`)),
    );
  });
}

/**
 * WebM/Opus → Ogg/Opus, trocando só o container.
 *
 * Falha devolve o original INTACTO, não erro: um áudio que talvez não saia é
 * melhor que um envio que morre antes de tentar — e o canal que aceita webm
 * (porque converte sozinho) continua funcionando como sempre.
 */
export async function transcodificarNotaDeVoz(
  input: { buffer: Buffer; mime: string; notaDeVoz?: boolean },
  deps: { run?: typeof runFfmpeg } = {},
): Promise<Transcodificacao> {
  if (!precisaTranscodificar(input.mime, input.notaDeVoz)) {
    return { buffer: input.buffer, mime: input.mime, convertido: false };
  }
  if (input.buffer.length > MAX_BYTES) {
    return { buffer: input.buffer, mime: input.mime, convertido: false };
  }

  const executar = deps.run ?? runFfmpeg;
  const dir = await mkdtemp(join(tmpdir(), "voz-"));
  try {
    const entrada = join(dir, "in.audio");
    const saida = join(dir, "out.ogg");
    await writeFile(entrada, input.buffer);
    // WebM/Opus só troca o container. AAC do iPhone, explicitamente marcado
    // como nota de voz, exige libopus; não converter m4a enviado como anexo.
    const base = input.mime.split(";")[0]?.trim().toLowerCase() ?? "";
    const webm = base === "audio/webm" || base === "video/webm";
    const codec = webm
      ? ["-c:a", "copy"]
      : ["-c:a", "libopus", "-b:a", "24k", "-ac", "1", "-ar", "48000"];
    // Somente protocolos e formatos locais permitidos ao ffmpeg.
    await executar([
      "-protocol_whitelist", "file",
      "-format_whitelist", "ogg,matroska,webm,mov,mp4,m4a,3gp,3g2,mj2",
      "-i", entrada, "-vn", ...codec, "-f", "ogg", saida,
    ], dir);
    const buffer = await readFile(saida);
    if (buffer.length === 0) return { buffer: input.buffer, mime: input.mime, convertido: false };
    return { buffer, mime: VOICE_MIME, convertido: true };
  } catch {
    return { buffer: input.buffer, mime: input.mime, convertido: false };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
