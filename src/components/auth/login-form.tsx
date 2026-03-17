"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { loginSchema, type LoginInput } from "@/lib/validations/auth";

type LoginApiError = {
  error?: {
    message?: string;
    details?: {
      fields?: Partial<Record<keyof LoginInput, string>>;
      retryAfter?: number;
    };
  };
};

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as LoginApiError;

      if (!response.ok) {
        const fieldErrors = payload.error?.details?.fields;

        if (fieldErrors?.email) {
          setError("email", { message: fieldErrors.email });
        }

        if (fieldErrors?.password) {
          setError("password", { message: fieldErrors.password });
        }

        if (!fieldErrors) {
          setFormError(payload.error?.message ?? INVALID_CREDENTIALS_MESSAGE);
        }

        return;
      }

      const normalizedEmail = loginSchema.parse(values).email;
      const signInResult = await signIn("credentials", {
        email: normalizedEmail,
        password: values.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setFormError(INVALID_CREDENTIALS_MESSAGE);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setFormError("Unable to sign in right now. Please check your connection and try again.");
    }
  });

  return (
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
          aria-invalid={errors.password ? "true" : "false"}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-rose-400">{errors.password.message}</p>
        ) : null}
      </div>

      {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
