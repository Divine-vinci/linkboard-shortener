import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { auth, oauthProviderAvailability } from "@/lib/auth/config";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const enabledProviders = Object.entries(oauthProviderAvailability)
    .filter(([, isEnabled]) => isEnabled)
    .map(([providerId]) => providerId as "github" | "google");

  return (
    <section className="space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">
          Linkboard access
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in to your account</h1>
        <p className="text-sm text-zinc-400">
          Use your email and password to access your boards, links, and analytics.
        </p>
      </header>

      <div className="space-y-4">
        <AuthErrorBanner
          error={resolvedSearchParams?.error}
          success={resolvedSearchParams?.success}
        />
        <OAuthButtons enabledProviders={enabledProviders} />
        {enabledProviders.length > 0 ? (
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
            <span className="h-px flex-1 bg-zinc-800" aria-hidden="true" />
            <span>Or continue with email</span>
            <span className="h-px flex-1 bg-zinc-800" aria-hidden="true" />
          </div>
        ) : null}
        <LoginForm />
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            No account?{" "}
            <Link
              href="/register"
              className="font-medium text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
            >
              Sign up
            </Link>
          </span>
          <Link
            href="/reset-password"
            className="font-medium text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </section>
  );
}
