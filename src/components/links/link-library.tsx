"use client";

import type { Link } from "@prisma/client";

import { useState, type FormEvent } from "react";

function formatExpiration(expiresAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(expiresAt);
}

function LinkMetadataBlock({ link }: { link: Pick<Link, "title" | "description" | "tags"> }) {
  const hasMetadata = Boolean(link.title || link.description || link.tags.length > 0);

  if (!hasMetadata) {
    return <p className="text-sm text-zinc-500">No metadata added yet.</p>;
  }

  return (
    <div className="space-y-3">
      {link.title ? <h3 className="text-base font-semibold text-zinc-100">{link.title}</h3> : null}
      {link.description ? <p className="text-sm text-zinc-300">{link.description}</p> : null}
      {link.tags.length > 0 ? (
        <ul aria-label="Link tags" className="flex flex-wrap gap-2">
          {link.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200"
            >
              #{tag}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LinkExpirationBadge({ expiresAt, currentTimeMs }: { expiresAt: Date | null; currentTimeMs: number }) {
  if (!expiresAt) {
    return null;
  }

  if (expiresAt.getTime() <= currentTimeMs) {
    return (
      <span className="inline-flex rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200">
        Expired
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
      Expires {formatExpiration(expiresAt)}
    </span>
  );
}

type LinkLibraryItem = Pick<
  Link,
  "id" | "slug" | "targetUrl" | "title" | "description" | "tags" | "expiresAt" | "createdAt"
>;

type LinkUpdatePayload = {
  id: string;
  slug: string;
  targetUrl: string;
  title: string | null;
  description: string | null;
  tags: string[];
  expiresAt: string | null;
};

type LinkUpdateResponse = {
  data?: LinkUpdatePayload;
  error?: {
    message?: string;
    details?: {
      fields?: {
        targetUrl?: string;
      };
    };
  };
};

type LinkDeleteResponse = {
  error?: {
    message?: string;
  };
};

type LinkCardProps = {
  currentTimeMs: number;
  link: LinkLibraryItem;
  onLinkDeleted: (linkId: string) => void;
  onLinkUpdated: (link: LinkUpdatePayload) => void;
};

function LinkCard({ link, currentTimeMs, onLinkDeleted, onLinkUpdated }: LinkCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTargetUrl, setDraftTargetUrl] = useState(link.targetUrl);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/links/${link.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ targetUrl: draftTargetUrl }),
      });

      const payload = (await response.json()) as LinkUpdateResponse;

      if (!response.ok) {
        const nextFieldError = payload.error?.details?.fields?.targetUrl;

        if (nextFieldError) {
          setFieldError(nextFieldError);
        } else {
          setFormError(payload.error?.message ?? "Unable to update link right now.");
        }

        return;
      }

      if (!payload.data) {
        setFormError("Unable to update link right now.");
        return;
      }

      onLinkUpdated(payload.data);
      setDraftTargetUrl(payload.data.targetUrl);
      setIsEditing(false);
    } catch {
      setFormError("Unable to update link right now. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setFieldError(null);
    setFormError(null);

    if (!window.confirm(`Delete /${link.slug}? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/v1/links/${link.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const payload = (await response.json()) as LinkDeleteResponse;
        setFormError(payload.error?.message ?? "Unable to delete link right now.");
        return;
      }

      onLinkDeleted(link.id);
    } catch {
      setFormError("Unable to delete link right now. Please check your connection and try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleStartEdit() {
    setIsEditing(true);
    setDraftTargetUrl(link.targetUrl);
    setFieldError(null);
    setFormError(null);
  }

  function handleCancel() {
    setIsEditing(false);
    setDraftTargetUrl(link.targetUrl);
    setFieldError(null);
    setFormError(null);
  }

  return (
    <li className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-emerald-300">/{link.slug}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-200"
                onClick={handleStartEdit}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-full border border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-200 transition hover:border-rose-400 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
          <a
            href={link.targetUrl}
            className="break-all text-sm text-zinc-300 underline underline-offset-4"
          >
            {link.targetUrl}
          </a>
        </div>
        <LinkExpirationBadge expiresAt={link.expiresAt} currentTimeMs={currentTimeMs} />
      </div>

      {isEditing ? (
        <form className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor={`target-url-${link.id}`}>
              Target URL for /{link.slug}
            </label>
            <input
              id={`target-url-${link.id}`}
              type="url"
              value={draftTargetUrl}
              onChange={(event) => setDraftTargetUrl(event.target.value)}
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              aria-invalid={fieldError || formError ? "true" : "false"}
              aria-describedby={fieldError ? `target-url-error-${link.id}` : formError ? `target-url-form-error-${link.id}` : undefined}
            />
            {fieldError ? <p id={`target-url-error-${link.id}`} className="text-sm text-rose-400">{fieldError}</p> : null}
            {formError ? <p id={`target-url-form-error-${link.id}`} className="text-sm text-rose-400">{formError}</p> : null}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancel}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {!isEditing && formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

      <LinkMetadataBlock link={link} />
    </li>
  );
}

type LinkLibraryProps = {
  currentTimeMs: number;
  links: LinkLibraryItem[];
};

export function LinkLibrary({ links: initialLinks, currentTimeMs }: LinkLibraryProps) {
  const [links, setLinks] = useState(initialLinks);

  function handleLinkUpdated(updatedLink: LinkUpdatePayload) {
    setLinks((currentLinks) =>
      currentLinks.map((link) =>
        link.id === updatedLink.id
          ? {
              ...link,
              slug: updatedLink.slug,
              targetUrl: updatedLink.targetUrl,
              title: updatedLink.title,
              description: updatedLink.description,
              tags: updatedLink.tags,
              expiresAt: updatedLink.expiresAt ? new Date(updatedLink.expiresAt) : null,
            }
          : link,
      ),
    );
  }

  function handleLinkDeleted(linkId: string) {
    setLinks((currentLinks) => currentLinks.filter((link) => link.id !== linkId));
  }

  return (
    <section className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Your links</h2>
        <p className="text-sm text-zinc-400">Metadata appears here when you add it while creating or editing a link.</p>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-zinc-500">You haven&apos;t created any links yet.</p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              currentTimeMs={currentTimeMs}
              onLinkDeleted={handleLinkDeleted}
              onLinkUpdated={handleLinkUpdated}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
