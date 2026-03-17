const OAUTH_LOGIN_ERROR_MESSAGE =
  "Sign-in did not complete. Please try again or choose another sign-in method.";

const PASSWORD_RESET_SUCCESS_MESSAGE = "Your password has been reset. Sign in with your new password.";

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

export function getAuthSuccessMessage(success?: string) {
  if (success === "password-reset") {
    return PASSWORD_RESET_SUCCESS_MESSAGE;
  }

  return null;
}

export function AuthErrorBanner({ error, success }: { error?: string; success?: string }) {
  const errorMessage = getAuthErrorMessage(error);
  const successMessage = getAuthSuccessMessage(success);

  if (!errorMessage && !successMessage) {
    return null;
  }

  const isError = Boolean(errorMessage);
  const message = errorMessage ?? successMessage;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          : "rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
      }
    >
      {message}
    </div>
  );
}
