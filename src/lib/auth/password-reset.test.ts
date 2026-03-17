// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/tokens", () => ({
  createVerificationToken: vi.fn(),
  deleteVerificationTokenByToken: vi.fn(),
  deleteVerificationTokensByIdentifier: vi.fn(),
  findVerificationTokenByToken: vi.fn(),
}));

const tokens = await import("@/lib/db/tokens");
const passwordReset = await import("@/lib/auth/password-reset");

describe("src/lib/auth/password-reset.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new hashed token after invalidating older tokens", async () => {
    const result = await passwordReset.createPasswordResetToken("user@example.com");

    expect(result.token).toHaveLength(64);
    expect(tokens.deleteVerificationTokensByIdentifier).toHaveBeenCalledWith("user@example.com");
    expect(tokens.createVerificationToken).toHaveBeenCalledWith({
      identifier: "user@example.com",
      token: passwordReset.hashPasswordResetToken(result.token),
      expires: expect.any(Date),
    });
  });

  it("returns the email for a valid non-expired token", async () => {
    vi.mocked(tokens.findVerificationTokenByToken).mockResolvedValue({
      identifier: "user@example.com",
      token: "hashed",
      expires: new Date(Date.now() + 60_000),
    });

    await expect(passwordReset.validatePasswordResetToken("raw-token")).resolves.toBe(
      "user@example.com",
    );
    expect(tokens.findVerificationTokenByToken).toHaveBeenCalledWith(
      passwordReset.hashPasswordResetToken("raw-token"),
    );
  });

  it("deletes expired tokens and returns null", async () => {
    const rawToken = "expired-token";
    const hashedToken = passwordReset.hashPasswordResetToken(rawToken);

    vi.mocked(tokens.findVerificationTokenByToken).mockResolvedValue({
      identifier: "user@example.com",
      token: hashedToken,
      expires: new Date(Date.now() - 60_000),
    });

    await expect(passwordReset.validatePasswordResetToken(rawToken)).resolves.toBeNull();
    expect(tokens.deleteVerificationTokenByToken).toHaveBeenCalledWith(hashedToken);
  });

  it("consumes a token by deleting its hashed value", async () => {
    await passwordReset.consumePasswordResetToken("raw-token");

    expect(tokens.deleteVerificationTokenByToken).toHaveBeenCalledWith(
      passwordReset.hashPasswordResetToken("raw-token"),
    );
  });
});
