// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/api-keys", () => ({ deleteApiKey: vi.fn() }));

const { DELETE } = await import("@/app/api/v1/user/api-keys/[id]/route");
const authModule = await import("@/lib/auth/config");
const dbModule = await import("@/lib/db/api-keys");
const mockedAuth = authModule.auth as ReturnType<typeof vi.fn>;

describe("src/app/api/v1/user/api-keys/[id]/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated deletes", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/v1/user/api-keys/key-123", { method: "DELETE" }), { params: Promise.resolve({ id: "key-123" }) });

    expect(response.status).toBe(401);
  });

  it("deletes owned keys and returns 204", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123" } });
    vi.mocked(dbModule.deleteApiKey).mockResolvedValue(true);

    const response = await DELETE(new Request("http://localhost/api/v1/user/api-keys/key-123", { method: "DELETE" }), { params: Promise.resolve({ id: "key-123" }) });

    expect(response.status).toBe(204);
    expect(dbModule.deleteApiKey).toHaveBeenCalledWith("key-123", "user-123");
  });

  it("returns 404 when the key is missing or owned by another user", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123" } });
    vi.mocked(dbModule.deleteApiKey).mockResolvedValue(false);

    const response = await DELETE(new Request("http://localhost/api/v1/user/api-keys/key-404", { method: "DELETE" }), { params: Promise.resolve({ id: "key-404" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "API key not found",
      },
    });
  });
});
