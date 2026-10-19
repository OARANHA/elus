/**
 * O GoTrue diferencia uma sessão ausente/inválida de indisponibilidade de rede.
 * Não transformar falha transitória em logout: a identidade segue SEM ser
 * autorizada, mas a resposta correta é indisponibilidade temporária (503).
 *
 * Status 401/403/400 e AuthSessionMissingError NÃO são transitórios.
 * Os nomes são conferidos como texto porque duas versões de @supabase/auth-js
 * podem coexistir na árvore (não confiar em instanceof).
 */
export function erroTransitorioDeAuth(
  erro: { name?: string; status?: number } | null | undefined,
): boolean {
  if (!erro) return false;
  if (
    erro.name === "AuthRetryableFetchError" ||
    erro.name === "AbortError" ||
    erro.name === "TimeoutError"
  ) {
    return true;
  }
  return typeof erro.status === "number" && (erro.status === 429 || erro.status >= 500);
}
