import type { Metadata } from "next";

import { CreateLinkForm } from "@/components/links/create-link-form";
import { LinkLibrary } from "@/components/links/link-library";
import { auth } from "@/lib/auth/config";
import { findLinksByUserId } from "@/lib/db/links";
import { getCurrentTimeMs } from "@/lib/time";

export const metadata: Metadata = {
  title: "Links — Linkboard",
};

export default async function LinksPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const links = userId ? await findLinksByUserId(userId) : [];
  const currentTimeMs = getCurrentTimeMs();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Links</h2>
        <p className="text-sm text-zinc-400">
          Create and manage your short links, including optional titles, descriptions, and tags.
        </p>
      </div>

      <CreateLinkForm />
      <LinkLibrary links={links} currentTimeMs={currentTimeMs} />
    </section>
  );
}
