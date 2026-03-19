import Link from "next/link";

import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { RegisterForm } from "@/components/auth/register-form";
import { oauthProviderAvailability } from "@/lib/auth/config";

export default function RegisterPage() {
  const enabledProviders = Object.entries(oauthProviderAvailability)
    .filter(([, isEnabled]) => isEnabled)
    .map(([providerId]) => providerId as "github" | "google");

  return (
    <section className="space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">
          Linkboard access
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-zinc-400">
          Register with your email and password to start creating boards and short links.
        </p>
      </header>

      <div className="space-y-4">
        <OAuthButtons enabledProviders={enabledProviders} />
        {enabledProviders.length > 0 ? (
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
            <span className="h-px flex-1 bg-zinc-800" aria-hidden="true" />
            <span>Or continue with email</span>
            <span className="h-px flex-1 bg-zinc-800" aria-hidden="true" />
          </div>
        ) : null}
        <RegisterForm />
        <p className="text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
