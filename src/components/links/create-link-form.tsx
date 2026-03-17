"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

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

export function CreateLinkForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateLinkSchemaInput, unknown, CreateLinkInput>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      targetUrl: "",
      customSlug: "",
    },
  });

  const customSlugValue = (watch("customSlug") ?? "") as string;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setCopyFeedback(null);

    const body: Record<string, string> = { targetUrl: values.targetUrl };

    if (values.customSlug) {
      body.customSlug = values.customSlug;
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
      reset({ targetUrl: "", customSlug: "" });
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
        <p className="text-sm text-zinc-400">Paste a destination URL and generate a short share link.</p>
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
