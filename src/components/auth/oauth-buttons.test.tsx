import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

const { signIn } = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn,
}));

import { OAuthButtons } from "@/components/auth/oauth-buttons";

describe("src/components/auth/oauth-buttons.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders GitHub and Google OAuth actions", () => {
    render(<OAuthButtons />);

    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("wraps buttons in a group with an accessible label", () => {
    render(<OAuthButtons />);

    expect(screen.getByRole("group", { name: "Sign in with GitHub or Google" })).toBeInTheDocument();
  });

  it("starts GitHub sign-in with the dashboard callback route", () => {
    render(<OAuthButtons />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with GitHub" }));

    expect(signIn).toHaveBeenCalledWith("github", { callbackUrl: "/dashboard" });
  });

  it("starts Google sign-in with the dashboard callback route", () => {
    render(<OAuthButtons />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/dashboard" });
  });

  it("disables all buttons and shows redirecting text after clicking a provider", () => {
    render(<OAuthButtons />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with GitHub" }));

    expect(screen.getByRole("button", { name: "Redirecting\u2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  });

  it("renders only the configured OAuth providers", () => {
    render(<OAuthButtons enabledProviders={["github"]} />);

    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
  });

  it("renders nothing when no OAuth providers are configured", () => {
    const { container } = render(<OAuthButtons enabledProviders={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
