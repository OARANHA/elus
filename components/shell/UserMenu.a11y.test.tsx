import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  idioma: "pt-BR" as string,
  usuario: {
    avatar_url: null as string | null,
    email: "ana@example.test",
    full_name: "Ana Nogueira",
    is_platform_admin: false,
  },
};

vi.mock("@/hooks/i18n/useT", () => ({
  useT: () => (texto: string) => texto,
}));
vi.mock("@/lib/i18n/IdiomaProvider", () => ({
  useIdioma: () => state.idioma,
  useAplicarIdioma: () => vi.fn(),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => state.usuario,
  useAuth: () => ({ signOut: vi.fn() }),
}));
vi.mock("@/app/actions/settings/trocarIdioma", () => ({
  trocarIdioma: vi.fn(),
}));
vi.mock("@/components/theme/theme-toggle", () => ({
  ThemeToggle: () => <button type="button" aria-label="Alternar tema" />,
}));

import { SeletorDeIdioma } from "./SeletorDeIdioma";
import { UserMenu } from "./UserMenu";

describe("rótulos acessíveis dos controles do cabeçalho", () => {
  beforeEach(() => {
    state.idioma = "pt-BR";
    state.usuario = {
      avatar_url: null,
      email: "ana@example.test",
      full_name: "Ana Nogueira",
      is_platform_admin: false,
    };
  });

  it("inclui no nome acessível o código de idioma mostrado no botão", () => {
    render(<SeletorDeIdioma />);
    const botao = screen.getByTestId("seletor-de-idioma");
    const textoVisivel = botao.textContent?.trim() ?? "";

    expect(textoVisivel).toBeTruthy();
    expect(botao.getAttribute("aria-label")).toContain(textoVisivel);
  });

  it("inclui no nome acessível as iniciais mostradas no avatar", () => {
    render(<UserMenu />);
    const botao = screen.getByRole("button", { name: /Menu do usuário/ });
    const iniciaisVisiveis = botao.textContent?.trim() ?? "";

    expect(iniciaisVisiveis).toBe("AN");
    expect(botao.getAttribute("aria-label")).toContain(iniciaisVisiveis);
  });
});
