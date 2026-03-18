// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/api-key", () => ({
  hashApiKey: vi.fn(),
}));

vi.mock("@/lib/db/api-keys", () => ({
  findApiKeyByHash: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    apiKey: {
      update: vi.fn(),
    },
  },
}));

const { authenticateApiKey, resolveUserId } = await import("@/lib/auth/api-key-middleware");
const apiKeyModule = await import("@/lib/auth/api-key");
const authConfigModule = await import("@/lib/auth/config");
const dbModule = await import("@/lib/db/api-keys");
const clientModule = await import("@/lib/db/client");

describe("src/lib/auth/api-key-middleware.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientModule.prisma.apiKey.update).mockResolvedValue({} as never);
  });

  it("returns null without an authorization header", async () => {
    const request = new Request("http://localhost/api/v1/links");

    await expect(authenticateApiKey(request)).resolves.toBeNull();
    expect(apiKeyModule.hashApiKey).not.toHaveBeenCalled();
  });

  it("returns null for a non-bearer authorization header", async () => {
    const request = new Request("http://localhost/api/v1/links", {
      headers: { authorization: "Basic token" },
    });

    await expect(authenticateApiKey(request)).resolves.toBeNull();
    expect(apiKeyModule.hashApiKey).not.toHaveBeenCalled();
  });

  it("returns null for an empty bearer token", async () => {
    const request = new Request("http://localhost/api/v1/links", {
      headers: { authorization: "Bearer   " },
    });

    await expect(authenticateApiKey(request)).resolves.toBeNull();
    expect(apiKeyModule.hashApiKey).not.toHaveBeenCalled();
  });

  it("returns null when the api key hash is not found", async () => {
    vi.mocked(apiKeyModule.hashApiKey).mockReturnValue("hash-123");
    vi.mocked(dbModule.findApiKeyByHash).mockResolvedValue(null);

    const request = new Request("http://localhost/api/v1/links", {
      headers: { authorization: "Bearer lb_secret" },
    });

    await expect(authenticateApiKey(request)).resolves.toBeNull();
    expect(apiKeyModule.hashApiKey).toHaveBeenCalledWith("lb_secret");
    expect(dbModule.findApiKeyByHash).toHaveBeenCalledWith("hash-123");
    expect(clientModule.prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it("returns api key auth context and updates lastUsedAt for a valid key", async () => {
    vi.mocked(apiKeyModule.hashApiKey).mockReturnValue("hash-123");
    vi.mocked(dbModule.findApiKeyByHash).mockResolvedValue({
      id: "key-123",
      userId: "user-123",
      keyHash: "hash-123",
    });

    const request = new Request("http://localhost/api/v1/links", {
      headers: { authorization: "Bearer lb_secret" },
    });

    await expect(authenticateApiKey(request)).resolves.toEqual({
      userId: "user-123",
      apiKeyId: "key-123",
    });
    expect(clientModule.prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: "key-123" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});

describe("resolveUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientModule.prisma.apiKey.update).mockResolvedValue({} as never);
  });

  it("returns the userId from api key auth when a valid bearer token is present", async () => {
    vi.mocked(apiKeyModule.hashApiKey).mockReturnValue("hash-123");
    vi.mocked(dbModule.findApiKeyByHash).mockResolvedValue({
      id: "key-123",
      userId: "user-from-api-key",
      keyHash: "hash-123",
    });

    const request = new Request("http://localhost/api/v1/links", {
      headers: { authorization: "Bearer lb_secret" },
    });

    await expect(resolveUserId(request)).resolves.toBe("user-from-api-key");
    expect(authConfigModule.auth).not.toHaveBeenCalled();
  });

  it("falls back to session auth when no api key is provided", async () => {
    vi.mocked(authConfigModule.auth).mockResolvedValue({
      user: { id: "user-from-session", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    } as never);

    const request = new Request("http://localhost/api/v1/links");

    await expect(resolveUserId(request)).resolves.toBe("user-from-session");
    expect(authConfigModule.auth).toHaveBeenCalled();
  });

  it("returns null when neither api key nor session is available", async () => {
    vi.mocked(authConfigModule.auth).mockResolvedValue(null as never);

    const request = new Request("http://localhost/api/v1/links");

    await expect(resolveUserId(request)).resolves.toBeNull();
  });
});
