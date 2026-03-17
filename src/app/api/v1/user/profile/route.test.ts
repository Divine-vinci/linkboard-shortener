// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/users", () => ({
  findUserById: vi.fn(),
  updateUser: vi.fn(),
}));

const { GET, PATCH } = await import("@/app/api/v1/user/profile/route");
const authModule = await import("@/lib/auth/config");
const mockedAuth = authModule.auth as ReturnType<typeof vi.fn>;
const users = await import("@/lib/db/users");

describe("src/app/api/v1/user/profile/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated GET requests", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  });

  it("returns the authenticated user's safe profile data", async () => {
    const createdAt = new Date("2026-03-17T12:00:00.000Z");

    mockedAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T12:00:00.000Z",
    });
    vi.mocked(users.findUserById).mockResolvedValue({
      id: "user-123",
      name: "Vinci",
      email: "user@example.com",
      image: "https://example.com/avatar.png",
      passwordHash: "secret-hash",
      emailVerified: null,
      createdAt,
      updatedAt: createdAt,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "user-123",
        name: "Vinci",
        email: "user@example.com",
        image: "https://example.com/avatar.png",
        createdAt: createdAt.toISOString(),
      },
    });
    expect(users.findUserById).toHaveBeenCalledWith("user-123");
  });

  it("returns 401 for unauthenticated PATCH requests", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  });

  it("updates only the authenticated user's name", async () => {
    const createdAt = new Date("2026-03-17T12:00:00.000Z");

    mockedAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T12:00:00.000Z",
    });
    vi.mocked(users.updateUser).mockResolvedValue({
      id: "user-123",
      name: "Updated Name",
      email: "user@example.com",
      image: null,
      passwordHash: "secret-hash",
      emailVerified: null,
      createdAt,
      updatedAt: createdAt,
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "  Updated Name  ", email: "attacker@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "user-123",
        name: "Updated Name",
        email: "user@example.com",
        image: null,
        createdAt: createdAt.toISOString(),
      },
    });
    expect(users.updateUser).toHaveBeenCalledWith("user-123", { name: "Updated Name" });
  });

  it("does not clear the name when PATCH omits it", async () => {
    const createdAt = new Date("2026-03-17T12:00:00.000Z");

    mockedAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T12:00:00.000Z",
    });
    vi.mocked(users.updateUser).mockResolvedValue({
      id: "user-123",
      name: "Existing Name",
      email: "user@example.com",
      image: null,
      passwordHash: "secret-hash",
      emailVerified: null,
      createdAt,
      updatedAt: createdAt,
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/user/profile", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "user-123",
        name: "Existing Name",
        email: "user@example.com",
        image: null,
        createdAt: createdAt.toISOString(),
      },
    });
    expect(users.updateUser).toHaveBeenCalledWith("user-123", {});
  });

  it("returns 400 with field errors for invalid PATCH input", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T12:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "   " }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid profile input",
        details: {
          fields: {
            name: "Name is required",
          },
        },
      },
    });
    expect(users.updateUser).not.toHaveBeenCalled();
  });
});
