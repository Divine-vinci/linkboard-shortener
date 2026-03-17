import { ProfileForm } from "@/components/settings/profile-form";

export default function SettingsPage() {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Settings</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Profile settings</h2>
        <p className="max-w-2xl text-sm text-zinc-400">
          Review your account details and keep your public profile information up to date.
        </p>
      </div>

      <div className="mt-8">
        <ProfileForm />
      </div>
    </section>
  );
}
