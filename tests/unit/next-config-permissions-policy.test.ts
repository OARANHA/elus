import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Regressão do console de /login: "notifications" não é uma diretiva
// Permissions-Policy suportada pelo Chromium. A Notifications API usa
// permissão da origem (Notification.requestPermission), não este header.
describe("Permissions-Policy do Next.js", () => {
  it("preserva as restrições suportadas sem a diretiva notifications", () => {
    const source = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    const policy = source.match(/key: "Permissions-Policy",\s*value: "([^"]+)"/)?.[1];

    expect(policy).toBe("camera=(), microphone=(self), geolocation=()");
    expect(policy).not.toContain("notifications");
  });
});
