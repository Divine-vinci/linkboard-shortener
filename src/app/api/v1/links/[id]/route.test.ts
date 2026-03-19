// @vitest-environment node

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/api-key-middleware", async () => {
  const { auth } = await import("@/lib/auth/config");
  const authenticateApiKey = vi.fn();
  return {
    authenticateApiKey,
    resolveApiRequestIdentity: async (request: Request) => {
      const apiKeyAuth = await authenticateApiKey(request);

      if (apiKeyAuth) {
        return { userId: apiKeyAuth.userId, rateLimitKey: `api-key:${apiKeyAuth.apiKeyId}`, kind: "apiKey" as const };
      }

      const session = await auth();
      const userId = session?.user?.id ?? null;
      return userId ? { userId, rateLimitKey: `user:${userId}`, kind: "user" as const } : null;
    },
  };
});

vi.mock("@/lib/db/links", () => ({
  deleteLink: vi.fn(),
  findLinkById: vi.fn(),
  updateLink: vi.fn(),
}));

const { __resetRateLimitStore } = await import("@/lib/rate-limit");
const { DELETE, GET, PATCH } = await import("@/app/api/v1/links/[id]/route");
const authModule = await import("@/lib/auth/config");
const apiKeyAuthModule = await import("@/lib/auth/api-key-middleware");
const links = await import("@/lib/db/links");

const mockedAuth = authModule.auth as Mock;
const mockedAuthenticateApiKey = apiKeyAuthModule.authenticateApiKey as Mock;

function buildLink(overrides: Partial<Record<string, unknown>> = {}) {
  const createdAt = new Date("2026-03-17T18:00:00.000Z");

  return {
    id: "link-123",
    slug: "meta123",
    targetUrl: "https://example.com",
    title: "Launch plan",
    description: "Docs to share during rollout.",
    tags: ["docs", "launch"],
    expiresAt: null,
    userId: "user-123",
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe("src/app/api/v1/links/[id]/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStore();
    mockedAuthenticateApiKey.mockResolvedValue(null);
  });

  it("gets an owned link with session auth", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } });
    vi.mocked(links.findLinkById).mockResolvedValue(buildLink());

    const response = await GET(new Request("http://localhost:3000/api/v1/links/link-123"), {
      params: Promise.resolve({ id: "link-123" }),
    });

    expect(response.status).toBe(200);
    expect(links.findLinkById).toHaveBeenCalledWith("link-123", "user-123");
  });

  it("gets an owned link with api key auth", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(links.findLinkById).mockResolvedValue(buildLink());

    const response = await GET(new Request("http://localhost:3000/api/v1/links/link-123", {
      headers: { authorization: "Bearer lb_secret" },
    }), {
      params: Promise.resolve({ id: "link-123" }),
    });

    expect(response.status).toBe(200);
    expect(mockedAuth).not.toHaveBeenCalled();
  });

  it("returns 404 when GET link does not exist or is not owned", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(links.findLinkById).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/links/link-404", {
      headers: { authorization: "Bearer lb_secret" },
    }), {
      params: Promise.resolve({ id: "link-404" }),
    });

    expect(response.status).toBe(404);
  });

  it("updates targetUrl only and preserves the slug", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ targetUrl: "https://example.com/updated" }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: " https://example.com/updated " }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
  });

  it("updates via api key auth", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ title: "Updated" }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        headers: { authorization: "Bearer lb_secret" },
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedAuth).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid metadata payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ tags: ["x".repeat(25)] }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 401 for invalid api keys", async () => {
    mockedAuthenticateApiKey.mockResolvedValue(null);
    mockedAuth.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        headers: { authorization: "Bearer invalid" },
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the link does not exist or is not owned by the user", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-404", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: "https://example.com/still-nope" }),
      }),
      { params: Promise.resolve({ id: "link-404" }) },
    );

    expect(response.status).toBe(404);
  });

  it("deletes an owned link with a 204 response and empty body", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.deleteLink).mockResolvedValue(true);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("deletes with api key auth", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(links.deleteLink).mockResolvedValue(true);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "DELETE",
        headers: { authorization: "Bearer lb_secret" },
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(204);
    expect(mockedAuth).not.toHaveBeenCalled();
  });

  it("returns 404 when deleting a non-existent link", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.deleteLink).mockResolvedValue(false);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/link-404", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "link-404" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 401 for unauthenticated delete requests", async () => {
    vi.mocked(mockedAuth).mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 for invalid UUID link ids during delete", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    const prismaValidationError = new Error("invalid input syntax for type uuid");
    prismaValidationError.name = "PrismaClientValidationError";
    vi.mocked(links.deleteLink).mockRejectedValue(prismaValidationError);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/links/not-a-uuid", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );

    expect(response.status).toBe(404);
  });

  it("GET with invalid UUID returns 404", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    const prismaValidationError = new Error("invalid input syntax for type uuid");
    prismaValidationError.name = "PrismaClientValidationError";
    vi.mocked(links.findLinkById).mockRejectedValue(prismaValidationError);

    const response = await GET(new Request("http://localhost:3000/api/v1/links/not-a-uuid"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(response.status).toBe(404);
  });

  it("updates targetUrl and metadata in one request", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(
      buildLink({ targetUrl: "https://new.example.com", title: "New title", description: "New desc" }),
    );

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({
          targetUrl: "https://new.example.com",
          title: "New title",
          description: "New desc",
        }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.targetUrl).toBe("https://new.example.com");
    expect(body.data.title).toBe("New title");
    expect(body.data.description).toBe("New desc");
  });

  it("updates link metadata and returns the updated link", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(
      buildLink({ title: "Updated title", description: "Updated desc", tags: ["updated"] }),
    );

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated title", description: "Updated desc", tags: ["updated"] }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.title).toBe("Updated title");
    expect(body.data.description).toBe("Updated desc");
    expect(body.data.tags).toEqual(["updated"]);
  });

  it("supports partial metadata updates", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ title: "Only title changed" }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ title: "Only title changed" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.title).toBe("Only title changed");
    expect(links.updateLink).toHaveBeenCalledWith("link-123", "user-123", { title: "Only title changed" });
  });

  it("sets expiration on a link", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ expiresAt: new Date(futureDate) }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ expiresAt: futureDate }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.expiresAt).toBe(futureDate);
  });

  it("changes expiration on a link", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    const newFutureDate = new Date(Date.now() + 172_800_000).toISOString();
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ expiresAt: new Date(newFutureDate) }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ expiresAt: newFutureDate }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.expiresAt).toBe(newFutureDate);
  });

  it("clears metadata fields when null is sent", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(
      buildLink({ title: null, description: null, tags: [] }),
    );

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ title: null, description: null, tags: null }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.title).toBeNull();
    expect(body.data.description).toBeNull();
    expect(body.data.tags).toEqual([]);
  });

  it("clears expiration when null is sent", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(links.updateLink).mockResolvedValue(buildLink({ expiresAt: null }));

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ expiresAt: null }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.expiresAt).toBeNull();
  });

  it("returns 400 for malformed targetUrl payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: "not-a-url" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for non-http targetUrl payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: "ftp://files.example.com/doc" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for empty-string targetUrl payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: "" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for null targetUrl payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ targetUrl: null }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for past expiration payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ expiresAt: "2020-01-01T00:00:00.000Z" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 401 for unauthenticated PATCH requests", async () => {
    vi.mocked(mockedAuth).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({ title: "Should fail" }),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for empty patch body with no updatable fields", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/links/link-123", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
  });
});
