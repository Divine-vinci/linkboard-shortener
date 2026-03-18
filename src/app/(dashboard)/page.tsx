import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BoardsOverview } from "@/components/dashboard/boards-overview";
import { EmptyState } from "@/components/dashboard/empty-state";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentLinks } from "@/components/dashboard/recent-links";
import { auth } from "@/lib/auth/config";
import { findBoardsByUserId } from "@/lib/db/boards";
import { findRecentLinksByUserId } from "@/lib/db/links";

export const metadata: Metadata = {
  title: "Dashboard — Linkboard",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const [recentLinks, boards] = await Promise.all([
    findRecentLinksByUserId(userId, 5),
    findBoardsByUserId(userId),
  ]);
  const boardOptions = boards.map((board) => ({ id: board.id, name: board.name }));
  const isEmpty = recentLinks.length === 0 && boards.length === 0;

  return (
    <section className="space-y-6">
      {isEmpty ? (
        <EmptyState boards={boardOptions} />
      ) : (
        <>
          <QuickActions boards={boardOptions} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <RecentLinks links={recentLinks} />
            <BoardsOverview boards={boards} />
          </div>
        </>
      )}
    </section>
  );
}
