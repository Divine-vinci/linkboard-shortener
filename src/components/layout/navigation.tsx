import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Kanban,
  LayoutDashboard,
  Link as LinkIcon,
  Settings,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const dashboardNavigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/links",
    label: "Links",
    icon: LinkIcon,
  },
  {
    href: "/dashboard/boards",
    label: "Boards",
    icon: Kanban,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
