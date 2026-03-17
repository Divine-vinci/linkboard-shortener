// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/users", () => ({
  findUserByEmail: vi.fn(),
}));

vi.mock("@/lib/auth/password-reset", () => ({
  createPasswordResetToken: vi.fn(),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(),
}));

const { __resetRateLimitStore } = await import("@/lib/rate-limit");
const users = await import("@/lib/db/users");
const passwordReset = await import("@/lib/auth/password-reset");
const email = await import("@/lib/email/send");
const { POST, FORGOT_PASSWORD_SUCCESS_MESSAGE } = await import(
  "@/app/api/v1/auth/forgot-password/route"
);

describe("src/app/api/v1/auth/forgot-password/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStore();
  });

  it("returns 200 and sends reset email for existing users", async () => {
    vi.mocked(users.findUserByEmail).mockResolvedValue({
      id: "user_123",
      email: "user@example.com",
      name: null,
      image: null,
      emailVerified: null,
      passwordHash: "hashed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(passwordReset.createPasswordResetToken).mockResolvedValue({
      token: "raw-reset-token",
      expires: new Date(Date.now() + 60_000),
    });
    vi.mocked(email.sendEmail).mockResolvedValue({ skipped: false });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: " User@Example.com " }),
        headers: {
          "x-forwarded-for": "203.0.113.44",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
      },
    });
    expect(users.findUserByEmail).toHaveBeenCalledWith("user@example.com");
    expect(passwordReset.createPasswordResetToken).toHaveBeenCalledWith("user@example.com");
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Reset your Linkboard password",
      }),
    );
  });

  it("returns the same 200 response when the email is not registered", async () => {
    vi.mocked(users.findUserByEmail).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "missing@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        message: FORGOT_PASSWORD_SUCCESS_MESSAGE,
      },
    });
    expect(passwordReset.createPasswordResetToken).not.toHaveBeenCalled();
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it("returns 429 after five requests within the rate limit window", async () => {
    vi.mocked(users.findUserByEmail).mockResolvedValue(null);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await POST(
        new Request("http://localhost:3000/api/v1/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
          headers: {
            "x-real-ip": "198.51.100.12",
          },
        }),
      );

      expect(response.status).toBe(200);
    }

    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
        headers: {
          "x-real-ip": "198.51.100.12",
        },
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many password reset requests",
        details: {
          retryAfter: expect.any(Number),
        },
      },
    });
  });
});
