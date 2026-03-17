// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/db/users", () => ({
  findUserByEmail: vi.fn(),
}));

const { __resetRateLimitStore } = await import("@/lib/rate-limit");
const { POST } = await import("@/app/api/v1/auth/login/route");
const bcrypt = (await import("bcrypt")).default;
const users = await import("@/lib/db/users");

describe("src/app/api/v1/auth/login/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStore();
  });

  it("returns 200 for valid credentials and clears the failed-attempt counter", async () => {
    vi.mocked(users.findUserByEmail)
      .mockResolvedValueOnce({
        id: "user_123",
        email: "user@example.com",
        name: null,
        image: null,
        emailVerified: null,
        passwordHash: "stored-hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: "user_123",
        email: "user@example.com",
        name: null,
        image: null,
        emailVerified: null,
        passwordHash: "stored-hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const failedResponse = await POST(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "wrong-password",
        }),
        headers: {
          "x-forwarded-for": "203.0.113.10",
        },
      }),
    );

    expect(failedResponse.status).toBe(401);

    const successfulResponse = await POST(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: " User@Example.com ",
          password: "correct-password",
        }),
        headers: {
          "x-forwarded-for": "203.0.113.10",
        },
      }),
    );

    expect(successfulResponse.status).toBe(200);
    await expect(successfulResponse.json()).resolves.toEqual({
      data: {
        email: "user@example.com",
        ok: true,
      },
    });
    expect(users.findUserByEmail).toHaveBeenNthCalledWith(1, "user@example.com");
    expect(users.findUserByEmail).toHaveBeenNthCalledWith(2, "user@example.com");
    expect(bcrypt.compare).toHaveBeenNthCalledWith(1, "wrong-password", "stored-hash");
    expect(bcrypt.compare).toHaveBeenNthCalledWith(2, "correct-password", "stored-hash");
  });

  it("returns a generic 401 for invalid credentials", async () => {
    vi.mocked(users.findUserByEmail).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "wrong-password",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      },
    });
  });

  it("returns 400 with field errors when validation fails", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "bad-email",
          password: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid login input",
        details: {
          fields: {
            email: "Enter a valid email address",
            password: "Password is required",
          },
        },
      },
    });
    expect(users.findUserByEmail).not.toHaveBeenCalled();
  });

  it("returns 429 with retry metadata after the tenth failed attempt", async () => {
    vi.mocked(users.findUserByEmail).mockResolvedValue(null);

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await POST(
        new Request("http://localhost:3000/api/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: "user@example.com",
            password: `wrong-${attempt}`,
          }),
          headers: {
            "x-real-ip": "198.51.100.7",
          },
        }),
      );

      expect(response.status).toBe(401);
    }

    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "wrong-11",
        }),
        headers: {
          "x-real-ip": "198.51.100.7",
        },
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many failed login attempts",
        details: {
          retryAfter: expect.any(Number),
        },
      },
    });
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/login", {
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
