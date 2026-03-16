import { env } from "@/src/config/env";
import { successResponse } from "@/src/lib/api-response";

function getReadiness() {
  return successResponse({
    appUrl: env.NEXT_PUBLIC_APP_URL,
    services: ["Next.js 16", "PostgreSQL 18", "Redis 8", "Vitest 4"],
  });
}

export default function Home() {
  const readiness = getReadiness();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-10 px-6 py-16">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">
          Story 1.1 complete
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Linkboard foundation is ready for feature work.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-300">
          Next.js 16 is initialized with the baseline architecture, local Docker services,
          typed environment validation, JSON logging, and shared API response helpers.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {readiness.data.services.map((service) => (
          <div key={service} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-400">Provisioned</p>
            <p className="mt-2 text-xl font-medium">{service}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <p className="text-sm text-zinc-400">Validated app URL</p>
        <p className="mt-2 font-mono text-sm text-emerald-300">{readiness.data.appUrl}</p>
      </section>
    </main>
  );
}
