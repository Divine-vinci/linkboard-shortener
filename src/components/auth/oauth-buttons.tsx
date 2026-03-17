"use client";

import { useState } from "react";

import { signIn } from "next-auth/react";

const providers = [
  {
    id: "github",
    label: "Continue with GitHub",
  },
  {
    id: "google",
    label: "Continue with Google",
  },
] as const;

type OAuthButtonsProps = {
  enabledProviders?: Array<(typeof providers)[number]["id"]>;
};

export function OAuthButtons({ enabledProviders = providers.map((provider) => provider.id) }: OAuthButtonsProps) {
  const [pending, setPending] = useState<string | null>(null);

  const visibleProviders = providers.filter((provider) => enabledProviders.includes(provider.id));

  if (visibleProviders.length === 0) {
    return null;
  }

  async function handleClick(providerId: string) {
    setPending(providerId);

    try {
      await signIn(providerId, { callbackUrl: "/dashboard" });
    } catch {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3" role="group" aria-label="Sign in with GitHub or Google">
      {visibleProviders.map((provider) => (
        <button
          key={provider.id}
          type="button"
          disabled={pending !== null}
          onClick={() => handleClick(provider.id)}
          className="flex w-full items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-emerald-400 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:pointer-events-none disabled:opacity-50"
        >
          {pending === provider.id ? "Redirecting\u2026" : provider.label}
        </button>
      ))}
    </div>
  );
}
