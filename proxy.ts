import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookieSecure } from "@/lib/supabase/cookie-secure";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { fetchAuthComPrazo, fetchDoServidor } from "@/lib/supabase/fetch-do-servidor";
import { erroTransitorioDeAuth } from "@/lib/auth/erro-transitorio";
import { urlDoSupabaseNoServidor } from "@/lib/supabase/url-do-servidor";
import { isPublicPath } from "@/lib/auth/public-paths";
import { CABECALHO_SEM_CSS, PARAMETRO_SEM_CSS } from "@/lib/branding/sem-css-personalizado";
import {
  verifyImpersonateCookieEdge,
  IMPERSONATE_COOKIE_NAME_EDGE,
} from "@/lib/impersonate/cookie-edge";

const COOKIE_NAME = "sb-deskcomm-auth";

/** Falha de upstream NÃO equivale a logout nem a proibição de admin. */
function authIndisponivel(pathname: string, requestId: string): NextResponse {
  const headers = {
    "Cache-Control": "no-store",
    "Retry-After": "5",
    "X-Request-Id": requestId,
  };
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "auth_temporarily_unavailable", message: "Validação de sessão indisponível. Tente novamente." } },
      { status: 503, headers },
    );
  }
  return new NextResponse(
    "A autenticação está temporariamente indisponível. Recarregue a página em alguns segundos.",
    { status: 503, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } },
  );
}

export async function proxy(request: NextRequest) {
  // Saída de emergência do CSS personalizado. ANTES do `NextResponse.next`: ele
  // copia os cabeçalhos da requisição no momento em que é criado, e o que for
  // posto depois não chega aos Server Components. Sempre gravado, para um
  // cabeçalho forjado pelo cliente não valer.
  request.headers.set(
    CABECALHO_SEM_CSS,
    request.nextUrl.searchParams.has(PARAMETRO_SEM_CSS) ? "1" : "0",
  );
  const response = NextResponse.next({ request: { headers: request.headers } });

  // Inject X-Request-Id for downstream correlation (audit log, error wrappers).
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  response.headers.set("x-request-id", requestId);

  const { pathname, search } = request.nextUrl;
  // Recupera retornos de OAuth social já emitidos antes da landing pública existir.
  // Apenas a navegação é tratada: o vínculo de conta segue protegido pelos guards canônicos.
  // Passa adiante só o SINAL `connected=1` — nunca o `connect_token` nem o valor recebido.
  if (
    request.method === "GET" &&
    pathname === "/app/connections" &&
    request.nextUrl.searchParams.has("connected") &&
    request.nextUrl.searchParams.has("connect_token")
  ) {
    const landing = NextResponse.redirect(new URL("/auth/social-return?connected=1", request.url));
    landing.headers.set("Cache-Control", "no-store");
    landing.headers.set("Referrer-Policy", "no-referrer");
    return landing;
  }
  // Expose pathname to Server Components via header (used by onboarding layout).
  response.headers.set("x-pathname", pathname);
  request.headers.set("x-pathname", pathname);

  // EPIC-11: the admin surface is reached by PATH (`/admin/*`) — the self-host kit
  // points `NEXT_PUBLIC_ADMIN_URL` at the same host as the app and maps no `admin.`
  // sub-domain. The host-based branch below stays a NOOP today and only exists as
  // documentation of the intended deploy topology.
  const host = request.headers.get("host") ?? "";
  const isAdminSurface = host.startsWith("admin.") || pathname.startsWith("/admin");

  if (isPublicPath(pathname)) {
    return response;
  }

  const supabase = createServerClient(
    // #1082: base na URL pública, endereço interno só no transporte (ver
    // `lib/supabase/fetch-do-servidor.ts`). O middleware não gera link, mas
    // segue a mesma regra dos outros dois clients — um desenho só.
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: fetchAuthComPrazo(
          fetchDoServidor(
            urlDoSupabaseNoServidor(env.SUPABASE_SERVER_URL, env.NEXT_PUBLIC_SUPABASE_URL),
            env.NEXT_PUBLIC_SUPABASE_URL,
          ),
        ),
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
      cookieOptions: {
        name: COOKIE_NAME,
        sameSite: "strict",
        httpOnly: true,
        secure: cookieSecure(),
        path: "/",
      },
    },
  );

  // Falha de rede do GoTrue NÃO é prova de sessão inválida: devolve 503 sem
  // aceitar JWT offline e sem transformar 524 em redirect /login.
  let autenticacao: Awaited<ReturnType<typeof supabase.auth.getUser>>;
  try {
    autenticacao = await supabase.auth.getUser();
  } catch {
    console.warn("[auth] validação da sessão indisponível no proxy", { requestId });
    return authIndisponivel(pathname, requestId);
  }
  if (erroTransitorioDeAuth(autenticacao.error)) {
    console.warn("[auth] upstream do Supabase Auth indisponível", {
      requestId,
      codigo: autenticacao.error?.name ?? null,
      status: autenticacao.error?.status ?? null,
    });
    return authIndisponivel(pathname, requestId);
  }
  // Sem identidade validada, seja sessão ausente/expirada ou credencial rejeitada,
  // o comportamento seguro continua sendo 401 (API) ou login (página).
  const user = autenticacao.data.user;
  if (!user) {
    // API routes must respond with JSON envelope (contract: {error:{code,message}})
    // — never redirect HTML to JSON consumers. UI routes redirect to /login as before.
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({
          error: {
            code: "unauthenticated",
            message: "Authentication required",
          },
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/json",
            "x-request-id": requestId,
          },
        },
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // EPIC-11 S-11.07: validate impersonate cookie on /app/* paths. Middleware
  // runs in Edge — no DB access, only HMAC + expiry. On any failure we delete
  // the presentation cookie. The database support session remains authoritative:
  // expired/revoked support still blocks the app until explicit exit.
  if (pathname.startsWith("/app")) {
    const impCookie = request.cookies.get(IMPERSONATE_COOKIE_NAME_EDGE)?.value;
    if (impCookie) {
      const result = await verifyImpersonateCookieEdge(
        impCookie,
        env.IMPERSONATE_COOKIE_SECRET ?? "",
      );
      if (!result.valid) {
        console.warn(
          `[middleware] impersonate cookie invalid (${result.reason ?? "unknown"}) — clearing`,
        );
        response.cookies.delete(IMPERSONATE_COOKIE_NAME_EDGE);
      }
    }
  }

  // /admin/* additionally requires platform_admin (early gate — authoritative
  // check is server-side in `requirePlatformAdmin`). Skip the RPC for
  // `/admin/forbidden` (rendered to non-admins, would otherwise loop).
  if (isAdminSurface && pathname.startsWith("/admin") && pathname !== "/admin/forbidden") {
    // Uma falha de transporte pode vir como PostgREST error OU como exceção.
    // Nenhuma das duas comprova ausência de papel administrativo.
    let permAdmin: Awaited<ReturnType<typeof supabase.rpc>>;
    try {
      permAdmin = await supabase.rpc("fn_is_platform_admin");
    } catch {
      console.warn("[auth] consulta de papel de plataforma sem resposta", { requestId });
      return authIndisponivel(pathname, requestId);
    }
    if (permAdmin.error) {
      console.warn("[auth] permissão de plataforma indisponível", {
        requestId,
        codigo: permAdmin.error.code ?? null,
      });
      return authIndisponivel(pathname, requestId);
    }
    if (!permAdmin.data) {
      return NextResponse.redirect(new URL("/admin/forbidden", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except static assets / Next internals.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
