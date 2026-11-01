/**
 * Contrato estático da baseline ELUS v1.89 candidata, separado da auditoria
 * das 38 migrations importadas. Não acessa rede/banco nem executa SQL.
 *
 * A comparação independente com upstream v1.89 fixado está documentada em
 * docs/integracao/elus-v189-auditoria-baseline-estatica-20261101.md.
 * Este teste NÃO substitui replay histórico, RLS/ACL ou aceite de produção.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Estado = "code" | "line" | "block" | "single" | "double" | "dollar";

function separarInstrucoes(sql: string): { instrucoes: string[]; estado: Estado } {
  const instrucoes: string[] = [];
  let atual = "";
  let estado: Estado = "code";
  let marcadorDollar = "";
  let profundidadeBloco = 0;
  let i = 0;

  function guardar(): void {
    const instrucao = atual.trim();
    if (instrucao) instrucoes.push(instrucao);
    atual = "";
  }

  while (i < sql.length) {
    const c = sql[i]!;
    const proximo = sql[i + 1];

    if (estado === "line") {
      if (c === "\n") {
        estado = "code";
        if (atual && !/\s$/.test(atual)) atual += " ";
      }
      i++;
      continue;
    }
    if (estado === "block") {
      if (c === "/" && proximo === "*") {
        profundidadeBloco++;
        i += 2;
      } else if (c === "*" && proximo === "/") {
        profundidadeBloco--;
        i += 2;
        if (profundidadeBloco === 0) estado = "code";
      } else {
        i++;
      }
      continue;
    }
    if (estado === "single") {
      atual += c;
      if (c === "'" && proximo === "'") {
        atual += proximo;
        i += 2;
      } else {
        if (c === "'" && sql[i - 1] !== "\\") estado = "code";
        i++;
      }
      continue;
    }
    if (estado === "double") {
      atual += c;
      if (c === '"' && proximo === '"') {
        atual += proximo;
        i += 2;
      } else {
        if (c === '"') estado = "code";
        i++;
      }
      continue;
    }
    if (estado === "dollar") {
      if (sql.startsWith(marcadorDollar, i)) {
        atual += marcadorDollar;
        i += marcadorDollar.length;
        estado = "code";
      } else {
        atual += c;
        i++;
      }
      continue;
    }

    if (c === "-" && proximo === "-") {
      estado = "line";
      i += 2;
      continue;
    }
    if (c === "/" && proximo === "*") {
      estado = "block";
      profundidadeBloco = 1;
      i += 2;
      continue;
    }
    if (c === "'") {
      estado = "single";
      atual += c;
      i++;
      continue;
    }
    if (c === '"') {
      estado = "double";
      atual += c;
      i++;
      continue;
    }
    if (c === "$") {
      const marcador = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i, i + 90));
      if (marcador) {
        marcadorDollar = marcador[0];
        estado = "dollar";
        atual += marcadorDollar;
        i += marcadorDollar.length;
        continue;
      }
    }
    if (c === ";") {
      guardar();
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      if (atual && !/\s$/.test(atual)) atual += " ";
      i++;
      continue;
    }
    atual += c;
    i++;
  }

  guardar();
  return { instrucoes, estado };
}

const ELUS = [
  "20261019120000_0689_integracoes_erp_vendaerp.sql",
  "20261020120000_0690_org_ai_autonomy_protected.sql",
  "20261020120001_0691_chutes_chat_catalog.sql",
  "20261020230000_0692_chutes_catalog_sync.sql",
  "20261026010000_0765_elus_rotacao_atomica_codigos_recuperacao.sql",
] as const;

describe("ELUS v1.89 — baseline candidata, contrato lexical offline", () => {
  it("mantém as cinco migrations próprias como bloco ordenado antes da cauda upstream", () => {
    const baseline = separarInstrucoes(readFileSync(
      new URL("../../supabase/baseline.sql", import.meta.url), "utf8",
    ));
    expect(baseline.estado).toBe("code");
    expect(baseline.instrucoes).toHaveLength(5505);

    const contagens = [11, 6, 3, 4, 3];
    const proprias = ELUS.map((nome, indice) => {
      const parsed = separarInstrucoes(readFileSync(
        new URL("../../supabase/migrations/" + nome, import.meta.url), "utf8",
      ));
      expect(parsed.estado, nome).toBe("code");
      expect(parsed.instrucoes, nome).toHaveLength(contagens[indice]!);
      return parsed.instrucoes;
    }).flat();

    expect(proprias).toHaveLength(27);
    // Auditoria independente: 5.036 instruções upstream, 27 ELUS, 442 upstream.
    // Sem o blob oficial armazenado localmente, este teste não prova a
    // equivalência das 5.478 instruções upstream; ver documento de auditoria.
    expect(baseline.instrucoes.slice(5036, 5063)).toEqual(proprias);
    expect(baseline.instrucoes.slice(5063)).toHaveLength(442);
  });
});
