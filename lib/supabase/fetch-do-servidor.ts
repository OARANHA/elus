/**
 * O `global.fetch` dos clients de SERVIDOR (#1082 / PR #1786).
 *
 * ─── Por que ele existe ──────────────────────────────────────────────────────
 *
 * A URL-base que se passa a `createClient`/`createServerClient` é a ORIGEM de
 * tudo que o SDK monta a partir dela. `signInWithOAuth` devolve
 * `${url}/auth/v1/authorize?…` e o storage devolve
 * `${urlStorage}/object/sign/…` — sem nenhuma chamada de rede no primeiro caso.
 * Se a base for a `SUPABASE_SERVER_URL`, esses links saem no endereço interno
 * (`http://kong:8000`) e chegam justamente a quem não o alcança: mídia, avatar,
 * fotos de produto, PDF da LGPD e login com Google apontados para o Kong.
 *
 * A correção é manter a base na URL PÚBLICA e desviar só o TRANSPORTE: este
 * fetch recebe as requisições do SDK já montadas na origem pública e reescreve
 * o prefixo para o endereço interno. O link continua saindo público, e o
 * caminho deixa de sair da rede.
 *
 * O inverso não fecha: com a base interna não há como adivinhar qual resposta
 * vira link e qual é só tráfego.
 *
 * ─── O que ele NÃO faz ──────────────────────────────────────────────────────
 *
 * Não decide nada. Quem passa os dois valores é o client que o chama, e a
 * política de qual endereço vale (trim, recusa do que não é http(s), aviso) é
 * de `urlDoSupabaseNoServidor`, uma vez só. Aqui só há uma comparação de
 * prefixo — e prefixo que não bate passa adiante, intacto: requisição para
 * outro host não é nossa.
 *
 * `lib/supabase/browser.ts` não usa isto. O navegador continua inteiro na URL
 * pública.
 */

/** Tira a barra que o `.env` pode trazer: `https://x/` + `storage/…` viraria `//`. */
function semBarraFinal(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Cria o fetch que desvia as requisições do SDK para o endereço interno do
 * servidor.
 *
 * `urlInterna` chega JÁ RESOLVIDA (quem chama passa o resultado de
 * `urlDoSupabaseNoServidor`) e `urlPublica` é a mesma `NEXT_PUBLIC_*` que serve
 * de base ao client. Sem variável — ou com um valor que o resolvedor recusou —
 * os dois são iguais e o transporte é exatamente o de antes.
 *
 * A reescrita é LAZY de propósito: `globalThis.fetch` é lido na hora da
 * chamada, nunca na hora de criar o client. É o que permite ao teste trocar o
 * fetch global e observar o destino sem tocar no SDK.
 */
export function fetchDoServidor(urlInterna: string, urlPublica: string): typeof globalThis.fetch {
  const interna = semBarraFinal(urlInterna);
  const publica = semBarraFinal(urlPublica);

  if (!interna || interna === publica) {
    return (input, init) => globalThis.fetch(input, init);
  }

  const desviar = (alvo: string): string => {
    if (alvo === publica) return interna;
    if (alvo.startsWith(`${publica}/`)) return interna + alvo.slice(publica.length);
    return alvo;
  };

  return (input, init) => {
    if (typeof input === "string") {
      return globalThis.fetch(desviar(input), init);
    }

    if (input instanceof URL) {
      const destino = desviar(input.href);
      return globalThis.fetch(destino === input.href ? input : new URL(destino), init);
    }

    // O SDK do Supabase sempre passa string; o Request está aqui para o
    // `global.fetch` ser honesto, não para um caso de uso do produto.
    const destino = desviar(input.url);
    if (destino === input.url) return globalThis.fetch(input, init);
    return globalThis.fetch(new Request(destino, input as unknown as RequestInit), init);
  };
}


/**
 * O proxy e o cliente SSR validam a sessão por `/auth/v1/user`. Na ocorrência
 * real de 19/10/2026, o gateway do Supabase registrou respostas dessa rota
 * acima de 60 s (pico de 224 s); uma navegação protegida esperava até o 524
 * do Cloudflare. O timeout cobre a validação/renovação de sessão e as leituras de\n * autoridade indispensáveis ao layout. Consultas de negócio, uploads e\n * mutações continuam sem esse limite.
 *
 * Não usamos Promise.race: abortar o fetch evita deixar uma requisição órfã.
 * Preservamos o AbortSignal do chamador, inclusive cancelamento de navegação.
 * A falha continua FECHADA: nem cookie nem JWT passam a ser aceitos offline.
 */
export const PRAZO_AUTENTICACAO_MS = 10_000;

export function fetchAuthComPrazo(
  baseFetch: typeof globalThis.fetch,
  prazoMs: number = PRAZO_AUTENTICACAO_MS,
): typeof globalThis.fetch {
  return (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let caminho: string;
    try {
      caminho = new URL(url).pathname;
    } catch {
      return baseFetch(input, init);
    }
    // GETs de identidade/membership e RPCs de autorização (POST somente leitura).
    // Não interromper consultas de negócio, mutações nem uploads.
    const caminhoDeAutenticacao = caminho === "/auth/v1/user" || caminho === "/auth/v1/token";
    const leituraDeIdentidade =
      caminho === "/rest/v1/user_organizations" ||
      caminho === "/rest/v1/platform_admins" ||
      caminho === "/rest/v1/organizations";
    const rpcDeAutorizacao =
      caminho === "/rest/v1/rpc/fn_support_context" ||
      caminho === "/rest/v1/rpc/fn_is_platform_admin" ||
      caminho === "/rest/v1/rpc/fn_user_role_in_org";
    const metodo = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (
      !(caminhoDeAutenticacao || rpcDeAutorizacao || (leituraDeIdentidade && metodo === "GET"))
    ) {
      return baseFetch(input, init);
    }

    const anterior = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const limite = AbortSignal.timeout(prazoMs);
    const signal = anterior ? AbortSignal.any([anterior, limite]) : limite;
    return baseFetch(input, { ...init, signal });
  };
}
