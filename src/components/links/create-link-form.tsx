"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  createLinkSchema,
  type CreateLinkInput,
  type CreateLinkSchemaInput,
} from "@/lib/validations/link";

type CreateLinkResponse = {
  data?: {
    id: string;
    slug: string;
    targetUrl: string;
    title: string | null;
    description: string | null;
    tags: string[];
    expiresAt: string | null;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: {
    code?: string;
    message?: string;
    details?: {
      fields?: Partial<Record<keyof CreateLinkInput, string>>;
    };
  };
};

function buildShortUrl(slug: string) {
  if (typeof window === "undefined") {
    return slug;
  }

  return `${window.location.origin}/${slug}`;
}

function normalizeTagsInput(value: string) {
  const normalized = Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  return normalized;
}


export function CreateLinkForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateLinkSchemaInput, unknown, CreateLinkInput>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      targetUrl: "",
      customSlug: "",
      title: "",
      description: "",
      tags: "" as unknown as string[],
      expiresAt: "" as unknown as Date,
    },
  });

  const customSlugValue = (useWatch({ control, name: "customSlug" }) ?? "") as string;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setCopyFeedback(null);

    const tagsInput = Array.isArray(values.tags)
      ? values.tags.join(", ")
      : typeof values.tags === "string"
        ? values.tags
        : "";
    const normalizedTags = normalizeTagsInput(tagsInput);
    const body: Record<string, string | string[]> = { targetUrl: values.targetUrl };

    if (values.customSlug) {
      body.customSlug = values.customSlug;
    }

    if (values.title) {
      body.title = values.title;
    }

    if (values.description) {
      body.description = values.description;
    }

    if (normalizedTags.length > 0) {
      body.tags = normalizedTags;
    }

    if (values.expiresAt) {
      body.expiresAt = values.expiresAt.toISOString();
    }

    try {
      const response = await fetch("/api/v1/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as CreateLinkResponse;

      if (!response.ok) {
        const fieldErrors = payload.error?.details?.fields;

        if (fieldErrors?.targetUrl) {
          setError("targetUrl", { message: fieldErrors.targetUrl });
        }

        if (fieldErrors?.customSlug) {
          setError("customSlug", { message: fieldErrors.customSlug });
        }

        if (fieldErrors?.title) {
          setError("title", { message: fieldErrors.title });
        }

        if (fieldErrors?.description) {
          setError("description", { message: fieldErrors.description });
        }

        if (fieldErrors?.tags) {
          setError("tags", { message: fieldErrors.tags });
        }

        if (fieldErrors?.expiresAt) {
          setError("expiresAt", { message: fieldErrors.expiresAt });
        }

        if (payload.error?.code === "CONFLICT") {
          setError("customSlug", { message: "Custom slug already exists" });
        }

        if (!fieldErrors && payload.error?.code !== "CONFLICT") {
          setFormError(payload.error?.message ?? "Unable to create link right now.");
        }

        return;
      }

      if (!payload.data) {
        setFormError("Unable to create link right now.");
        return;
      }

      setCreatedUrl(buildShortUrl(payload.data.slug));
      reset({ targetUrl: "", customSlug: "", title: "", description: "", tags: [], expiresAt: "" as unknown as Date });
    } catch {
      setFormError("Unable to create link right now. Please check your connection and try again.");
    }
  });

  async function handleCopy() {
    if (!createdUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopyFeedback("Copied!");
    } catch {
      setCopyFeedback("Copy failed — please select and copy manually.");
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-zinc-100">Create a short link</h2>
        <p className="text-sm text-zinc-400">
          Paste a destination URL and optionally add metadata to organize it later.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="targetUrl">
            Target URL
          </label>
          <input
            id="targetUrl"
            type="url"
            autoComplete="url"
            placeholder="https://example.com/article"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            aria-invalid={errors.targetUrl ? "true" : "false"}
            {...register("targetUrl")}
          />
          {errors.targetUrl ? (
            <p className="text-sm text-rose-400">{errors.targetUrl.message}</p>
          ) : (
            <p className="text-xs text-zinc-500">Only http:// and https:// URLs are supported.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="customSlug">
            Custom slug <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            id="customSlug"
            type="text"
            autoComplete="off"
            placeholder="my-custom-slug"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            aria-invalid={errors.customSlug ? "true" : "false"}
            {...register("customSlug")}
          />
          {errors.customSlug ? (
            <p className="text-sm text-rose-400">{errors.customSlug.message}</p>
          ) : customSlugValue ? (
            <p className="text-xs text-zinc-400">
              {buildShortUrl(customSlugValue.toLowerCase().trim())}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Leave empty to auto-generate a short slug.</p>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="title">
              Title <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              id="title"
              type="text"
              autoComplete="off"
              placeholder="Launch checklist"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              aria-invalid={errors.title ? "true" : "false"}
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-sm text-rose-400">{errors.title.message}</p>
            ) : (
              <p className="text-xs text-zinc-500">Optional label to make the link easier to spot in your library.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="tags">
              Tags <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              id="tags"
              type="text"
              autoComplete="off"
              placeholder="docs, launch, internal"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              aria-invalid={errors.tags ? "true" : "false"}
              {...register("tags")}
            />
            {errors.tags ? (
              <p className="text-sm text-rose-400">{errors.tags.message}</p>
            ) : (
              <p className="text-xs text-zinc-500">Separate tags with commas. We&apos;ll trim, lowercase, and deduplicate them.</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="description">
            Description <span className="text-zinc-500">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="Quick context about why you saved this link."
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            aria-invalid={errors.description ? "true" : "false"}
            {...register("description")}
          />
          {errors.description ? (
            <p className="text-sm text-rose-400">{errors.description.message}</p>
          ) : (
            <p className="text-xs text-zinc-500">Optional notes for extra context. Leave blank if you just need a short link.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="expiresAt">
            Expiration date <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            id="expiresAt"
            type="datetime-local"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            aria-invalid={errors.expiresAt ? "true" : "false"}
            {...register("expiresAt", {
              setValueAs: (value: string) => (value ? new Date(value).toISOString() : value),
            })}
          />
          {errors.expiresAt ? (
            <p className="text-sm text-rose-400">{errors.expiresAt.message}</p>
          ) : (
            <p className="text-xs text-zinc-500">Leave empty if this link should never expire.</p>
          )}
        </div>

        {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Creating..." : "Create link"}
        </button>
      </form>

      {createdUrl ? (
        <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-200">Your short link is ready</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={createdUrl}
              className="break-all text-sm text-emerald-100 underline underline-offset-4"
            >
              {createdUrl}
            </a>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-2xl border border-emerald-400/40 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              Copy link
            </button>
          </div>
          {copyFeedback ? <p className="text-sm text-emerald-200">{copyFeedback}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
