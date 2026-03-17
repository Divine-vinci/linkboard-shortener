import NextAuth from "next-auth";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({
  env: {
    AUTH_SECRET: "test-secret",
    GITHUB_CLIENT_ID: "github-id",
    GITHUB_CLIENT_SECRET: "github-secret",
    GOOGLE_CLIENT_ID: "google-id",
    GOOGLE_CLIENT_SECRET: "google-secret",
  },
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

vi.mock("@/lib/db/users", () => ({
  findUserByEmail: vi.fn(),
}));

vi.mock("@/lib/validations/auth", () => ({
  loginSchema: {
    safeParse: vi.fn(),
  },
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({ adapter: true })),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

describe("src/lib/auth/config.ts", () => {
  it("registers credentials, GitHub, and Google providers", async () => {
    const { buildAuthProviders } = await import("@/lib/auth/config");

    const providers = buildAuthProviders();

    expect(providers).toHaveLength(3);
    expect(providers.map((provider) => provider.id)).toEqual(["credentials", "github", "google"]);
  });

  it("enables allowDangerousEmailAccountLinking for OAuth providers", async () => {
    const { buildAuthProviders } = await import("@/lib/auth/config");

    const providers = buildAuthProviders();
    const github = providers.find((p) => p.id === "github");
    const google = providers.find((p) => p.id === "google");

    expect(github?.options?.allowDangerousEmailAccountLinking).toBe(true);
    expect(google?.options?.allowDangerousEmailAccountLinking).toBe(true);
  });

  it("configures pages.signIn and pages.error to /login", async () => {
    await import("@/lib/auth/config");

    const nextAuthCall = vi.mocked(NextAuth).mock.calls[0]?.[0] as Record<string, unknown>;

    expect(nextAuthCall.pages).toEqual({
      signIn: "/login",
      error: "/login",
    });
  });

  it("uses JWT session strategy with the Prisma adapter", async () => {
    await import("@/lib/auth/config");

    const nextAuthCall = vi.mocked(NextAuth).mock.calls[0]?.[0] as Record<string, unknown>;

    expect(nextAuthCall.session).toEqual(
      expect.objectContaining({ strategy: "jwt" }),
    );
    expect(nextAuthCall.adapter).toBeDefined();
  });

  it("does not register an OAuth provider when its credentials are missing", async () => {
    vi.resetModules();
    vi.doMock("@/config/env", () => ({
      env: {
        AUTH_SECRET: "test-secret",
        GITHUB_CLIENT_ID: "",
        GITHUB_CLIENT_SECRET: "",
        GOOGLE_CLIENT_ID: "google-id",
        GOOGLE_CLIENT_SECRET: "google-secret",
      },
    }));

    const { buildAuthProviders, oauthProviderAvailability } = await import("@/lib/auth/config");
    const providers = buildAuthProviders();

    expect(oauthProviderAvailability).toEqual({
      github: false,
      google: true,
    });
    expect(providers.map((provider) => provider.id)).toEqual(["credentials", "google"]);
  });
});
