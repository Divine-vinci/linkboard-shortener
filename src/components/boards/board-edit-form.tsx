"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BoardVisibility } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  updateBoardSchema,
  type UpdateBoardInput,
  type UpdateBoardSchemaInput,
} from "@/lib/validations/board";

type BoardEditFormProps = {
  board: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    visibility: BoardVisibility;
  };
};

type UpdateBoardResponse = {
  data?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    visibility: BoardVisibility;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: {
    code?: string;
    message?: string;
    details?: {
      fields?: Partial<Record<keyof UpdateBoardInput | "_form", string>>;
    };
  };
};

const visibilityOptions = [
  {
    value: BoardVisibility.Private,
    label: "Private",
    help: "Only you can access this board.",
  },
  {
    value: BoardVisibility.Public,
    label: "Public",
    help: "Anyone with the board URL can view it.",
  },
  {
    value: BoardVisibility.Unlisted,
    label: "Unlisted",
    help: "Shareable by URL, but not meant for discovery.",
  },
] as const;

export function BoardEditForm({ board }: BoardEditFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateBoardSchemaInput, unknown, UpdateBoardInput>({
    resolver: zodResolver(updateBoardSchema),
    defaultValues: {
      name: board.name,
      description: board.description ?? "",
      visibility: board.visibility,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/v1/boards/${board.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...values,
          description: values.description ?? null,
        }),
      });

      const payload = (await response.json()) as UpdateBoardResponse;

      if (!response.ok) {
        const fieldErrors = payload.error?.details?.fields;

        if (fieldErrors?.name) {
          setError("name", { message: fieldErrors.name });
        }

        if (fieldErrors?.description) {
          setError("description", { message: fieldErrors.description });
        }

        if (fieldErrors?.visibility) {
          setError("visibility", { message: fieldErrors.visibility });
        }

        setFormError(fieldErrors?._form ?? payload.error?.message ?? "Unable to update board right now.");
        return;
      }

      if (!payload.data) {
        setFormError("Unable to update board right now.");
        return;
      }

      setSuccessMessage("Board updated successfully.");
      router.push(`/dashboard/boards/${payload.data.id}?updated=1`);
      router.refresh();
    } catch {
      setFormError("Unable to update board right now. Please check your connection and try again.");
    }
  });

  return (
    <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-zinc-100">Edit board</h2>
        <p className="text-sm text-zinc-400">
          Update your board details without changing its shareable slug.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="name">
            Board name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="off"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            aria-invalid={errors.name ? "true" : "false"}
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-rose-400">{errors.name.message}</p>
          ) : (
            <p className="text-xs text-zinc-500">Required. Slug stays fixed after save.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="description">
            Description <span className="text-zinc-500">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            aria-invalid={errors.description ? "true" : "false"}
            {...register("description")}
          />
          {errors.description ? (
            <p className="text-sm text-rose-400">{errors.description.message}</p>
          ) : (
            <p className="text-xs text-zinc-500">Clear this field to remove the current description.</p>
          )}
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-zinc-200">Visibility</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {visibilityOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-200 transition hover:border-emerald-400/60"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    value={option.value}
                    className="h-4 w-4 accent-emerald-400"
                    {...register("visibility")}
                  />
                  <span className="font-medium text-zinc-100">{option.label}</span>
                </span>
                <span className="text-xs text-zinc-500">{option.help}</span>
              </label>
            ))}
          </div>
          {errors.visibility ? <p className="text-sm text-rose-400">{errors.visibility.message}</p> : null}
        </fieldset>

        {formError ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
