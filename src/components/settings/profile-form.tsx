"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile";

type ProfilePayload = {
  data?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: string;
  };
  error?: {
    code?: string;
    message?: string;
    details?: {
      fields?: Partial<Record<keyof UpdateProfileInput, string>>;
    };
  };
};

export function ProfileForm() {
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setIsLoading(true);
        setFormError(null);

        const response = await fetch("/api/v1/user/profile", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = (await response.json()) as ProfilePayload;

        if (!response.ok || !payload.data) {
          if (!cancelled) {
            setFormError(payload.error?.message ?? "Unable to load your profile right now.");
          }
          return;
        }

        if (!cancelled) {
          reset({ name: payload.data.name ?? "" });
          setEmail(payload.data.email);
          setImage(payload.data.image);
        }
      } catch {
        if (!cancelled) {
          setFormError("Unable to load your profile right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/v1/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as ProfilePayload;

      if (!response.ok) {
        const fieldErrors = payload.error?.details?.fields;

        if (fieldErrors?.name) {
          setError("name", { message: fieldErrors.name });
        }

        if (!fieldErrors) {
          setFormError(payload.error?.message ?? "Unable to update your profile right now.");
        }

        return;
      }

      if (payload.data) {
        reset({ name: payload.data.name ?? "" });
        setEmail(payload.data.email);
        setImage(payload.data.image);
      }

      setSuccessMessage("Profile updated successfully.");
    } catch {
      setFormError("Unable to update your profile right now. Please check your connection and try again.");
    }
  });

  return (
    <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
      {isLoading ? <p className="text-sm text-zinc-400">Loading your profile...</p> : null}

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

      <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="Profile" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
            {(email || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-100">Profile image</p>
          <p className="text-xs text-zinc-400">Image uploads are not included in the MVP yet.</p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            disabled={isLoading}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-70"
            aria-invalid={errors.name ? "true" : "false"}
            {...register("name")}
          />
          {errors.name ? <p className="text-sm text-rose-400">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            disabled
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400 outline-none"
          />
          <p className="text-xs text-zinc-500">Email changes are out of scope for this MVP.</p>
        </div>

        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
