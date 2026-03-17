import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
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

      <RegisterForm />
    </section>
  );
}
