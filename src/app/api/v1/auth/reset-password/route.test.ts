// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock("@/lib/auth/password-reset", () => ({
  consumePasswordResetToken: vi.fn(),
  validatePasswordResetToken: vi.fn(),
}));

vi.mock("@/lib/db/users", () => ({
  deleteSessionsByUserId: vi.fn(),
  findUserByEmail: vi.fn(),
  updateUser: vi.fn(),
}));

const bcrypt = (await import("bcrypt")).default as unknown as { hash: ReturnType<typeof vi.fn> };
const passwordReset = await import("@/lib/auth/password-reset");
const users = await import("@/lib/db/users");
const { POST } = await import("@/app/api/v1/auth/reset-password/route");

describe("src/app/api/v1/auth/reset-password/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the password, invalidates sessions, and consumes the token", async () => {
    vi.mocked(passwordReset.validatePasswordResetToken).mockResolvedValue("user@example.com");
    vi.mocked(users.findUserByEmail).mockResolvedValue({
      id: "user_123",
      email: "user@example.com",
      name: null,
      image: null,
      emailVerified: null,
      passwordHash: "old-hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(bcrypt.hash).mockResolvedValue("new-hash");

    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: "valid-token",
          password: "new-password-123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        message: "Your password has been reset successfully.",
      },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith("new-password-123", 12);
    expect(users.updateUser).toHaveBeenCalledWith("user_123", { passwordHash: "new-hash" });
    expect(users.deleteSessionsByUserId).toHaveBeenCalledWith("user_123");
    expect(passwordReset.consumePasswordResetToken).toHaveBeenCalledWith("valid-token");
  });

  it("rejects invalid or expired tokens", async () => {
    vi.mocked(passwordReset.validatePasswordResetToken).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: "expired-token",
          password: "new-password-123",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_TOKEN",
        message: "That password reset link is invalid or has expired. Request a new reset email.",
      },
    });
    expect(users.updateUser).not.toHaveBeenCalled();
    expect(users.deleteSessionsByUserId).not.toHaveBeenCalled();
  });

  it("returns validation errors for short passwords", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: "valid-token",
          password: "short",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid reset password input",
        details: {
          fields: {
            password: "Password must be at least 8 characters",
          },
        },
      },
    });
  });
});
