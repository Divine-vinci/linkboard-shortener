"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { dashboardNavigationItems, isNavigationItemActive } from "@/components/layout/navigation";

type SidebarNavProps = {
  userEmail?: string | null;
};

function getNavItemClassName(isActive: boolean, collapsed: boolean) {
  return [
    "group relative flex min-h-[44px] items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-medium transition focus-within:border-emerald-400",
    isActive
      ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
      : "border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
    collapsed ? "justify-center" : "justify-start",
  ].join(" ");
}

export function SidebarNav({ userEmail }: SidebarNavProps) {
  const pathname = usePathname();
  const [isTabletExpanded, setIsTabletExpanded] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:rounded-3xl lg:border lg:border-zinc-800 lg:bg-zinc-900/70 lg:p-4">
        <div className="flex h-full flex-col gap-6">
          <div className="space-y-2 px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
              Linkboard
            </p>
            <div>
              <p className="text-lg font-semibold tracking-tight text-zinc-100">Dashboard</p>
              <p className="text-sm text-zinc-400">Move between boards, links, analytics, and settings.</p>
            </div>
          </div>

          <nav aria-label="Dashboard navigation" className="flex flex-1 flex-col gap-2">
            {dashboardNavigationItems.map((item) => {
              const isActive = isNavigationItemActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`${getNavItemClassName(isActive, false)} focus:outline-none focus:ring-2 focus:ring-emerald-400/40`}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Signed in</p>
            <p className="mt-2 break-all text-sm font-medium text-zinc-100">{userEmail ?? "No email available"}</p>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      <aside
        className={`group hidden md:flex lg:hidden ${isTabletExpanded ? "w-64" : "w-16"} flex-col rounded-3xl border border-zinc-800 bg-zinc-900/70 p-3 transition-all duration-200`}
        onMouseEnter={() => setIsTabletExpanded(true)}
        onMouseLeave={() => setIsTabletExpanded(false)}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className={`${isTabletExpanded ? "opacity-100" : "sr-only"} text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400 transition`}>
            Nav
          </span>
          <button
            type="button"
            aria-label={isTabletExpanded ? "Collapse sidebar" : "Expand sidebar"}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-zinc-800 text-zinc-400 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            onClick={() => setIsTabletExpanded((current) => !current)}
          >
            {isTabletExpanded ? <PanelLeftClose aria-hidden="true" className="size-4" /> : <PanelLeftOpen aria-hidden="true" className="size-4" />}
          </button>
        </div>

        <nav aria-label="Dashboard navigation" className="flex flex-1 flex-col gap-2">
          {dashboardNavigationItems.map((item) => {
            const isActive = isNavigationItemActive(pathname, item.href);
            const Icon = item.icon;
            const tooltipId = `tablet-nav-${item.label.toLowerCase()}`;

            return (
              <div key={item.href} className="group/item relative">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-describedby={!isTabletExpanded ? tooltipId : undefined}
                  className={`${getNavItemClassName(isActive, !isTabletExpanded)} focus:outline-none focus:ring-2 focus:ring-emerald-400/40`}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span className={`${isTabletExpanded ? "opacity-100" : "sr-only"} transition`}>{item.label}</span>
                </Link>
                {!isTabletExpanded ? (
                  <span
                    id={tooltipId}
                    role="tooltip"
                    className="pointer-events-none absolute left-full top-1/2 z-10 ml-3 -translate-y-1/2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-100 opacity-0 shadow-lg transition group-hover/item:opacity-100 group-focus-within/item:opacity-100"
                  >
                    {item.label}
                  </span>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className={`${isTabletExpanded ? "opacity-100" : "sr-only"} mt-auto rounded-3xl border border-zinc-800 bg-zinc-950/60 p-3 transition`}>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Signed in</p>
          <p className="mt-2 break-all text-sm font-medium text-zinc-100">{userEmail ?? "No email available"}</p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
