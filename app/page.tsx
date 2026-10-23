import Link from "next/link";
import { redirect } from "next/navigation";

import { marcaDaSaida } from "@/lib/branding/saida";
import { idiomaDoVisitante } from "@/lib/i18n/idiomaAnonimo";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

/**
 * Entrada pública da instalação: apresentação do produto e explicação das
 * integrações Google para visitantes sem sessão. Autenticados seguem a /app.
 * Os links legais permanecem públicos e visíveis, inclusive em telas pequenas.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  const marca = await marcaDaSaida(null);
  const idioma = await idiomaDoVisitante(null);
  const t = (texto: string) => traduzir(texto, idioma);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#050917] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_38%_26%,rgba(24,110,255,.22),transparent_47%),radial-gradient(ellipse_at_80%_65%,rgba(162,45,238,.15),transparent_42%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(111,133,190,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(111,133,190,.08)_1px,transparent_1px)] [background-size:72px_72px]" />

      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label={marca.nome} className="flex items-center gap-3">
            {marca.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={marca.logoUrl} alt={marca.nome} className="h-11 w-auto max-w-[185px] object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/brand/elus/logo-horizontal.png" alt={marca.nome} className="h-11 w-auto max-w-[185px] object-contain" />
            )}
          </Link>
          <nav aria-label={t("Navegação principal")} className="flex items-center gap-3 sm:gap-6">
            <Link href="/legal/privacy" className="hidden text-sm text-slate-300 transition-colors hover:text-white sm:inline">{t("Privacidade")}</Link>
            <Link href="/legal/terms" className="hidden text-sm text-slate-300 transition-colors hover:text-white md:inline">{t("Termos de Uso")}</Link>
            <Link href="/login" className="rounded-xl border border-blue-400/60 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">{t("Acessar minha conta")}</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:min-h-[670px] lg:grid-cols-[minmax(0,1.12fr)_minmax(340px,.88fr)] lg:gap-16 lg:px-12 lg:py-20">
        <section aria-labelledby="elus-title" className="relative">
          <div className="mb-7 inline-flex rounded-full border border-blue-400/25 bg-blue-400/10 px-4 py-2 text-xs font-semibold tracking-[.15em] text-blue-200 uppercase">{t("Atendimento · Vendas · Inteligência artificial")}</div>
          <h1 id="elus-title" className="max-w-2xl text-5xl leading-[1.06] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            {t("O CRM que")} <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent">{t("trabalha por você.")}</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-300">
            {t("O")} {marca.nome} {t("reúne em um só lugar as conversas com os clientes, o funil de vendas, a agenda de atendimentos e agentes de inteligência artificial que respondem, qualificam o interesse e passam a conversa para uma pessoa quando é preciso.")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white shadow-lg shadow-blue-900/30 transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">{t("Entrar na plataforma")} <span aria-hidden="true" className="ml-2">→</span></Link>
            <a href="https://elus360.com.br/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-7 py-3 font-semibold text-slate-100 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">{t("Conhecer o Elus 360")} <span aria-hidden="true" className="ml-2">↗</span></a>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {[
              [t("Atendimento centralizado"), t("Conversas e histórico em um só lugar.")],
              [t("Agentes de IA"), t("Atendimento e qualificação com transferência para pessoas.")],
              [t("Funil de vendas"), t("Acompanhe oportunidades e clientes.")],
              [t("Agenda integrada"), t("Organize compromissos da operação.")],
            ].map(([titulo, descricao]) => (
              <div key={titulo} className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
                <div className="mb-3 h-1 w-9 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
                <h2 className="font-semibold text-white">{titulo}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{descricao}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-label={t("Acesso ao Elus")} className="relative">
          <div aria-hidden="true" className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-gradient-to-br from-blue-600/20 to-fuchsia-600/20 blur-3xl" />
          <div className="overflow-hidden rounded-[30px] border border-blue-300/15 bg-[#0b1228]/85 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
            <div className="mx-auto mb-6 flex h-44 items-center justify-center sm:h-52">
              {/* Símbolo aprovado do ELUS; não cria outro mascote ou marca. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/elus/logo-symbol.png" alt="" className="h-full w-full object-contain drop-shadow-[0_20px_45px_rgba(85,61,255,.35)]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("Acessar o Elus")}</h2>
            <p className="mt-2 text-slate-300">{t("Entre na sua conta para continuar.")}</p>
            <Link href="/login" className="mt-7 flex min-h-13 w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">
              {t("Entrar na plataforma")} <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <a href="https://elus360.com.br/" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-center font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">{t("Conhecer o Elus 360")} ↗</a>

            <div className="mt-8 rounded-2xl border border-blue-400/20 bg-blue-400/[.06] p-5">
              <p className="text-sm font-semibold text-blue-100">{t("Integrações com o Google")}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {t("Quando a empresa conecta o Google Agenda, o")} {marca.nome} {t("mostra a ocupação da agenda e cria, altera e cancela os agendamentos pedidos pela própria pessoa. Quando conecta o Google Ads, devolve ao anúncio as vendas que ele trouxe. O uso dos dados do Google está descrito na")}{" "}
                <Link href="/legal/privacy#dados-do-google" className="font-medium text-blue-300 underline underline-offset-4 hover:text-white">{t("Política de Privacidade")}</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-sm text-slate-400 sm:px-8 lg:px-12">
          <p>{marca.nome}</p>
          <nav aria-label={t("Informações legais")} className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-white">{t("Política de Privacidade")}</Link>
            <Link href="/legal/terms" className="underline underline-offset-4 hover:text-white">{t("Termos de Uso")}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
