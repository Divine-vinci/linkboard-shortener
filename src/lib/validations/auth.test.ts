import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("src/lib/validations/auth.ts", () => {
  it("normalizes valid registration input", () => {
    const result = registerSchema.parse({
      email: "  USER@Example.COM ",
      password: "password123",
    });

    expect(result).toEqual({
      email: "user@example.com",
      password: "password123",
    });
  });

  it("rejects malformed email input", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toContain("Enter a valid email address");
  });

  it("rejects short passwords", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.password).toContain(
      "Password must be at least 8 characters",
    );
  });

  it("rejects missing fields", () => {
    const result = registerSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toContain("Email is required");
    expect(result.error?.flatten().fieldErrors.password).toContain("Password is required");
  });

  it("rejects passwords longer than 128 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(129),
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.password).toContain(
      "Password must be 128 characters or fewer",
    );
  });

  it("normalizes valid login input", () => {
    const result = loginSchema.parse({
      email: "  USER@Example.COM ",
      password: "password123",
    });

    expect(result).toEqual({
      email: "user@example.com",
      password: "password123",
    });
  });

  it("requires a password for login", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.password).toContain("Password is required");
  });

  it("normalizes valid forgot-password input", () => {
    const result = forgotPasswordSchema.parse({
      email: "  USER@Example.COM ",
    });

    expect(result).toEqual({
      email: "user@example.com",
    });
  });

  it("requires a token and a sufficiently strong reset password", () => {
    const result = resetPasswordSchema.safeParse({
      token: "",
      password: "short",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.token).toContain("Token is required");
    expect(result.error?.flatten().fieldErrors.password).toContain(
      "Password must be at least 8 characters",
    );
  });
});
