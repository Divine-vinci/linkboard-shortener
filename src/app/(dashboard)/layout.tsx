import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { auth } from "@/lib/auth/config";

const navigationItems = [
  { href: "/dashboard/links", label: "Links" },
  { href: "/dashboard/boards", label: "Boards" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">
            Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Authenticated workspace</h1>
          <p className="text-sm text-zinc-400">
            Signed in as <span className="font-medium text-zinc-200">{session?.user?.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <nav aria-label="Dashboard navigation" className="flex items-center gap-3">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>

      {children}
    </main>
  );
}
