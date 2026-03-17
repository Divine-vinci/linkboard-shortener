// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock("@/lib/db/users", () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
}));

const { POST } = await import("@/app/api/v1/auth/register/route");
const bcrypt = (await import("bcrypt")).default;
const users = await import("@/lib/db/users");

describe("src/app/api/v1/auth/register/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user with a bcrypt hash and returns 201", async () => {
    vi.mocked(users.findUserByEmail).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password");
    vi.mocked(users.createUser).mockResolvedValue({
      id: "user_123",
      email: "user@example.com",
      name: null,
      image: null,
      emailVerified: null,
      passwordHash: "hashed-password",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: " User@Example.com ",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "user_123",
        email: "user@example.com",
      },
    });
    expect(users.findUserByEmail).toHaveBeenCalledWith("user@example.com");
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
    expect(users.createUser).toHaveBeenCalledWith({
      email: "user@example.com",
      passwordHash: "hashed-password",
    });
  });

  it("returns 409 when email already exists", async () => {
    vi.mocked(users.findUserByEmail).mockResolvedValue({
      id: "user_123",
      email: "user@example.com",
      name: null,
      image: null,
      emailVerified: null,
      passwordHash: "hashed-password",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "CONFLICT",
        message: "Email is already registered",
      },
    });
    expect(users.createUser).not.toHaveBeenCalled();
  });

  it("returns 400 with field errors when validation fails", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "bad-email",
          password: "short",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid registration input",
        details: {
          fields: {
            email: "Enter a valid email address",
            password: "Password must be at least 8 characters",
          },
        },
      },
    });
    expect(users.findUserByEmail).not.toHaveBeenCalled();
    expect(users.createUser).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Request body must be valid JSON",
      },
    });
  });
});
