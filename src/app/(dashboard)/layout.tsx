import { BottomNav } from "@/components/layout/bottom-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { auth } from "@/lib/auth/config";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-4 px-4 py-4 md:px-6 md:py-6 lg:px-8">
        <SidebarNav userEmail={session?.user?.email} />

        <div className="flex min-h-full flex-1 flex-col">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 px-4 py-6 pb-24 md:px-6 md:pb-6 lg:px-8">
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </section>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
