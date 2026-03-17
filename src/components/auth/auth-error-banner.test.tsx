import { render, screen } from "@testing-library/react";

import {
  AuthErrorBanner,
  getAuthErrorMessage,
  getAuthSuccessMessage,
} from "@/components/auth/auth-error-banner";

const EXPECTED_MESSAGE =
  "Sign-in did not complete. Please try again or choose another sign-in method.";

describe("src/components/auth/auth-error-banner.tsx", () => {
  it.each(["AccessDenied", "OAuthAccountNotLinked", "OAuthCallbackError", "Configuration"])(
    "returns the generic login error for %s",
    (errorCode) => {
      expect(getAuthErrorMessage(errorCode)).toBe(EXPECTED_MESSAGE);
    },
  );

  it("returns null when there is no error", () => {
    expect(getAuthErrorMessage(undefined)).toBeNull();
  });

  it("returns the password-reset success message for the supported success code", () => {
    expect(getAuthSuccessMessage("password-reset")).toBe(
      "Your password has been reset. Sign in with your new password.",
    );
  });

  it("returns null for unrecognized error codes", () => {
    expect(getAuthErrorMessage("SomethingElse")).toBeNull();
  });

  it("does not render anything when there is no auth error", () => {
    const { container } = render(<AuthErrorBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the generic login error banner for denied provider flows", () => {
    render(<AuthErrorBanner error="AccessDenied" />);

    expect(screen.getByRole("alert")).toHaveTextContent(EXPECTED_MESSAGE);
  });

  it("renders the generic login error banner for OAuth callback errors", () => {
    render(<AuthErrorBanner error="OAuthCallbackError" />);

    expect(screen.getByRole("alert")).toHaveTextContent(EXPECTED_MESSAGE);
  });

  it("renders the generic login error banner for provider startup failures", () => {
    render(<AuthErrorBanner error="OAuthSignin" />);

    expect(screen.getByRole("alert")).toHaveTextContent(EXPECTED_MESSAGE);
  });

  it("suppresses unknown auth errors to avoid leaking provider details", () => {
    const { container } = render(<AuthErrorBanner error="SomethingElse" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a success banner for password reset completion", () => {
    render(<AuthErrorBanner success="password-reset" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your password has been reset. Sign in with your new password.",
    );
  });
});
