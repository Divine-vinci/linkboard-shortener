import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const { push, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

import { ResetPasswordPage } from "@/components/auth/reset-password-page";

describe("src/components/auth/reset-password-page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders the forgot-password form when there is no token", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByRole("heading", { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("shows the generic success message after requesting a reset link", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          message: "If an account exists for that email, we've sent a password reset link.",
        },
      }),
    } as Response);

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(
      await screen.findByText("If an account exists for that email, we've sent a password reset link."),
    ).toBeInTheDocument();
  });

  it("renders the reset-password form when a token is present", () => {
    render(<ResetPasswordPage token="valid-token" />);

    expect(screen.getByRole("heading", { name: /choose a new password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("redirects to login after a successful password reset", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { message: "ok" } }),
    } as Response);

    render(<ResetPasswordPage token="valid-token" />);

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/login?success=password-reset");
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows an invalid token error with a link to request a new reset", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: "INVALID_TOKEN",
          message: "That password reset link is invalid or has expired. Request a new reset email.",
        },
      }),
    } as Response);

    render(<ResetPasswordPage token="expired-token" />);

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(
        "That password reset link is invalid or has expired. Request a new reset email.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /request a new reset email/i }),
    ).toHaveAttribute("href", "/reset-password");
  });
});
