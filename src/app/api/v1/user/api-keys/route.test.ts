// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/api-key", () => ({ generateApiKey: vi.fn() }));
vi.mock("@/lib/db/api-keys", () => ({ createApiKey: vi.fn(), findApiKeysByUserId: vi.fn() }));

const { GET, POST } = await import("@/app/api/v1/user/api-keys/route");
const authModule = await import("@/lib/auth/config");
const apiKeyAuthModule = await import("@/lib/auth/api-key");
const dbModule = await import("@/lib/db/api-keys");
const mockedAuth = authModule.auth as ReturnType<typeof vi.fn>;

describe("src/app/api/v1/user/api-keys/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated GET requests", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("lists the authenticated user's API keys", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123" } });
    vi.mocked(dbModule.findApiKeysByUserId).mockResolvedValue([
      { id: "key-123", name: "Deploy", keyPrefix: "lb_abcd", createdAt: new Date("2026-03-18T20:00:00.000Z"), lastUsedAt: null },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(dbModule.findApiKeysByUserId).toHaveBeenCalledWith("user-123");
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: "key-123",
          name: "Deploy",
          keyPrefix: "lb_abcd",
          createdAt: "2026-03-18T20:00:00.000Z",
          lastUsedAt: null,
        },
      ],
    });
  });

  it("returns 401 for unauthenticated POST requests", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/v1/user/api-keys", { method: "POST", body: JSON.stringify({ name: "Deploy" }) }));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payloads", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123" } });

    const response = await POST(new Request("http://localhost/api/v1/user/api-keys", { method: "POST", body: JSON.stringify({ name: "   " }) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid API key input",
        details: {
          fields: {
            name: "Name is required",
          },
        },
      },
    });
  });

  it("returns 400 for names longer than 100 chars", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123" } });

    const response = await POST(new Request("http://localhost/api/v1/user/api-keys", { method: "POST", body: JSON.stringify({ name: "a".repeat(101) }) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid API key input",
        details: {
          fields: {
            name: "Name must be 100 characters or fewer",
          },
        },
      },
    });
  });

  it("creates an API key and returns the raw key once", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123" } });
    vi.mocked(apiKeyAuthModule.generateApiKey).mockReturnValue({ rawKey: "lb_secret", keyHash: "hash-123", keyPrefix: "lb_secre" });
    vi.mocked(dbModule.createApiKey).mockResolvedValue({
      id: "key-123",
      name: "Deploy",
      keyPrefix: "lb_secre",
      createdAt: new Date("2026-03-18T20:00:00.000Z"),
    });

    const response = await POST(new Request("http://localhost/api/v1/user/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: "  Deploy  " }),
    }));

    expect(response.status).toBe(201);
    expect(dbModule.createApiKey).toHaveBeenCalledWith({
      userId: "user-123",
      name: "Deploy",
      keyHash: "hash-123",
      keyPrefix: "lb_secre",
    });
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "key-123",
        name: "Deploy",
        keyPrefix: "lb_secre",
        rawKey: "lb_secret",
        createdAt: "2026-03-18T20:00:00.000Z",
      },
    });
  });
});
