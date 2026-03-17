import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const { push, replace, refresh, signIn } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace,
    refresh,
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn,
}));

import { LoginForm } from "@/components/auth/login-form";

describe("src/components/auth/login-form.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders inline validation errors for malformed input", async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "bad-email" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows a generic invalid-credentials error when the API rejects the login", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          message: "Invalid email or password",
        },
      }),
    } as Response);

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("redirects to the dashboard after a successful login", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ok: true } }),
    } as Response);
    signIn.mockResolvedValue({ ok: true, error: undefined });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: " User@Example.com " } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "user@example.com",
        password: "password123",
        redirect: false,
      });
    });
    expect(replace).toHaveBeenCalledWith("/dashboard");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a connection fallback on network failure", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("network down"));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Unable to sign in right now. Please check your connection and try again."),
    ).toBeInTheDocument();
  });

  it("shows a submitting state while the login request is in flight", async () => {
    let resolveFetch: ((value: Response) => void) | null = null;

    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("button", { name: "Signing in..." })).toBeDisabled();

    expect(resolveFetch).not.toBeNull();
    resolveFetch!({
      ok: false,
      json: async () => ({
        error: {
          message: "Invalid email or password",
        },
      }),
    } as Response);

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });
});
