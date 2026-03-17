"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "If an account exists for that email, we've sent a password reset link.";

type ApiError<TFields extends string> = {
  error?: {
    code?: string;
    message?: string;
    details?: {
      fields?: Partial<Record<TFields, string>>;
    };
  };
};

function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
    >
      {message}
    </div>
  );
}

export function ResetPasswordPage({ token }: { token?: string }) {
  return token ? <ResetPasswordForm token={token} /> : <ForgotPasswordForm />;
}

function ForgotPasswordForm() {
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmittedMessage(null);
    setFormError(null);

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as ApiError<keyof ForgotPasswordInput> & {
        data?: { message?: string };
      };

      if (!response.ok) {
        const fieldErrors = payload.error?.details?.fields;

        if (fieldErrors?.email) {
          setError("email", { message: fieldErrors.email });
        }

        if (!fieldErrors) {
          setFormError(payload.error?.message ?? "Unable to request a reset right now.");
        }

        return;
      }

      setSubmittedMessage(payload.data?.message ?? FORGOT_PASSWORD_SUCCESS_MESSAGE);
    } catch {
      setFormError("Unable to request a reset right now. Please check your connection and try again.");
    }
  });

  return (
    <section className="space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">
          Password reset
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-zinc-400">
          Enter the email address tied to your Linkboard account and we&apos;ll send a reset link.
        </p>
      </header>

      <div className="space-y-4">
        {submittedMessage ? <SuccessBanner message={submittedMessage} /> : null}

        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
              aria-invalid={errors.email ? "true" : "false"}
              {...register("email")}
            />
            {errors.email ? <p className="text-sm text-rose-400">{errors.email.message}</p> : null}
          </div>

          {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          Remembered your password?{" "}
          <Link className="font-medium text-emerald-300 underline-offset-4 hover:underline" href="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </section>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as ApiError<keyof ResetPasswordInput>;

      if (!response.ok) {
        const fieldErrors = payload.error?.details?.fields;

        if (fieldErrors?.password) {
          setError("password", { message: fieldErrors.password });
        }

        setFormError(
          payload.error?.message ??
            "That password reset link is invalid or has expired. Request a new reset email.",
        );
        return;
      }

      router.push("/login?success=password-reset");
      router.refresh();
    } catch {
      setFormError("Unable to reset your password right now. Please check your connection and try again.");
    }
  });

  return (
    <section className="space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">
          Password reset
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-zinc-400">
          Enter a new password with at least 8 characters to secure your Linkboard account.
        </p>
      </header>

      <div className="space-y-4">
        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <input type="hidden" {...register("token")} />

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password")}
            />
            {errors.password ? <p className="text-sm text-rose-400">{errors.password.message}</p> : null}
          </div>

          {formError ? (
            <div className="space-y-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              <p>{formError}</p>
              <Link className="font-medium text-rose-100 underline-offset-4 hover:underline" href="/reset-password">
                Request a new reset email
              </Link>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Updating password..." : "Update password"}
          </button>
        </form>
      </div>
    </section>
  );
}
