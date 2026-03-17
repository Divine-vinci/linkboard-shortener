import { auth } from "@/lib/auth/config";
import { LogoutButton } from "@/components/auth/logout-button";

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
        <LogoutButton />
      </header>

      {children}
    </main>
  );
}
