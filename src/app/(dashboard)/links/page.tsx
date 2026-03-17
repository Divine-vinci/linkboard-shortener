import type { Metadata } from "next";

import { CreateLinkForm } from "@/components/links/create-link-form";

export const metadata: Metadata = {
  title: "Links — Linkboard",
};

export default function LinksPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Links</h2>
        <p className="text-sm text-zinc-400">
          Create and manage your short links. Library views arrive in a later story.
        </p>
      </div>

      <CreateLinkForm />
    </section>
  );
}
