import Link from "next/link";
import { Kanban, Link as LinkIcon, BarChart3, Globe, Zap, Shield } from "lucide-react";

import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-20 px-6 py-16">
      {/* Nav */}
      <nav className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight text-zinc-100">Linkboard</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-2xl px-4 py-2 text-sm text-zinc-300 transition hover:text-zinc-100"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="space-y-6">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">
          Link management, simplified
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Shorten links. Organize boards. Track clicks.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-400">
          Linkboard gives you branded short links, shareable link collections, and
          real-time analytics — all in one clean dashboard.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-2xl bg-emerald-500 px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-emerald-400"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-zinc-700 px-6 py-3 text-center text-sm text-zinc-300 transition hover:border-emerald-400 hover:text-emerald-300"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={<LinkIcon className="h-5 w-5 text-emerald-400" />}
          title="Short links"
          description="Create concise, branded links with custom slugs. Set expiration dates and track every click."
        />
        <FeatureCard
          icon={<Kanban className="h-5 w-5 text-emerald-400" />}
          title="Link boards"
          description="Group links into boards and share them publicly with a single URL. Perfect for portfolios and resources."
        />
        <FeatureCard
          icon={<BarChart3 className="h-5 w-5 text-emerald-400" />}
          title="Click analytics"
          description="See referrers, countries, and click timelines for every link and board you create."
        />
        <FeatureCard
          icon={<Globe className="h-5 w-5 text-emerald-400" />}
          title="Public boards"
          description="Share curated link collections with a clean, public page — no login required for visitors."
        />
        <FeatureCard
          icon={<Zap className="h-5 w-5 text-emerald-400" />}
          title="REST API"
          description="Manage links and boards programmatically with API keys and full OpenAPI documentation."
        />
        <FeatureCard
          icon={<Shield className="h-5 w-5 text-emerald-400" />}
          title="Secure by default"
          description="Email + password or OAuth sign-in, JWT sessions, and scoped API keys for every account."
        />
      </section>

      {/* CTA */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Ready to organize your links?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
          Sign up in seconds — no credit card, no setup fee. Start creating short links
          and shareable boards right away.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-block rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-400"
        >
          Get started for free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500">
        Linkboard &mdash; built by Divine
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">{icon}</div>
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  );
}
