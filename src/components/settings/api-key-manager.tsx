"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { createApiKeySchema, type CreateApiKeyInput } from "@/lib/validations/api-key";

type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type CreateApiKeyResponse = ApiKeyRecord & { rawKey: string };

type ApiKeyPayload = {
  data?: ApiKeyRecord[] | CreateApiKeyResponse;
  error?: {
    message?: string;
    details?: {
      fields?: Partial<Record<keyof CreateApiKeyInput, string>>;
    };
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateApiKeyInput>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadApiKeys() {
      try {
        setIsLoading(true);
        setFormError(null);

        const response = await fetch("/api/v1/user/api-keys", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        const payload = (await response.json()) as ApiKeyPayload;

        if (!response.ok || !Array.isArray(payload.data)) {
          if (!cancelled) {
            setFormError(payload.error?.message ?? "Unable to load your API keys right now.");
          }
          return;
        }

        if (!cancelled) {
          setApiKeys(payload.data);
        }
      } catch {
        if (!cancelled) {
          setFormError("Unable to load your API keys right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadApiKeys();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccessMessage(null);
    setGeneratedKey(null);

    try {
      const response = await fetch("/api/v1/user/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as ApiKeyPayload;

      if (!response.ok || !payload.data || Array.isArray(payload.data)) {
        const fieldErrors = payload.error?.details?.fields;

        if (fieldErrors?.name) {
          setError("name", { message: fieldErrors.name });
        }

        if (!fieldErrors) {
          setFormError(payload.error?.message ?? "Unable to generate an API key right now.");
        }

        return;
      }

      const created = payload.data;
      setApiKeys((current) => [
        {
          id: created.id,
          name: created.name,
          keyPrefix: created.keyPrefix,
          createdAt: created.createdAt,
          lastUsedAt: created.lastUsedAt ?? null,
        },
        ...current,
      ]);
      setGeneratedKey(created.rawKey);
      setSuccessMessage("API key generated successfully.");
      reset({ name: "" });
    } catch {
      setFormError("Unable to generate an API key right now. Please check your connection and try again.");
    }
  });

  async function copyGeneratedKey() {
    if (!generatedKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedKey);
      setSuccessMessage("API key copied to clipboard.");
    } catch {
      setFormError("Unable to copy the API key automatically. Copy it manually before leaving this page.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setFormError(null);
    setSuccessMessage(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/v1/user/api-keys/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        let message = "Unable to delete the API key right now.";

        try {
          const payload = (await response.json()) as ApiKeyPayload;
          message = payload.error?.message ?? message;
        } catch {
          // ignore parsing failure
        }

        setFormError(message);
        return;
      }

      setApiKeys((current) => current.filter((apiKey) => apiKey.id !== deleteTarget.id));
      setSuccessMessage("API key deleted successfully.");
      setDeleteTarget(null);
    } catch {
      setFormError("Unable to delete the API key right now. Please check your connection and try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
      {isLoading ? <p className="text-sm text-zinc-400">Loading your API keys...</p> : null}

      {successMessage ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {successMessage}
        </div>
      ) : null}

      {formError ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {formError}
        </div>
      ) : null}

      {generatedKey ? (
        <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-100">Your new API key</p>
            <p className="text-xs text-amber-200">This key will not be shown again. Copy it now and store it somewhere secure.</p>
          </div>
          <code className="block overflow-x-auto rounded-xl bg-zinc-950 px-3 py-3 text-xs text-amber-100">
            {generatedKey}
          </code>
          <button
            type="button"
            onClick={() => void copyGeneratedKey()}
            className="rounded-2xl border border-amber-400/40 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          >
            Copy key
          </button>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="api-key-name">
            Key name
          </label>
          <input
            id="api-key-name"
            type="text"
            placeholder="CI deploy key"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            aria-invalid={errors.name ? "true" : "false"}
            {...register("name")}
          />
          {errors.name ? <p className="text-sm text-rose-400">{errors.name.message}</p> : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Generating..." : "Generate Key"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Existing keys</h3>
          <span className="text-xs text-zinc-500">{apiKeys.length} total</span>
        </div>

        {apiKeys.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Key Prefix</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last Used</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950/60 text-zinc-100">
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td className="px-4 py-3">{apiKey.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-300">{apiKey.keyPrefix}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(apiKey.createdAt)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(apiKey.lastUsedAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(apiKey)}
                        className="rounded-2xl border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:border-rose-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-sm text-zinc-400">
            No API keys generated yet.
          </p>
        )}
      </div>

      {deleteTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-api-key-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4"
          onKeyDown={(e) => {
            if (e.key === "Escape") setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="space-y-3">
              <h4 id="delete-api-key-title" className="text-lg font-semibold text-zinc-100">Delete API key?</h4>
              <p className="text-sm text-zinc-400">
                Delete <span className="font-medium text-zinc-200">{deleteTarget.name}</span>. Requests using this key will fail immediately.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? "Deleting..." : "Delete key"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
