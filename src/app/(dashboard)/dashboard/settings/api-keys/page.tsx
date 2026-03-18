import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function ApiKeysSettingsPage() {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Settings</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">API Keys</h2>
        <p className="max-w-2xl text-sm text-zinc-400">
          Manage API keys for programmatic access to Linkboard.
        </p>
      </div>

      <SettingsNav currentPath="/dashboard/settings/api-keys" />

      <div className="mt-8">
        <ApiKeyManager />
      </div>
    </section>
  );
}
