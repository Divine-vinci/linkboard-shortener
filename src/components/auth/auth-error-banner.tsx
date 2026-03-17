const OAUTH_LOGIN_ERROR_MESSAGE =
  "Sign-in did not complete. Please try again or choose another sign-in method.";

const handledAuthErrors = new Set([
  "AccessDenied",
  "OAuthAccountNotLinked",
  "OAuthCallbackError",
  "OAuthSignin",
  "CallbackRouteError",
  "Configuration",
]);

export function getAuthErrorMessage(error?: string) {
  if (!error) {
    return null;
  }

  if (handledAuthErrors.has(error)) {
    return OAUTH_LOGIN_ERROR_MESSAGE;
  }

  return null;
}

export function AuthErrorBanner({ error }: { error?: string }) {
  const message = getAuthErrorMessage(error);

  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
    >
      {message}
    </div>
  );
}
