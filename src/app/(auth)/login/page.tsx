import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth/config";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

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

      <LoginForm />
    </section>
  );
}
