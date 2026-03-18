"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashboardNavigationItems, isNavigationItemActive } from "@/components/layout/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-zinc-800 bg-zinc-950/95 px-2 py-2 backdrop-blur md:hidden"
    >
      {dashboardNavigationItems.map((item) => {
        const isActive = isNavigationItemActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40",
              isActive
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
            ].join(" ")}
          >
            <Icon aria-hidden="true" className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
