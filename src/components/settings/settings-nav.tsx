import Link from "next/link";

const settingsItems = [
  { href: "/dashboard/settings", label: "Profile" },
  { href: "/dashboard/settings/api-keys", label: "API Keys" },
];

export function SettingsNav({ currentPath }: { currentPath: string }) {
  return (
    <nav aria-label="Settings navigation" className="mt-6 flex flex-wrap gap-3">
      {settingsItems.map((item) => {
        const isActive = currentPath === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40",
              isActive
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-700 text-zinc-300 hover:border-emerald-400/60 hover:text-emerald-300",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
